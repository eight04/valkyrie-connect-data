<script>
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


let filter = {
  distance: [],
  race: [],
  element: [],
  searchSkill: "",
};

let searchResult = [];

function start() {
  const result = [];
  for (const char of allCharacters) {
    // console.log(char.name);
    const effect = matchCharacter(char, filter);
    if (effect.length) {
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
  if (filter.element.length && !filter.race.includes(char.race)) return false;
  if (!filter.searchSkill) return [];

  const result = [];
  const skill = char.awakenSkill || char.skill;
  const maxSkill = skill[skill.length - 1];

  result.push(...searchEffect(maxSkill.effect, filter.searchSkill, maxSkill.name));
  const limitBurst = char.awakenLimitBurst || char.limitBurst;
  result.push(...searchEffect(limitBurst.effect, filter.searchSkill, limitBurst.name));
  const soulBurst = char.soulBurst;
  if (soulBurst) {
    result.push(...searchEffect(soulBurst.effect, filter.searchSkill, soulBurst.name));
  }
  const passives = char.passive || []; // some chars have no passive
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

  <label class="form-label" for="searchSkill">技能效果</label>
  <input type="text" bind:value={filter.searchSkill} id="searchSkill">

  <button type="submit">搜尋</button>
</form>

<pre>{JSON.stringify(searchResult.map(r => r.effect), null, 2)}</pre>

<footer>
  <a href="https://github.com/eight04/valkyrie-connect-data">eight04/valkyrie-connect-data</a>
</footer>

<style>
:global(body) {
  font-size: 16px;
  font-family: sans-serif;
  margin: 2em;
}
:global(input), :global(button), :global(select) {
  font-size: .95em;
  font-family: inherit;
  padding: .3em .6em;
}
details {
  border: 2px solid silver;
  padding: .6em;
  margin: .2em 0;
}
summary {
  padding: .6em;
  cursor: pointer;
}
footer {
  text-align: right;
  margin: 1.2em;
}
</style>
