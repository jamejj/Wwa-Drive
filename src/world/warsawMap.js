import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createSpatialIndex } from "./collisions.js";
import { createSurfaceMaterial } from "../core/createSurfaceMaterial.js";
import { createFacadeMaterial } from "./createFacadeMaterial.js";
import { createLandcover } from "./createLandcover.js";
import { createPoiLabels } from "./createPoiLabels.js";
import { createUrbanDetails } from "./createUrbanDetails.js";
import { createWarsawLandmarks } from "./createWarsawLandmarks.js";

let mapCenter = { lat: 52.2331, lon: 21.0065 };
let metersPerLongitude =
  111_320 * Math.cos((mapCenter.lat * Math.PI) / 180);
const metersPerLatitude = 110_540;
const RENDER_CHUNK_SIZE = 120;

const buildingPalette = [
  0xb9b2a6,
  0xd0c4ac,
  0x9ca2a2,
  0x747b80,
  0xa76f58,
  0xc3b7a1,
  0x8f8b84,
];

function createMaterials(simpleMaterials) {
  return {
    vehicleRoad: createSurfaceMaterial({
      color: 0x35383b,
      style: "asphalt",
      simpleMaterials,
      extra: {
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      },
    }),
    roadEdge: createSurfaceMaterial({
      color: 0xbeb8ac,
      style: "paving",
      simpleMaterials,
      extra: {
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      },
    }),
    pedestrianRoad: createSurfaceMaterial({
      color: 0xc5beb0,
      style: "paving",
      simpleMaterials,
      extra: {
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      },
    }),
    serviceRoad: createSurfaceMaterial({
      color: 0x575958,
      style: "asphalt",
      simpleMaterials,
      extra: {
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      },
    }),
    roadMarking: new THREE.MeshBasicMaterial({
      color: 0xf5f1df,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
    buildings: buildingPalette.map((color) =>
      createFacadeMaterial(color, simpleMaterials),
    ),
  };
}

export function geoToWorld(lat, lon) {
  return new THREE.Vector3(
    (lon - mapCenter.lon) * metersPerLongitude,
    0,
    -(lat - mapCenter.lat) * metersPerLatitude,
  );
}

export function configureGeoProjection(center) {
  mapCenter = center;
  metersPerLongitude =
    111_320 * Math.cos((mapCenter.lat * Math.PI) / 180);
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
    service: 3.2,
    pedestrian: 4,
    footway: 1.35,
    cycleway: 1.7,
    steps: 1.5,
    track: 2.4,
    path: 1.4,
  };
  const lanes = Number.parseFloat(tags.lanes);
  if (Number.isFinite(lanes) && lanes > 0 && !tags.width) {
    return THREE.MathUtils.clamp(lanes * 3.15, widths[tags.highway] ?? 4, 18);
  }
  return widths[tags.highway] ?? 4.5;
}

function buildingHeight(way) {
  const taggedHeight = Number.parseFloat(way.tags.height);
  if (Number.isFinite(taggedHeight)) {
    const skylineHeight =
      taggedHeight > 180
        ? taggedHeight * 0.62
        : taggedHeight > 100
          ? taggedHeight * 0.78
          : taggedHeight;
    return THREE.MathUtils.clamp(skylineHeight, 3, 195);
  }

  const levels = Number.parseFloat(way.tags["building:levels"]);
  if (Number.isFinite(levels)) return THREE.MathUtils.clamp(levels * 3.05, 3, 175);

  // Stała wartość zależna od ID zapobiega zmianom wysokości przy każdym odświeżeniu.
  return 8 + (Math.abs(way.id) % 80) / 10;
}

function buildingMaterialIndex(way) {
  const taggedColor = way.tags["building:colour"];
  if (!/^#[\da-f]{6}$/i.test(taggedColor ?? "")) {
    return Math.abs(way.id) % buildingPalette.length;
  }
  const color = Number.parseInt(taggedColor.slice(1), 16);
  const red = (color >> 16) & 255;
  const green = (color >> 8) & 255;
  const blue = color & 255;
  let nearestIndex = 0;
  let nearestDistance = Infinity;
  buildingPalette.forEach((candidate, index) => {
    const distance =
      (((candidate >> 16) & 255) - red) ** 2 +
      (((candidate >> 8) & 255) - green) ** 2 +
      ((candidate & 255) - blue) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

async function fetchMapData(location) {
  const { dataFile, bounds } = location.map;
  const localResponse = await fetch(dataFile);
  if (localResponse.ok) return localResponse.json();

  const cacheKey = `wawa-drive-osm-${location.id}-v2`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      localStorage.removeItem(cacheKey);
    }
  }

  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
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
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch {
    // Brak cache nie blokuje gry.
  }
  return data;
}

function createRoadPlane(width, length, x, y, z, rotationY) {
  const geometry = new THREE.PlaneGeometry(width, length);
  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(rotationY);
  geometry.translate(x, y, z);
  return geometry;
}

function chunkKey(x, z) {
  return `${Math.floor(x / RENDER_CHUNK_SIZE)}:${Math.floor(z / RENDER_CHUNK_SIZE)}`;
}

function getChunk(chunks, x, z) {
  const key = chunkKey(x, z);
  if (!chunks.has(key)) {
    chunks.set(key, {
      edges: [],
      roads: [],
      pedestrian: [],
      service: [],
      markings: [],
      buildings: buildingPalette.map(() => []),
    });
  }
  return chunks.get(key);
}

function addRoad(chunks, detailAnchors, way) {
  if (way.tags.area === "yes" || way.tags.highway === "construction") return [];
  if (["private", "no"].includes(way.tags.access)) return [];
  if (
    ["yes", "building_passage"].includes(way.tags.tunnel) ||
    way.tags.covered === "yes" ||
    Number(way.tags.layer ?? 0) < 0
  ) {
    return [];
  }

  const points = way.geometry?.map((point) => geoToWorld(point.lat, point.lon));
  if (!points || points.length < 2) return [];

  const width = roadWidth(way.tags);
  const isPedestrian = [
    "cycleway",
    "footway",
    "path",
    "pedestrian",
    "steps",
  ].includes(way.tags.highway);
  const isService = ["service", "track"].includes(way.tags.highway);
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
    const centerX = (start.x + end.x) / 2;
    const centerZ = (start.z + end.z) / 2;
    const geometryBuckets = getChunk(chunks, centerX, centerZ);

    if (!isPedestrian && !isService) {
      geometryBuckets.edges.push(
        createRoadPlane(
          width + 2.2,
          length + 1.2,
          centerX,
          0.014,
          centerZ,
          Math.atan2(dx, dz),
        ),
      );
    }

    // Płaskie pasy zamiast nakładających się pudełek usuwają efekt "przebłysków".
    const roadGeometry = createRoadPlane(
      width,
      length + 0.45,
      centerX,
      roadY,
      centerZ,
      Math.atan2(dx, dz),
    );
    geometryBuckets[
      isPedestrian ? "pedestrian" : isService ? "service" : "roads"
    ].push(roadGeometry);

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
        length,
      });

      if (length > 8 && (Math.abs(way.id + index * 17) % 5 === 0)) {
        const normalX = -dz / length;
        const normalZ = dx / length;
        const side = Math.abs(way.id + index) % 2 === 0 ? 1 : -1;
        const offset = width / 2 + 3.1;
        detailAnchors.push(
          new THREE.Vector3(
            centerX + normalX * offset * side,
            0,
            centerZ + normalZ * offset * side,
          ),
        );
      }

      if (hasCenterMarking && length >= 5) {
        const dashLength = 2.7;
        const gapLength = 3.2;
        const step = dashLength + gapLength;
        const dashCount = Math.floor(length / step);
        const directionX = dx / length;
        const directionZ = dz / length;

        for (let dashIndex = 0; dashIndex < dashCount; dashIndex += 1) {
          const distance = -length / 2 + step / 2 + dashIndex * step;
          geometryBuckets.markings.push(
            createRoadPlane(
              0.14,
              dashLength,
              centerX + directionX * distance,
              0.048,
              centerZ + directionZ * distance,
              Math.atan2(dx, dz),
            ),
          );
        }
      }
    }
  }
  return roadSurfaces;
}

