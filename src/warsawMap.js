import * as THREE from "three";

const CENTER = { lat: 52.2331, lon: 21.0065 };
const BOUNDS = {
  south: 52.2288,
  west: 20.9988,
  north: 52.2374,
  east: 21.015,
};
const CACHE_KEY = "wawa-drive-osm-center-v1";

const metersPerLongitude = 111_320 * Math.cos((CENTER.lat * Math.PI) / 180);
const metersPerLatitude = 110_540;

export function geoToWorld(lat, lon) {
  return new THREE.Vector3(
    (lon - CENTER.lon) * metersPerLongitude,
    0,
    -(lat - CENTER.lat) * metersPerLatitude,
  );
}

function roadWidth(tags) {
  if (tags.width) {
    const explicitWidth = Number.parseFloat(tags.width);
    if (Number.isFinite(explicitWidth)) return explicitWidth;
  }

  const widths = {
    motorway: 13,
    trunk: 12,
    primary: 11,
    secondary: 9,
    tertiary: 7.5,
    residential: 6.2,
    living_street: 5,
    service: 4,
    pedestrian: 4,
    footway: 1.8,
    path: 1.4,
  };
  return widths[tags.highway] ?? 4.5;
}

function buildingHeight(tags) {
  const taggedHeight = Number.parseFloat(tags.height);
  if (Number.isFinite(taggedHeight)) return THREE.MathUtils.clamp(taggedHeight, 3, 90);

  const levels = Number.parseFloat(tags["building:levels"]);
  if (Number.isFinite(levels)) return THREE.MathUtils.clamp(levels * 3.1, 3, 90);

  return 8 + Math.random() * 8;
}

async function fetchMapData() {
  const localResponse = await fetch("/warsaw-center.json");
  if (localResponse.ok) {
    return localResponse.json();
  }

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(CACHE_KEY);
    }
  }

  const bbox = `${BOUNDS.south},${BOUNDS.west},${BOUNDS.north},${BOUNDS.east}`;
  const query = `
    [out:json][timeout:30];
    (
      way["highway"](${bbox});
      way["building"](${bbox});
    );
    out tags geom;
  `;

  const response = await fetch("https://overpass.kumi.systems/api/interpreter", {
    method: "POST",
    body: new URLSearchParams({ data: query }),
  });

  if (!response.ok) throw new Error(`OpenStreetMap: ${response.status}`);
  const data = await response.json();

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Mapa nadal działa, nawet jeśli przeglądarka nie pozwoli zachować cache.
  }
  return data;
}

function addRoad(group, way) {
  const points = way.geometry?.map((point) => geoToWorld(point.lat, point.lon));
  if (!points || points.length < 2) return;

  const width = roadWidth(way.tags);
  const isFootway = ["footway", "path", "pedestrian"].includes(way.tags.highway);
  const material = new THREE.MeshStandardMaterial({
    color: isFootway ? 0xa9a398 : 0x303238,
    roughness: 0.96,
  });

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.2) continue;

    const segment = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, length + 0.35),
      material,
    );
    segment.position.set((start.x + end.x) / 2, 0.08, (start.z + end.z) / 2);
    segment.rotation.y = Math.atan2(dx, dz);
    segment.receiveShadow = true;
    group.add(segment);
  }
}

function addBuilding(group, way) {
  if (!way.geometry || way.geometry.length < 4) return;

  const shape = new THREE.Shape();
  way.geometry.forEach((point, index) => {
    const worldPoint = geoToWorld(point.lat, point.lon);
    if (index === 0) shape.moveTo(worldPoint.x, -worldPoint.z);
    else shape.lineTo(worldPoint.x, -worldPoint.z);
  });

  const height = buildingHeight(way.tags);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  const palette = [0xa8947e, 0xb8ad9d, 0x897f78, 0xc1b7a4, 0x8f999d];
  const color = palette[Math.abs(way.id) % palette.length];
  const building = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  building.position.y = 0.08;
  building.castShadow = true;
  building.receiveShadow = true;
  group.add(building);
}

export async function buildWarsawMap() {
  const data = await fetchMapData();
  const group = new THREE.Group();
  group.name = "Warszawa — centrum (OpenStreetMap)";

  const roads = data.elements.filter((element) => element.type === "way" && element.tags?.highway);
  const buildings = data.elements.filter(
    (element) => element.type === "way" && element.tags?.building,
  );

  roads.forEach((way) => addRoad(group, way));
  buildings.forEach((way) => addBuilding(group, way));

  return {
    group,
    statistics: { roads: roads.length, buildings: buildings.length },
  };
}
