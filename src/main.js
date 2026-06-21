import * as THREE from "three";
import "./style.css";
import { buildWarsawMap, geoToWorld } from "./warsawMap.js";

const app = document.querySelector("#app");
const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8bfcb);
scene.fog = new THREE.Fog(0xa8bfcb, 85, 310);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(12, 14, 18);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
app.append(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe3f3ff, 0x586349, 2.2));

const sun = new THREE.DirectionalLight(0xfff0cf, 3);
sun.position.set(-75, 110, 55);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(450, 450),
  new THREE.MeshStandardMaterial({ color: 0x667b5a, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

function meshBox(width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const player = new THREE.Group();
const legs = meshBox(0.65, 0.85, 0.35, 0x242d43);
const torso = meshBox(0.9, 1.05, 0.48, 0xe3a41e);
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.34, 18, 14),
  new THREE.MeshStandardMaterial({ color: 0xd8a078, roughness: 0.9 }),
);
legs.position.y = 0.48;
torso.position.y = 1.4;
head.position.y = 2.15;
head.castShadow = true;
player.add(legs, torso, head);

// Start przy Emilii Plater, na zachód od Pałacu Kultury.
const spawnPoint = geoToWorld(52.23225, 21.00335);
player.position.copy(spawnPoint);
scene.add(player);

const marker = new THREE.Group();
const markerRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.15, 0.09, 10, 40),
  new THREE.MeshBasicMaterial({ color: 0xffd91a }),
);
markerRing.rotation.x = Math.PI / 2;
markerRing.position.y = 0.15;
const markerBeam = new THREE.Mesh(
  new THREE.CylinderGeometry(0.65, 1.25, 6, 24, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0xffd91a,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
markerBeam.position.y = 3;
marker.add(markerRing, markerBeam);

// Cel przy skrzyżowaniu Świętokrzyskiej i Marszałkowskiej.
marker.position.copy(geoToWorld(52.2352, 21.0086));
scene.add(marker);

const keys = {};
let gameStarted = false;
let goalReached = false;
let walkTime = 0;
const timer = new THREE.Timer();
timer.connect(document);
const playerDirection = new THREE.Vector3();
const targetCamera = new THREE.Vector3();

addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "KeyR") {
    player.position.copy(spawnPoint);
    goalReached = false;
    message.classList.remove("visible");
    marker.visible = true;
  }
});
addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

startButton.addEventListener("click", () => {
  gameStarted = true;
  startScreen.classList.add("hidden");
});

function updatePlayer(delta) {
  playerDirection.set(
    Number(keys.KeyD) - Number(keys.KeyA),
    0,
    Number(keys.KeyS) - Number(keys.KeyW),
  );

  if (playerDirection.lengthSq() > 0) {
    playerDirection.normalize();
    const speed = keys.ShiftLeft || keys.ShiftRight ? 13 : 7.5;
    player.position.addScaledVector(playerDirection, speed * delta);
    player.rotation.y = Math.atan2(playerDirection.x, playerDirection.z);
    walkTime += delta * speed;
    player.position.y = Math.abs(Math.sin(walkTime * 2.5)) * 0.07;
  } else {
    player.position.y = THREE.MathUtils.lerp(player.position.y, 0, delta * 12);
  }

  if (!goalReached && player.position.distanceTo(marker.position) < 2.3) {
    goalReached = true;
    marker.visible = false;
    message.classList.add("visible");
  }
}

function updateCamera(delta) {
  targetCamera.set(player.position.x + 12, 13, player.position.z + 18);
  camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4));
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 3);
}

function animate(timestamp) {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  if (gameStarted) updatePlayer(delta);
  updateCamera(delta);
  marker.rotation.y += delta * 0.7;
  markerRing.scale.setScalar(1 + Math.sin(timer.getElapsed() * 3) * 0.08);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

try {
  const map = await buildWarsawMap();
  scene.add(map.group);
  startButton.disabled = false;
  startButton.textContent = "WEJDŹ DO CENTRUM";
  console.info(
    `Mapa gotowa: ${map.statistics.roads} dróg, ${map.statistics.buildings} budynków.`,
  );
} catch (error) {
  console.error(error);
  startButton.textContent = "NIE UDAŁO SIĘ WCZYTAĆ MAPY";
  document.querySelector(".start-card > p:not(.eyebrow)").textContent =
    "Sprawdź połączenie z internetem i odśwież stronę.";
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