function addMergedGeometry(group, geometries, material, renderOrder) {
  if (geometries.length === 0) return;

  const mergedGeometry = mergeGeometries(geometries);
  for (const geometry of geometries) geometry.dispose();

  const mesh = new THREE.Mesh(mergedGeometry, material);
  mesh.receiveShadow = true;
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = true;
  group.add(mesh);
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

function createBuildingGeometry(way) {
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

  geometry.translate(0, 0.06, 0);
  const collider = createBuildingCollider(way);
  return {
    geometry,
    materialIndex: buildingMaterialIndex(way),
    collider,
    centerX: (collider.minX + collider.maxX) / 2,
    centerZ: (collider.minZ + collider.maxZ) / 2,
  };
}

function addRenderChunks(group, chunks, materials) {
  for (const [key, geometries] of chunks) {
    const chunk = new THREE.Group();
    chunk.name = `Sektor ${key}`;

    addMergedGeometry(chunk, geometries.edges, materials.roadEdge, 0);
    addMergedGeometry(chunk, geometries.pedestrian, materials.pedestrianRoad, 1);
    addMergedGeometry(chunk, geometries.service, materials.serviceRoad, 1);
    addMergedGeometry(chunk, geometries.roads, materials.vehicleRoad, 2);
    addMergedGeometry(chunk, geometries.markings, materials.roadMarking, 4);
    geometries.buildings.forEach((buildingGeometries, index) => {
      addMergedGeometry(chunk, buildingGeometries, materials.buildings[index], 5);
    });

    if (chunk.children.length > 0) group.add(chunk);
  }
}

export async function buildWarsawMap(performanceProfile, location) {
  const [data, landcover] = await Promise.all([
    fetchMapData(location),
    createLandcover({
      geoToWorld,
      simpleMaterials: performanceProfile.simpleMaterials,
      dataFile: location.map.landcoverFile,
    }),
  ]);
  const group = new THREE.Group();
  group.name = `Warszawa — ${location.name} (OpenStreetMap)`;
  group.add(landcover);
  const materials = createMaterials(performanceProfile.simpleMaterials);

  const roads = data.elements.filter(
    (element) => element.type === "way" && element.tags?.highway,
  );
  const buildings = data.elements.filter(
    (element) => element.type === "way" && element.tags?.building,
  );

  const renderChunks = new Map();
  const detailAnchors = [];
  const roadSurfaces = roads.flatMap((way) =>
    addRoad(renderChunks, detailAnchors, way),
  );

  const buildingColliders = [];
  for (const way of buildings) {
    const building = createBuildingGeometry(way);
    if (!building) continue;
    const chunk = getChunk(renderChunks, building.centerX, building.centerZ);
    chunk.buildings[building.materialIndex].push(building.geometry);
    buildingColliders.push(building.collider);
  }

  if (location.id === "centrum") {
    const palacePosition = geoToWorld(52.23184, 21.0061);
    const landmarks = createWarsawLandmarks(
      performanceProfile.simpleMaterials,
      palacePosition,
    );
    group.add(landmarks.group);
    buildingColliders.push(...landmarks.colliders);
  }

  const buildingIndex = createSpatialIndex(buildingColliders);
  const freeDetailAnchors = detailAnchors.filter(
    (anchor) => !buildingIndex.queryPoint(anchor.x, anchor.z).some((building) =>
      anchor.x >= building.minX &&
      anchor.x <= building.maxX &&
      anchor.z >= building.minZ &&
      anchor.z <= building.maxZ
    ),
  );
  group.add(
    createUrbanDetails({
      anchors: freeDetailAnchors,
      profile: performanceProfile,
    }),
  );
  group.add(createPoiLabels(data.elements, geoToWorld, performanceProfile));
  addRenderChunks(group, renderChunks, materials);

  return {
    group,
    buildingIndex,
    roadIndex: createSpatialIndex(roadSurfaces),
    trafficSegments: roadSurfaces
      .filter((segment) => segment.length > 12 && segment.halfWidth >= 2.6),
    statistics: {
      roads: roads.length,
      buildings: buildings.length,
      renderChunks: group.children.filter((child) =>
        child.name.startsWith("Sektor "),
      ).length,
      renderObjects: group.children.reduce(
        (total, child) =>
          total + (child.isGroup ? child.children.length : 1),
        0,
      ),
    },
  };
}
