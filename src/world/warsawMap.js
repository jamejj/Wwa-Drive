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

const vehicleRoadMaterial = new THREE.MeshStandardMaterial({
  color: 0x303238,
  roughness: 0.97,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
});
const roadEdgeMaterial = new THREE.MeshStandardMaterial({
  color: 0xb7b1a7,
  roughness: 1,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const pedestrianRoadMaterial = new THREE.MeshStandardMaterial({
  color: 0xaaa59b,
  roughness: 1,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const roadMarkingMaterial = new THREE.MeshBasicMaterial({
  color: 0xf1eee3,
  transparent: true,
  opacity: 0.82,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  polygonOffsetUnits: -4,
});
const buildingPalette = [0xa8947e, 0xb8ad9d, 0x897f78, 0xc1b7a4, 0x8f999d];
const buildingMaterials = buildingPalette.map((color) => [
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.72),
    roughness: 1,
  }),
  new THREE.MeshStandardMaterial({ color, roughness: 0.88 }),
]);

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

function buildingHeight(way) {
  const taggedHeight = Number.parseFloat(way.tags.height);
  if (Number.isFinite(taggedHeight)) return THREE.MathUtils.clamp(taggedHeight, 3, 90);

  const levels = Number.parseFloat(way.tags["building:levels"]);
  if (Number.isFinite(levels)) return THREE.MathUtils.clamp(levels * 3.1, 3, 90);

  // Stała wartość zależna od ID zapobiega zmianom wysokości przy każdym odświeżeniu.
  return 8 + (Math.abs(way.id) % 80) / 10;
}

async function fetchMapData() {
  const localResponse = await fetch("/warsaw-center.json");
  if (localResponse.ok) return localResponse.json();

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
    // Brak cache nie blokuje gry.
  }
  return data;
}

function addRoad(group, way) {
  if (way.tags.area === "yes" || way.tags.highway === "construction") return [];

  const points = way.geometry?.map((point) => geoToWorld(point.lat, point.lon));
  if (!points || points.length < 2) return [];

  const width = roadWidth(way.tags);
  const isPedestrian = ["footway", "path", "pedestrian", "steps"].includes(
    way.tags.highway,
  );
  const material = isPedestrian ? pedestrianRoadMaterial : vehicleRoadMaterial;
  const roadY = isPedestrian ? 0.018 : 0.032;
  const roadSurfaces = [];
  const hasCenterMarking =
    !isPedestrian &&
    ["motorway", "trunk", "primary", "secondary", "tertiary"].includes(
      way.tags.highway,
    );

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.2) continue;

    if (!isPedestrian) {
      const edgeGeometry = new THREE.PlaneGeometry(width + 2.2, length + 1.2);
      edgeGeometry.rotateX(-Math.PI / 2);
      const edge = new THREE.Mesh(edgeGeometry, roadEdgeMaterial);
      edge.rotation.y = Math.atan2(dx, dz);
      edge.position.set((start.x + end.x) / 2, 0.014, (start.z + end.z) / 2);
      edge.receiveShadow = true;
      edge.renderOrder = 0;
      group.add(edge);
    }

    // Płaskie pasy zamiast nakładających się pudełek usuwają efekt "przebłysków".
    const geometry = new THREE.PlaneGeometry(width, length + 0.45);
    geometry.rotateX(-Math.PI / 2);
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.y = Math.atan2(dx, dz);
    segment.position.set((start.x + end.x) / 2, roadY, (start.z + end.z) / 2);
    segment.receiveShadow = true;
    segment.renderOrder = isPedestrian ? 1 : 2;
    group.add(segment);

    if (!isPedestrian) {
      const halfWidth = width / 2 + 0.6;
      roadSurfaces.push({
        start: { x: start.x, z: start.z },
        end: { x: end.x, z: end.z },
        halfWidth,
        minX: Math.min(start.x, end.x) - halfWidth,
        maxX: Math.max(start.x, end.x) + halfWidth,
        minZ: Math.min(start.z, end.z) - halfWidth,
        maxZ: Math.max(start.z, end.z) + halfWidth,
      });

      if (hasCenterMarking && length >= 5) {
        const dashLength = 2.7;
        const gapLength = 3.2;
        const step = dashLength + gapLength;
        const dashCount = Math.floor(length / step);
        const directionX = dx / length;
        const directionZ = dz / length;

        for (let dashIndex = 0; dashIndex < dashCount; dashIndex += 1) {
          const distance = -length / 2 + step / 2 + dashIndex * step;
          const markingGeometry = new THREE.PlaneGeometry(0.14, dashLength);
          markingGeometry.rotateX(-Math.PI / 2);
          const marking = new THREE.Mesh(markingGeometry, roadMarkingMaterial);
          marking.rotation.y = Math.atan2(dx, dz);
          marking.position.set(
            (start.x + end.x) / 2 + directionX * distance,
            0.048,
            (start.z + end.z) / 2 + directionZ * distance,
          );
          marking.renderOrder = 4;
          group.add(marking);
        }
      }
    }
  }
  return roadSurfaces;
}

function createBuildingCollider(way) {
  const points = way.geometry.map((point) => {
    const worldPoint = geoToWorld(point.lat, point.lon);
    return { x: worldPoint.x, z: worldPoint.z };
  });
  return {
    points,
    minX: Math.min(...points.map((point) => point.x)),
    maxX: Math.max(...points.map((point) => point.x)),
    minZ: Math.min(...points.map((point) => point.z)),
    maxZ: Math.max(...points.map((point) => point.z)),
  };
}

function addBuilding(group, way) {
  if (!way.geometry || way.geometry.length < 4) return null;

  const shape = new THREE.Shape();
  way.geometry.forEach((point, index) => {
    const worldPoint = geoToWorld(point.lat, point.lon);
    if (index === 0) shape.moveTo(worldPoint.x, -worldPoint.z);
    else shape.lineTo(worldPoint.x, -worldPoint.z);
  });

  const height = buildingHeight(way);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: false,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();

  const building = new THREE.Mesh(
    geometry,
    buildingMaterials[Math.abs(way.id) % buildingMaterials.length],
  );
  building.position.y = 0.06;
  building.castShadow = true;
  building.receiveShadow = true;
  building.renderOrder = 5;
  group.add(building);
  return createBuildingCollider(way);
}

export async function buildWarsawMap() {
  const data = await fetchMapData();
  const group = new THREE.Group();
  group.name = "Warszawa — centrum (OpenStreetMap)";

  const roads = data.elements.filter(
    (element) => element.type === "way" && element.tags?.highway,
  );
  const buildings = data.elements.filter(
    (element) => element.type === "way" && element.tags?.building,
  );

  const roadSurfaces = roads.flatMap((way) => addRoad(group, way));
  const buildingColliders = buildings
    .map((way) => addBuilding(group, way))
    .filter(Boolean);

  return {
    group,
    buildingColliders,
    roadSurfaces,
    statistics: { roads: roads.length, buildings: buildings.length },
  };
}
