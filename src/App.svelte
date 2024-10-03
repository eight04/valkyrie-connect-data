<script>
/* eslint-env browser */
import allCharacters from '../characters.yml';

window.allCharacters = allCharacters;

const DISTANCE = {
  melee: "近",
  magic: "中",
  ranged: "遠",
};

const RACE = {
  aesir: "神族",
  human: "人類",
  elf: "精靈",
  dwarf: "矮人",
  therian: "亞人",
  jotun: "巨人",
  beast: "神獸",
  celestial: "幻靈"
};

const ELEMENTS = {
  fire: "火",
  water: "水",
  earth: "木",
  light: "光",
  dark: "暗",
};

const SKILL_TYPE = {
  active: "主動",
  burst: "爆發",
  passive: "被動"
};


let filter = {
  distance: [],
  race: [],
  element: [],
  skillType: [],
  searchSkill: "",
};

let searchResult = null;

function parseSearchSkill(text) {
  const result = [];
  const parts = text.split(/\s+/);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("!")) {
      result.push({ and: true, not: true, text: part.slice(1)});
    } else if (part.startsWith("|")) {
      result.push({ or: true, text: part.slice(1)});
    } else {
      result.push({ and: true, text: part });
    }
  }
  return result;
}

function start() {
  const result = [];
  const searchTerms = parseSearchSkill(filter.searchSkill);
  for (const char of allCharacters) {
    // console.log(char.name);
    const effect = matchCharacter(char, filter);
    if (filter.searchSkill && effect.length || !filter.searchSkill && effect) {
      result.push({
        char, effect
      });
    }
  }
  searchResult = result;
}

function matchCharacter(char, filter) {
  if (filter.distance.length && !filter.distance.includes(char.distance)) return false;

  if (filter.race.length && !filter.race.includes(char.race)) return false;

  const element = char.element || char.awakenSkillElement || char.skillElement;
  if (filter.element.length && !filter.element.includes(element)) return false;

  if (!filter.searchSkill) return [];

  const result = [];
  const skill = char.awakenSkill || char.skill;
  const maxSkill = skill[skill.length - 1];

  if (!filter.skillType.length || filter.skillType.includes("active")) {
    result.push(...searchEffect(maxSkill.effect, filter.searchSkill, maxSkill.name));
  }

  if (!filter.skillType.length || filter.skillType.includes("burst")) {
    const limitBurst = char.awakenLimitBurst || char.limitBurst;
    result.push(...searchEffect(limitBurst.effect, filter.searchSkill, limitBurst.name));
    const soulBurst = char.soulBurst;
    if (soulBurst) {
      result.push(...searchEffect(soulBurst.effect, filter.searchSkill, soulBurst.name));
    }
  }

  if (!filter.skillType.length || filter.skillType.includes("passive")) {
    const passives = char.passives || []; // some chars have no passive
    for (const p of passives) {
      // FIXME: this won't work when lv6 is introduced.
      for (let i = 5; i >= 1; i--) {
        if (p[`lv${i}`]) {
          result.push(...searchEffect(p[`lv${i}`], filter.searchSkill, p.name));
          break;
        }
      }
    }
    const awakenPassives = char.awakenPassives || [];
    const names = new Set();
    for (let i = awakenPassives.length - 1; i >= 0; i--) {
      if (names.has(awakenPassives[i].name)) continue;
      names.add(awakenPassives[i].name);
      result.push(...searchEffect(awakenPassives[i].effect, filter.searchSkill, awakenPassives[i].name));
    }
  }

  return result;
}

function searchEffect(list, search, skillName) {
  if (!list) {
    console.warn("no effect", skillName);
    return [];
  }
  const result = [];
  for (const e of list) {
    if (e.effect.includes(search)) {
      result.push({
        name: skillName,
        effect: e.effect,
        target: e.target
      });
    }
  }
  return result;
}

</script>

<svelte:head>
  <title>Valkyrie Connect Data</title>
</svelte:head>

<h1>神域召喚角色查詢</h1>

<form on:submit|preventDefault={start}>
  <span class="form-label">距離</span>
  <div class="form-group">
    {#each Object.entries(DISTANCE) as [key, value]}
      <label>
        <input type="checkbox" bind:group={filter.distance} value={key}>
        {value}
      </label>
    {/each}
  </div>

  <span class="form-label">種族</span>
  <div class="form-group">
    {#each Object.entries(RACE) as [key, value]}
      <label>
        <input type="checkbox" bind:group={filter.race} value={key}>
        {value}
      </label>
    {/each}
  </div>

  <span class="form-label">屬性</span>
  <div class="form-group">
    {#each Object.entries(ELEMENTS) as [key, value]}
      <label>
        <input type="checkbox" bind:group={filter.element} value={key}>
        {value}
      </label>
    {/each}
  </div>

  <span class="form-label">技能類型</span>
  <div class="form-group">
    {#each Object.entries(SKILL_TYPE) as [key, value]}
      <label>
        <input type="checkbox" bind:group={filter.skillType} value={key}>
        {value}
      </label>
    {/each}
  </div>

  <label class="form-label" for="searchSkill">技能效果</label>
  <input type="text" bind:value={filter.searchSkill} id="searchSkill">

  <div class="actions">
    <button type="submit">搜尋</button>
  </div>
</form>

{#if searchResult && searchResult.length}
  <div class="search-result" class:disable-skill={!searchResult[0].effect.length}>
    {#each searchResult as r}
      <div class="char" style="grid-row-end: span {r.effect.length}">
        <a href={r.char.url} target="_blank" title={r.char.name}>
          <img src="img/{r.char.id}.png" alt={r.char.name} loading="lazy" width="140" height="140">
        </a>
      </div>
      {#each r.effect as e}
        <div class="effect-item">
          <div class="effect-target">{e.target}</div>
          <div class="effect-effect">{e.effect}</div>
        </div>
      {/each}
    {/each}
  </div>
{:else if searchResult}
  <div class="search-result">
    <div class="no-result">沒有符合條件的角色</div>
  </div>
{/if}

<footer>
  <a href="https://github.com/eight04/valkyrie-connect-data">eight04/valkyrie-connect-data</a>
</footer>

<style>
:global(body) {
  font-size: 16px;
  font-family: sans-serif;
  margin: 0 auto;
  max-width: 600px;
}
:global(input), :global(button), :global(select) {
  font-size: .95em;
  font-family: inherit;
  padding: .3em .6em;
}
form {
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: .5em;
  align-items: center;
}
.actions {
  grid-column: 1 / -1;
}
.search-result {
  display: grid;
  grid-template-columns: max-content 1fr;
  align-items: stretch;
  margin: .5em 0;
  gap: 1px;
  background: silver;
}
.search-result > * {
  background: white;
}
.search-result.disable-skill {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  background: none;
}
.search-result a,
img {
  display: block;
}
.char {
  display: flex;
  align-items: center;
}
.effect-target {
  margin: .5em;
  font-weight: bold;
}
.effect-effect {
  margin: .5em;
  white-space: pre-wrap;
}
footer {
  text-align: center;
  margin: 1.2em;
}
</style>
