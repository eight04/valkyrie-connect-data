// list characters have no passives
import * as fs from "fs/promises";
import YAML from "yaml";

const allCharacters = YAML.parse(await fs.readFile("characters.yml", "utf8"));
for (const c of allCharacters) {
  let max;
  for (const s of c.status) {
    if (!max || max.atk < s.atk) {
      max = {
        atk: s.atk,
        matk: s.matk,
        sum: s.atk + s.matk
      };
    }
  }
  c.sumAtk = max.sum;
}
allCharacters.sort((a, b) => b.sumAtk - a.sumAtk);
console.log(allCharacters.map(c => `${c.name}\t${c.sumAtk}`).join("\n"))

