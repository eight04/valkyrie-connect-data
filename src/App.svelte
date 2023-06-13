<script>
let filter = {
  distance: [],
  race: [],
  element: [],
  searchActive: "",
  searchPassive: ""
}
</script>

<svelte:head>
  <title>Valkyrie Connect Data</title>
</svelte:head>

<h1>神域召喚角色查詢</h1>

<form>
  <span class="form-label">距離</span>
  <div class="form-group">
    <label>
      <input type="checkbox" bind:group={distance} value="melee">
      近
    </label>
    <label>
      <input type="checkbox" bind:group={distance} value="magic">
      中
    </label>
    <label>
      <input type="checkbox" bind:group={distance} value="ranged">
      遠
    </label>
  </div>

  <span class="form-label">種族</span>

  <span class="form-label">屬性</span>

  <label class="form-label">篩選主動技能效果</label>

  <label class="form-label">篩選被動技能效果</label>

  <button type="submit">搜尋</button>
</form>

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
