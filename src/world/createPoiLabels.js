import * as THREE from "three";

const ALLOWED_AMENITIES = new Set([
  "cafe",
  "cinema",
  "fast_food",
  "fuel",
  "library",
  "restaurant",
  "school",
  "theatre",
  "university",
]);

function isInterestingPoi(element) {
  const tags = element.tags ?? {};
  return Boolean(
    tags.name &&
      (tags.shop ||
        tags.tourism ||
        tags.railway === "station" ||
        tags.public_transport === "station" ||
        ALLOWED_AMENITIES.has(tags.amenity)),
  );
}

function createTexture(name, category) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(15, 18, 22, .88)";
  context.fillRect(5, 5, 502, 118);
  context.strokeStyle = "#ffd119";
  context.lineWidth = 5;
  context.stroke();
  context.fillStyle = "#ffd119";
  context.font = "800 22px Arial, sans-serif";
  context.fillText(category.toUpperCase(), 28, 38);
  context.fillStyle = "#ffffff";
  context.font = "900 38px Arial Narrow, Arial, sans-serif";
  const label = name.length > 25 ? `${name.slice(0, 24)}…` : name;
  context.fillText(label, 28, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function getPosition(element, geoToWorld) {
  if (element.type === "node") return geoToWorld(element.lat, element.lon);
  if (!element.geometry?.length) return null;
  const center = element.geometry.reduce(
    (result, point) => {
      result.lat += point.lat / element.geometry.length;
      result.lon += point.lon / element.geometry.length;
      return result;
    },
    { lat: 0, lon: 0 },
  );
  return geoToWorld(center.lat, center.lon);
}

function category(tags) {
  if (tags.shop) return "sklep";
  if (tags.amenity === "school" || tags.amenity === "university") return "nauka";
  if (tags.amenity === "restaurant" || tags.amenity === "fast_food") return "jedzenie";
  if (tags.railway || tags.public_transport) return "transport";
  return tags.amenity ?? tags.tourism ?? "miejsce";
}

export function createPoiLabels(elements, geoToWorld, profile) {
  const group = new THREE.Group();
  group.name = "Nazwane miejsca z OpenStreetMap";
  const limit = profile.name === "school" ? 14 : profile.name === "balanced" ? 24 : 36;
  const acceptedPositions = [];

  for (const element of elements.filter(isInterestingPoi)) {
    if (group.children.length >= limit) break;
    const position = getPosition(element, geoToWorld);
    if (!position) continue;
    if (acceptedPositions.some((other) => other.distanceToSquared(position) < 28 ** 2)) {
      continue;
    }
    acceptedPositions.push(position);

    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createTexture(element.tags.name, category(element.tags)),
        transparent: true,
        depthTest: false,
      }),
    );
    sprite.name = element.tags.name;
    sprite.position.copy(position).setY(6.5);
    sprite.scale.set(12, 3, 1);
    sprite.renderOrder = 20;
    group.add(sprite);
  }
  return group;
}
