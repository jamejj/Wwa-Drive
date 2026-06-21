import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { createSurfaceMaterial } from "../core/createSurfaceMaterial.js";

const TYPES = {
  greenery: new Set([
    "grass",
    "grassland",
    "garden",
    "park",
    "flowerbed",
    "wood",
    "scrub",
  ]),
  paved: new Set(["parking", "commercial", "retail", "industrial", "service"]),
  sport: new Set(["pitch"]),
  water: new Set(["water", "basin"]),
  rail: new Set(["railway"]),
};

function classify(tags) {
  const values = [
    tags.landuse,
    tags.natural,
    tags.leisure,
    tags.amenity,
    tags.water,
  ].filter(Boolean);

  for (const [type, acceptedValues] of Object.entries(TYPES)) {
    if (values.some((value) => acceptedValues.has(value))) return type;
  }
  return null;
}

function createAreaGeometry(element, geoToWorld) {
  if (!element.geometry || element.geometry.length < 4) return null;
  const first = element.geometry[0];
  const last = element.geometry[element.geometry.length - 1];
  if (Math.abs(first.lat - last.lat) > 0.00002 || Math.abs(first.lon - last.lon) > 0.00002) {
    return null;
  }

  const shape = new THREE.Shape();
  element.geometry.forEach((point, index) => {
    const world = geoToWorld(point.lat, point.lon);
    if (index === 0) shape.moveTo(world.x, -world.z);
    else shape.lineTo(world.x, -world.z);
  });
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

export async function createLandcover({ geoToWorld, simpleMaterials }) {
  const response = await fetch("/warsaw-landcover.json");
  if (!response.ok) return new THREE.Group();
  const data = await response.json();

  const buckets = {
    greenery: [],
    paved: [],
    sport: [],
    water: [],
    rail: [],
  };
  for (const element of data.elements) {
    const type = classify(element.tags ?? {});
    if (!type) continue;
    const geometry = createAreaGeometry(element, geoToWorld);
    if (geometry) buckets[type].push(geometry);
  }

  const group = new THREE.Group();
  group.name = "Prawdziwe obszary terenu";
  const materials = {
    greenery: createSurfaceMaterial({
      color: 0x587a50,
      style: "grass",
      simpleMaterials,
    }),
    paved: createSurfaceMaterial({
      color: 0x898984,
      style: "paving",
      simpleMaterials,
    }),
    sport: createSurfaceMaterial({
      color: 0x6d895d,
      style: "sport",
      simpleMaterials,
    }),
    water: createSurfaceMaterial({
      color: 0x4e7f97,
      style: "water",
      simpleMaterials,
    }),
    rail: createSurfaceMaterial({
      color: 0x6b6966,
      style: "rail",
      simpleMaterials,
    }),
  };

  Object.entries(buckets).forEach(([type, geometries], index) => {
    if (geometries.length === 0) return;
    const merged = mergeGeometries(geometries);
    geometries.forEach((geometry) => geometry.dispose());
    const mesh = new THREE.Mesh(merged, materials[type]);
    mesh.name = `Teren: ${type}`;
    mesh.position.y = 0.004 + index * 0.001;
    mesh.receiveShadow = true;
    mesh.renderOrder = -5 + index;
    group.add(mesh);
  });

  return group;
}
