import * as fs from "fs/promises";
import rawFetch from "make-fetch-happen";
import jsdom from "jsdom";
import YAML from "yaml";
import {htmlToText} from "html-to-text";

const PAGE_LIMIT = 99999;
const OUTPUT = "characters.yml";

const TRANSLATE_TABLE = {
  初期星等: "rarity",
  名稱: "name",
  種族: "race",
  性別: "gender",
  合作活动: "collab",
  屬性: "element",
  HP: "hp",
  物理攻擊: "atk",
  魔法攻擊: "matk",
  物理防禦: "def",
  魔法防禦: "mdef",
  敏捷: "speed",
  閃避: "evade",
  命中: "accuracy",
  火: "fire",
  水: "water",
  木: "earth",
  光: "light",
  暗: "dark",
  神族: "aesir",
  人類: "human",
  精靈: "elf",
  矮人: "dwarf",
  亞人: "therian",
  巨人: "jotun",
  神獸: "beast",
  幻靈: "celestial",
  "♂": "male",
  "♀": "female",
  "???": "unknown",
};

const ELEMENTS = [
  "fire", "water", "earth", "light", "dark"
];

const fetch = (rawFetch.defaults({cachePath: "./fetch_cache"}));

const urls = [
  "http://jam-capture-vcon-ww.ateamid.com/zh_TW/character_list/1.html?filter=#1",
  "http://jam-capture-vcon-ww.ateamid.com/zh_TW/character_list/2.html#2",
  "http://jam-capture-vcon-ww.ateamid.com/zh_TW/character_list/3.html#3"
];

const characters = [];
for (const url of urls) {
  const result = await extractCharacterMenu(url);
  characters.push(...result);
}
// await fs.writeFile("db.json", JSON.stringify(characters, null, 2));
await fs.writeFile(OUTPUT, YAML.stringify(characters, null, 2));

async function extractCharacterMenu(url) {
  console.log((url));
  const r = await fetch(url);
  const text = await r.text();
  const {document} = new jsdom.JSDOM(text, {url}).window;
  const result = [];

  for (const link of document.querySelectorAll("a[href*=character_detail]")) {
    result.push(await extractCharacter(link.href));
    if (result.length >= PAGE_LIMIT) break;
  }

  return result;
}

