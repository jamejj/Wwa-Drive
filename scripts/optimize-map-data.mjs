import fs from "node:fs/promises";

const filePath = new URL("../public/warsaw-center.json", import.meta.url);
const source = JSON.parse(await fs.readFile(filePath, "utf8"));
const allowedTags = new Set([
  "area",
  "building",
  "building:levels",
  "height",
  "highway",
  "width",
]);

const elements = source.elements
  .filter((element) => element.type === "way" && element.geometry)
  .map((element) => ({
    type: "way",
    id: element.id,
    tags: Object.fromEntries(
      Object.entries(element.tags ?? {}).filter(([key]) => allowedTags.has(key)),
    ),
    geometry: element.geometry.map(({ lat, lon }) => ({ lat, lon })),
  }));

await fs.writeFile(filePath, JSON.stringify({ elements }));
console.info(`Zapisano ${elements.length} elementów mapy.`);
