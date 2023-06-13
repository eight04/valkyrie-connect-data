import * as fs from "fs/promises";
import rawFetch from "make-fetch-happen";
import * as cheerio from "cheerio";
import YAML from "yaml";

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
  const result = await parseCharacterMenu(url);
  characters.push(...result);
}
// await fs.writeFile("db.json", JSON.stringify(characters, null, 2));
await fs.writeFile(OUTPUT, YAML.stringify(characters, null, 2));

async function parseCharacterMenu(url) {
  console.log(String(url));
  const r = await fetch(url);
  const text = await r.text();
  const $ = cheerio.load(text);
  const result = [];

  for (const link of $("a[href*=character_detail]")) {
    result.push(await parseCharacter(new URL($(link).prop("href"), url)));
    if (result.length >= PAGE_LIMIT) break;
  }

  return result;
}

async function parseCharacter(url) {
  console.log(String(url));
  const r = await fetch(url);
  const html = await r.text();
  const $ = cheerio.load(html);
  const result = {};

  result.url = String(url);
  result.name = $(".name__text").text();
  result.icons = $("img.detail__img")
    .map((i, el) => $(el).prop("src"))
    .toArray()
    .map(u => String(new URL(u, url)));

  $(".detail__data dt").each((i, el) => parseData(el));

  $("#contents > li:first-child > .detail__skill").each((i, el) => {
    const key = $(el).find(".title_bar--text").text().trim();
    if (key === "主動技能") {
      const src = $(el).find(".attribute-img").prop("src")
      const n = src ? Number(src.match(/attribute_(\d+)/)[1]) : 0;
      result.element = n ? ELEMENTS[n - 1] : "none";
      result.skill = $(el).find("dl").slice(1).map((i, el) => parseSkill(el)).toArray();
    } else if (key == "極限爆發") {
      result.limitBurst = parseSkill($(el).first("dl").get());
    } else if (key === "被動技能") {
      result.passives = $(el).find("dl").map((i, el) => parseSkill(el)).toArray();
    } else if (key === "魂之怒") {
      result.soulBurst = parseSkill($(el).first("dl").get());
    } else {
      throw new Error(`Unknown skill detail: ${key}`);
    }
  });

  // status
  const statusCols = $(".detail__status .detail__status--block > dl");
  const keys = statusCols.eq(0).children().map((i, el) => $(el).text().trim()).toArray().map((key, i) => i > 0 ? translate(key) : key);
  result.status = statusCols.slice(1).map((i, el) => parseStatus(el, keys)).toArray();
  
  // element resist
  const labels = [...html.matchAll(/labels: (\[[^\]]*\])/g)].map(group => JSON.parse(group[1]));
  const data = [...html.matchAll(/data: (\[[^\]]*\])/g)].map(group => {
    if (/,\s*,/.test(group[1])) {
      return [0, 0, 0, 0, 0];
    }
    return JSON.parse(group[1])
  });
  // there might be two resist data if awaken
  result.resists = data.map((row, i) => parseResist(row, labels[i]));

  // awaken passives
  result.awakenPassives = $("#contents > li:nth-child(2) .slider").children().map((i, el) => {
    const skill = {};
    const key = $(el).find(".title_bar--text").text().trim();
    let match;
    if ((match = key.match(/覺醒 等級(\d+)/))) {
      skill.awakenLevel = Number(match[1]);
    } else {
      throw new Error(`Unknown awaken passive title: ${key}`);
    }
    Object.assign(skill, parseSkill($(el).find("dl").get(0)));
    return skill;
  }).toArray();

  return result;

  function parseResist(row, labels) {
    const result = {};
    for (let i = 0; i < row.length; i++) {
      result[translate(labels[i])] = row[i];
    }
    return result;
  }

  function parseData(el) {
    const key = $(el).text().trim();
    if (key === "類型") {
      const typeImageUrl = $(el).next().find("img").prop("src");
      const n = Number(typeImageUrl.match(/type_(\d+)/)[1])
      result.distance = n === 1 ? "melee" :
        n === 2 ? "magic" : "ranged";
    } else {
      result[translate(key)] = $(el).next().text().trim();
    }
  }

  function parseStatus(el, keys) {
    const status = {};
    const type = $(el).children().eq(0).text().trim();
    let match;
    if (type === "初期") {
      status.type = "initial";
    } else if ((match = type.match(/最大(?:※(\d+))?/))) {
      status.type = `max${match[1] ? `-${match[1]}` : ""}`;
    } else {
      throw new Error(`Unknown status type: ${type}`);
    }
    $(el).children().slice(1).each((i, el) => {
      const key = keys[i + 1];
      const value = $(el).text().trim();
      status[key] = Number(value.replace(/,/g, ""));
    });
    return status;
  }

  function parseSkill(dl) {
    const skill = {};
    $(dl).find("dt").each((i, el) => {
      const key = $(el).text().trim();
      let match;
      if (key === "名稱") {
        skill.name = $(el).next().text().trim();
      } else if (key === "效果") {
        skill.effect = cleanWhitespace($(el).next().text().trim())
      } else if ((match = key.match(/技能等級(\d+)/))){
        skill.levels = skill.levels || [];
        skill.levels[match[1] - 1] = cleanWhitespace($(el).next().text().trim())
      } else if (key === "技能等級") {
        skill.level = Number($(el).next().text().trim());
      } else if (key === "必要素材") {
        skill.materials = cleanWhitespace($(el).next().text().trim())
      } else {
        throw new Error(`Unknown skill detail: ${key}`);
      }
    });
    return skill;
  }
}

function cleanWhitespace(text) {
  return text.replace(/\s+/g, m => {
    if (m.includes("\n")) return "\n";
    return " ";
  })
}

function translate(key) {
  if (TRANSLATE_TABLE[key]) {
    return TRANSLATE_TABLE[key];
  }
  throw new Error(`Unknown translate: ${key}`);
}
