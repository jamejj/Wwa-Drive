import fs from "node:fs/promises";

const [slug, south, west, north, east] = process.argv.slice(2);
if (!slug || [south, west, north, east].some((value) => !Number.isFinite(Number(value)))) {
  throw new Error(
    "Użycie: node scripts/fetch-location-data.mjs nazwa south west north east",
  );
}

const bbox = `${south},${west},${north},${east}`;
const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function queryOverpass(query) {
  let lastStatus = "brak odpowiedzi";
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: "POST",
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) return response.json();
    lastStatus = response.status;
    await new Promise((resolve) => setTimeout(resolve, 1800));
  }
  console.warn(`Overpass zwrócił ${lastStatus}; używam głównego API OSM.`);
  return null;
}

const mapQuery = `
  [out:json][timeout:90];
  (
    way["highway"](${bbox});
    way["building"](${bbox});
    node["name"]["shop"](${bbox});
    node["name"]["amenity"](${bbox});
    node["name"]["tourism"](${bbox});
    node["name"]["railway"](${bbox});
    node["name"]["public_transport"](${bbox});
  );
  out tags geom;
`;

const landcoverQuery = `
  [out:json][timeout:90];
  (
    way["landuse"](${bbox});
    way["natural"](${bbox});
    way["leisure"](${bbox});
    way["amenity"="parking"](${bbox});
    way["water"](${bbox});
    way["waterway"="riverbank"](${bbox});
  );
  out tags geom;
`;

function decodeXml(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function attributes(source) {
  return Object.fromEntries(
    [...source.matchAll(/([\w:]+)="([^"]*)"/g)].map((match) => [
      match[1],
      decodeXml(match[2]),
    ]),
  );
}

function tagsFromXml(source = "") {
  return Object.fromEntries(
    [...source.matchAll(/<tag\b([^>]*?)\/>/g)].map((match) => {
      const tag = attributes(match[1]);
      return [tag.k, tag.v];
    }),
  );
}

async function fetchOsmMap() {
  const url =
    "https://api.openstreetmap.org/api/0.6/map?bbox=" +
    `${west},${south},${east},${north}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Główne API OSM zwróciło ${response.status}`);
  const xml = await response.text();
  const nodeMap = new Map();
  const nodes = [];

  for (const match of xml.matchAll(
    /<node\b([^>]*?)(?:\/>|>([\s\S]*?)<\/node>)/g,
  )) {
    const data = attributes(match[1]);
    const node = {
      type: "node",
      id: Number(data.id),
      lat: Number(data.lat),
      lon: Number(data.lon),
      tags: tagsFromXml(match[2]),
    };
    nodeMap.set(node.id, node);
    nodes.push(node);
  }

  const ways = [];
  for (const match of xml.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)) {
    const data = attributes(match[1]);
    const refs = [...match[2].matchAll(/<nd\b([^>]*?)\/>/g)]
      .map((nodeMatch) => Number(attributes(nodeMatch[1]).ref))
      .map((ref) => nodeMap.get(ref))
      .filter(Boolean);
    ways.push({
      type: "way",
      id: Number(data.id),
      tags: tagsFromXml(match[2]),
      geometry: refs.map(({ lat, lon }) => ({ lat, lon })),
    });
  }
  return { nodes, ways };
}

let mapSource = await queryOverpass(mapQuery);
let landcoverSource;
if (mapSource) {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  landcoverSource = await queryOverpass(landcoverQuery);
}
if (!mapSource || !landcoverSource) {
  const osm = await fetchOsmMap();
  const poiNodes = osm.nodes.filter((element) => {
    const tags = element.tags ?? {};
    return tags.name && (tags.shop || tags.amenity || tags.tourism || tags.railway || tags.public_transport);
  });
  mapSource = {
    elements: [
      ...osm.ways.filter((element) => element.tags.highway || element.tags.building),
      ...poiNodes,
    ],
  };
  landcoverSource = {
    elements: osm.ways.filter((element) => {
      const tags = element.tags ?? {};
      return tags.landuse || tags.natural || tags.leisure || tags.water || tags.waterway || tags.amenity === "parking";
    }),
  };
}

const mapTags = new Set([
  "access",
  "amenity",
  "area",
  "building",
  "building:colour",
  "building:levels",
  "height",
  "highway",
  "lanes",
  "name",
  "public_transport",
  "railway",
  "service",
  "shop",
  "surface",
  "tourism",
  "width",
]);
const landcoverTags = new Set([
  "amenity",
  "landuse",
  "leisure",
  "natural",
  "water",
  "waterway",
]);

function pickTags(tags, allowed) {
  return Object.fromEntries(
    Object.entries(tags ?? {}).filter(([key]) => allowed.has(key)),
  );
}

const mapElements = mapSource.elements
  .filter(
    (element) =>
      (element.type === "way" && element.geometry) ||
      (element.type === "node" &&
        Number.isFinite(element.lat) &&
        Number.isFinite(element.lon)),
  )
  .map((element) => ({
    type: element.type,
    id: element.id,
    tags: pickTags(element.tags, mapTags),
    ...(element.geometry
      ? {
          geometry: element.geometry.map(({ lat, lon }) => ({ lat, lon })),
        }
      : { lat: element.lat, lon: element.lon }),
  }));

const landcoverElements = landcoverSource.elements
  .filter((element) => element.type === "way" && element.geometry)
  .map((element) => ({
    id: element.id,
    tags: pickTags(element.tags, landcoverTags),
    geometry: element.geometry.map(({ lat, lon }) => ({ lat, lon })),
  }));

await fs.writeFile(
  new URL(`../public/warsaw-${slug}.json`, import.meta.url),
  JSON.stringify({ elements: mapElements }),
);
await fs.writeFile(
  new URL(`../public/warsaw-${slug}-landcover.json`, import.meta.url),
  JSON.stringify({ elements: landcoverElements }),
);

console.info(
  `${slug}: ${mapElements.length} elementów mapy, ${landcoverElements.length} obszarów.`,
);
