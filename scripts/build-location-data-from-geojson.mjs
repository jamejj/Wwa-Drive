import fs from "node:fs/promises";

const [roadsPath, polygonsPath, poisPath] = process.argv.slice(2);
if (!roadsPath || !polygonsPath || !poisPath) {
  throw new Error(
    "Podaj kolejno pliki GeoJSON dróg, obszarów i punktów nazwanych.",
  );
}

const locations = [
  ["center", 52.2288, 20.9988, 52.2374, 21.015],
  ["bulwary", 52.235, 21.021, 52.244, 21.041],
  ["praga", 52.2505, 21.034, 52.2595, 21.052],
  ["mokotow", 52.203, 20.998, 52.212, 21.019],
];

const [roads, polygons, pois] = await Promise.all(
  [roadsPath, polygonsPath, poisPath].map(async (path) =>
    JSON.parse(await fs.readFile(path, "utf8")),
  ),
);

function parseOtherTags(value = "") {
  return Object.fromEntries(
    [...value.matchAll(/"([^"]+)"=>"([^"]*)"/g)].map((match) => [
      match[1],
      match[2],
    ]),
  );
}

function tags(properties) {
  return Object.fromEntries(
    Object.entries({
      ...parseOtherTags(properties.other_tags),
      ...properties,
    }).filter(
      ([key, value]) =>
        !["osm_id", "osm_way_id", "other_tags", "z_order", "type"].includes(
          key,
        ) &&
        value !== null &&
        value !== "",
    ),
  );
}

function inside([lon, lat], bounds) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lon >= bounds.west &&
    lon <= bounds.east
  );
}

function lineParts(coordinates, bounds) {
  const parts = [];
  let current = [];
  for (const point of coordinates) {
    if (inside(point, bounds)) {
      current.push(point);
    } else if (current.length) {
      if (current.length >= 2) parts.push(current);
      current = [];
    }
  }
  if (current.length >= 2) parts.push(current);
  return parts;
}

function outerRings(geometry) {
  if (geometry.type === "Polygon") return [geometry.coordinates[0]];
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map((polygon) => polygon[0]);
  }
  return [];
}

function ringTouchesBounds(ring, bounds) {
  return ring.some((point) => inside(point, bounds));
}

for (const [slug, south, west, north, east] of locations) {
  const bounds = { south, west, north, east };
  const mapElements = [];
  const landcoverElements = [];

  for (const feature of roads.features) {
    const properties = feature.properties ?? {};
    const featureTags = tags(properties);
    if (!featureTags.highway) continue;
    const coordinates =
      feature.geometry.type === "MultiLineString"
        ? feature.geometry.coordinates
        : [feature.geometry.coordinates];
    let partIndex = 0;
    for (const line of coordinates) {
      for (const part of lineParts(line, bounds)) {
        mapElements.push({
          type: "way",
          id: Number(properties.osm_id) * 100 + partIndex,
          tags: featureTags,
          geometry: part.map(([lon, lat]) => ({ lat, lon })),
        });
        partIndex += 1;
      }
    }
  }

  for (const feature of polygons.features) {
    const properties = feature.properties ?? {};
    const featureTags = tags(properties);
    let ringIndex = 0;
    for (const ring of outerRings(feature.geometry)) {
      if (!ringTouchesBounds(ring, bounds)) continue;
      const element = {
        id: Number(properties.osm_way_id ?? properties.osm_id) * 100 + ringIndex,
        tags: featureTags,
        geometry: ring.map(([lon, lat]) => ({ lat, lon })),
      };
      if (featureTags.building) {
        mapElements.push({ type: "way", ...element });
      }
      if (
        featureTags.landuse ||
        featureTags.leisure ||
        featureTags.natural ||
        featureTags.water ||
        featureTags.waterway ||
        featureTags.amenity === "parking"
      ) {
        landcoverElements.push(element);
      }
      ringIndex += 1;
    }
  }

  for (const feature of pois.features) {
    if (feature.geometry.type !== "Point") continue;
    const point = feature.geometry.coordinates;
    if (!inside(point, bounds)) continue;
    const featureTags = tags(feature.properties ?? {});
    if (!featureTags.name) continue;
    mapElements.push({
      type: "node",
      id: Number(feature.properties.osm_id),
      tags: featureTags,
      lat: point[1],
      lon: point[0],
    });
  }

  const landcoverName =
    slug === "center"
      ? "warsaw-landcover.json"
      : `warsaw-${slug}-landcover.json`;
  await fs.writeFile(
    new URL(`../public/warsaw-${slug}.json`, import.meta.url),
    JSON.stringify({ elements: mapElements }),
  );
  await fs.writeFile(
    new URL(`../public/${landcoverName}`, import.meta.url),
    JSON.stringify({ elements: landcoverElements }),
  );
  console.info(
    `${slug}: ${mapElements.length} elementów, ${landcoverElements.length} obszarów`,
  );
}
