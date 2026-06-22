import * as THREE from "three";

function createLabelTexture({ label, subtitle, background, foreground }) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const context = canvas.getContext("2d");

  context.fillStyle = background;
  context.fillRect(8, 8, 240, 144);
  context.strokeStyle = "rgba(255,255,255,.8)";
  context.lineWidth = 5;
  context.strokeRect(12, 12, 232, 136);
  context.fillStyle = foreground;
  context.textAlign = "center";
  context.font = "900 76px Impact, Arial Narrow, sans-serif";
  context.fillText(label, 128, 92);
  context.font = "700 18px Arial, sans-serif";
  context.fillText(subtitle, 128, 127);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function createSign(landmark) {
  const group = new THREE.Group();
  const isMetro = landmark.type === "metro";
  const isDistrict = landmark.type === "district";
  const background = isMetro ? "#e31d2d" : isDistrict ? "#171a1e" : "#225f91";

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, isDistrict ? 4.8 : 3.2, 6),
    new THREE.MeshLambertMaterial({ color: 0x30363a }),
  );
  pole.position.y = isDistrict ? 2.4 : 1.6;
  group.add(pole);

  const material = new THREE.MeshBasicMaterial({
    map: createLabelTexture({
      label: landmark.label,
      subtitle: landmark.subtitle,
      background,
      foreground: "#ffffff",
    }),
    transparent: true,
    side: THREE.DoubleSide,
  });
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(isDistrict ? 4.8 : 2.3, isDistrict ? 3 : 1.45),
    material,
  );
  board.position.y = isDistrict ? 5 : 3.25;
  group.add(board);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(isDistrict ? 1.1 : 0.55, 12),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.025;
  group.add(shadow);
  return group;
}

export function createLocationLandmarks(location, geoToWorld) {
  const group = new THREE.Group();
  group.name = `Landmarki lokacji: ${location.name}`;

  for (const landmark of location.landmarks ?? []) {
    const object = createSign(landmark);
    object.name = `${landmark.label} ${landmark.subtitle}`;
    object.position.copy(
      geoToWorld(landmark.position.lat, landmark.position.lon),
    );
    object.rotation.y = landmark.rotation ?? 0;
    group.add(object);
  }

  return group;
}