async function extractCharacter(url) {
  console.log(url);
  const r = await fetch(url);
  const html = await r.text();
  const {document} = new jsdom.JSDOM(html, {url}).window;
  const result = {};

  result.url = (url);
  result.name = document.querySelector(".name__text").textContent;
  result.icons = [...document.querySelectorAll("img.detail__img")].map(i => i.src);

  for (const dt of document.querySelectorAll(".detail__data dt")) {
    const key = dt.textContent;
    if (key === "類型") {
      const typeImageUrl = dt.nextElementSibling.querySelector("img").src;
      const n = Number(typeImageUrl.match(/type_(\d+)/)[1])
      result.distance = n === 1 ? "melee" :
        n === 2 ? "magic" : "ranged";
    } else if (key === "初期星等") {
      result.rarity = Number(dt.nextElementSibling.textContent.match(/(\d+)☆/)[1]);
    } else if (key === "種族" || key === "性別") {
      result[translate(key)] = translate(dt.nextElementSibling.textContent);
    } else {
      result[translate(key)] = (dt.nextElementSibling.textContent);
    }
  }

  for (const el of document.querySelectorAll(".detail__skill")) {
    const title = el.querySelector(".title_bar--text").textContent;
    let match;
    if (title === "主動技能") {
      const {element, skill} = extractDetailSkill(el);
      if (!result.skill) {
        result.skillElement = element;
        result.skill = skill;
      } else {
        result.awakenSkillElement = element;
        result.awakenSkill = skill;
      }
    } else if (title == "極限爆發") {
      if (!result.limitBurst) {
        result.limitBurst = extractDetailSkill(el).skill[0];
      } else {
        result.awakenLimitBurst = extractDetailSkill(el).skill[0];
      }
    } else if (title === "被動技能") {
      result.passives = extractDetailSkill(el).skill;
    } else if (title === "魂之怒") {
      result.soulBurst = extractDetailSkill(el).skill[0];
    } else if ((match = title.match(/覺醒 等級(\d+)/))) {
      result.awakenPassives = result.awakenPassives || [];
      const {skill: [skill]} = extractDetailSkill(el);
      skill.awakenLevel = Number(match[1]);
      result.awakenPassives.push(skill);
    } else {
      throw new Error(`Unknown skill title: ${title}`);
    }
  }

  // status
  const statusCols = [...document.querySelectorAll(".detail__status .detail__status--block > dl")];
  const keys = [...statusCols[0].children].slice(1).map((el) => translate(el.textContent));
  result.status = statusCols.slice(1).map((el) => {
    const status = {};
    const type = el.children[0].textContent;
    let match;
    if (type === "初期") {
      status.type = "initial";
    } else if ((match = type.match(/最大(?:※(\d+))?/))) {
      status.type = `max${match[1] ? `-${match[1]}` : ""}`;
    } else {
      throw new Error(`Unknown status type: ${type}`);
    }
    const values = [...el.children].slice(1).map((el) => Number(el.textContent.replace(/,/g, "")));
    return Object.assign(status, ...keys.map((key, i) => ({[key]: values[i]})));
  });
  
  // element resist
  const labels = [...html.matchAll(/labels: (\[[^\]]*\])/g)].map(group => JSON.parse(group[1]).map(translate));
  const data = [...html.matchAll(/data: (\[[^\]]*\])/g)].map(group => {
    if (/,\s*,/.test(group[1])) {
      return null;
    }
    return JSON.parse(group[1])
  });
  // there might be two resist data if awaken
  result.resistance = (zip(labels[0], data[0]));
  if (data[1]) {
    result.awakenResistance = zip(labels[1], data[1]);
  }

  return result;

  function parseResist(row, labels) {
    const result = {};
    for (let i = 0; i < row.length; i++) {
      result[translate(labels[i])] = row[i];
    }
    return result;
  }
}

function translate(key) {
  if (TRANSLATE_TABLE[key]) {
    return TRANSLATE_TABLE[key];
  }
  throw new Error(`Unknown translate: ${key}`);
}

function innerText(el) {
  return htmlToText(el.innerHTML, {
    selectors: [ { selector: 'img', format: 'skip' } ]
  });
}

function extractSkillEffect(el) {
  const result = [];
  for (const child of el.children) {
    const icon = child.querySelector("img.icon_skill_effect");
    const prop = icon.src.match(/icon_(\w+)\.png/)[1];
    if (prop === "target") {
      result.push({});
    }
    result[result.length - 1][prop] = innerText(child);
  }
  return result;
}

function extractDetailSkill(el) {
  const result = {
    element: "none",
    skill: []
  };
  for (const dt of el.querySelectorAll("dt")) {
    const key = dt.textContent;
    let match;
    if (key === "屬性") {
      const attributeImg = dt.nextElementSibling.querySelector("img")
      const n = attributeImg ? Number(attributeImg.src.match(/attribute_(\d+)/)[1]) : 0;
      result.element = n ? ELEMENTS[n - 1] : "none";
    } else if (key === "名稱") {
      result.skill.push({
        name: innerText(dt.nextElementSibling),
      })
    } else if (key === "效果") {
      result.skill[result.skill.length - 1].effect = extractSkillEffect(dt.nextElementSibling);
    } else if ((match = key.match(/技能等級(\d+)/))) {
      result.skill[result.skill.length - 1][`lv${match[1]}`] = extractSkillEffect(dt.nextElementSibling);
    } else if (key === "技能等級") {
      result.skill[result.skill.length - 1].level = Number(dt.nextElementSibling.textContent);
    } else if (key === "必要素材") {
      result.skill[result.skill.length - 1].materials = innerText(dt.nextElementSibling);
    } else {
      throw new Error(`Unknown skill dt: ${key}`);
    }
  }
  return result;
}

function zip(a, b) {
  return Object.fromEntries(a.map((key, i) => [key, b[i]]));
}
