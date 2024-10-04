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
  const rx = /[|&]|\S+/g
  let match;
  // start with `or` to build the initial set
  let operator = "or";
  while ((match = rx.exec(text)) !== null) {
    const part = match[0];
    if (part === "|") {
      operator = "or";
      continue;
    }
    if (part === "&") {
      operator = "and";
      continue;
    }
    result.push({ [operator]: true, text: part })
    operator = "and";
  }
  return result;
}

function start() {
  const result = [];
  const searchTerms = parseSearchSkill(filter.searchSkill);
  for (const char of allCharacters) {
    // console.log(char.name);
    const effect = matchCharacter(char, filter, searchTerms);
    if (filter.searchSkill && effect.length || !filter.searchSkill && effect) {
      result.push({
        char, effect
      });
    }
  }
  searchResult = result;
}

function matchCharacter(char, filter, searchTerms) {
  if (filter.distance.length && !filter.distance.includes(char.distance)) return false;

  if (filter.race.length && !filter.race.includes(char.race)) return false;

  const element = char.element || char.awakenSkillElement || char.skillElement;
  if (filter.element.length && !filter.element.includes(element)) return false;

  if (!searchTerms.length) return [];

  const candidate = [];

  if (!filter.skillType.length || filter.skillType.includes("active")) {
    const skill = char.awakenSkill || char.skill;
    const maxSkill = skill[skill.length - 1];
    if (!maxSkill?.effect) {
      console.warn("no skill effect", char.name);
    } else {
      candidate.push(...maxSkill.effect.map(e => ({
        name: maxSkill.name,
        target: e.target,
        effect: e.effect,
        include: false
      })));
    }
  }

  if (!filter.skillType.length || filter.skillType.includes("burst")) {
    const limitBurst = char.awakenLimitBurst || char.limitBurst;
    if (limitBurst) {
      candidate.push(...limitBurst.effect.map(e => ({
        name: limitBurst.name,
        target: e.target,
        effect: e.effect,
        include: false
      })));
    } else {
      console.warn("no limit burst", char.name);
    }
    const soulBurst = char.soulBurst;
    if (soulBurst) {
      candidate.push(...soulBurst.effect.map(e => ({
        name: soulBurst.name,
        target: e.target,
        effect: e.effect,
        include: false
      })));
    }
  }

  if (!filter.skillType.length || filter.skillType.includes("passive")) {
    if (!char.passives) {
      console.warn("no passive", char.name);
    } else {
      for (const p of char.passives) {
        // FIXME: this won't work when lv6 is introduced.
        for (let i = 5; i >= 1; i--) {
          if (p[`lv${i}`]) {
            candidate.push(...p[`lv${i}`].map(e => ({
              name: p.name,
              target: e.target,
              effect: e.effect,
              include: false
            })));
            break;
          }
        }
      }
    }
    const awakenPassives = char.awakenPassives || [];
    const names = new Set();
    for (let i = awakenPassives.length - 1; i >= 0; i--) {
      if (names.has(awakenPassives[i].name)) continue;
      names.add(awakenPassives[i].name);
      candidate.push(...awakenPassives[i].effect.map(e => ({
        name: awakenPassives[i].name,
        target: e.target,
        effect: e.effect,
        include: false
      })));
    }
  }

  for (const term of searchTerms) {
    if (term.and) {
      if (candidate.every(c => !c.include)) continue;
      const matches = candidate.filter(c => c.effect.includes(term.text));
      if (!matches.length) {
        for (const c of candidate) {
          c.include = false;
        }
      } else {
        for (const c of matches) {
          c.include = true;
        }
      }
    } else if (term.or) {
      for (const c of candidate) {
        c.include = c.include || c.effect.includes(term.text);
      }
    } else if (term.not) {
      if (candidate.some(c => c.effect.includes(term.text))) {
        for (const c of candidate) {
          c.include = false;
        }
      }
    }
  }

  return candidate.filter(c => c.include);
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
  <p class="form-help">尋找單詞。使用 | 來表示或，& 來表示且。例如：「對巨人 & 對地面」</p>

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
.form-help {
  grid-column: 2 / -1;
  margin: 0;
  font-size: .8em;
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
