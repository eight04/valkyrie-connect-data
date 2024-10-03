import * as fs from "fs/promises";
import YAML from "yaml";

const allCharacters = YAML.parse(await fs.readFile("characters.yml", "utf8"));
const searchMat = [
  // "退魔符文＜暗＞"
  // "高階繼承符文<木>"
  // "紋章"
];
const searchName = [
  // "賽娜"
];
for (const c of allCharacters) {
  if (!c.awakenPassives) continue;
  if (searchName.length && searchName.every(k => !c.name.includes(k))) continue;
  const map = new Map;
  for (const p of c.awakenPassives) {
    for (const match of p.materials.matchAll(/(.*)×\s*(\d+)/g)) {
      const [, name, count] = match;
      map.set(name.trim(), (map.get(name.trim()) ?? 0) + Number(count));
    }
  }
  if (searchMat.length && [...map.keys()].every(k => searchMat.every(mat => !k.match(mat)))) continue;
  console.log(c.name);
  console.log(map);
}
