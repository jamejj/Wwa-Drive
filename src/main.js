import * as THREE from "three";
import "./style.css";
import { buildWarsawMap, geoToWorld } from "./warsawMap.js";

const app = document.querySelector("#app");
const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-button");
const message = document.querySelector("#message");
const actionPrompt = document.querySelector("#action-prompt");
const actionPromptText = actionPrompt.querySelector("span");
const speedometer = document.querySelector("#speedometer");
const speedValue = document.querySelector("#speed-value");
const primaryControl = document.querySelector("#primary-control");
const secondaryControl = document.querySelector("#secondary-control");
const missionText = document.querySelector(".mission p");

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

function createCar() {
  const vehicle = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({
    color: 0xc72732,
    metalness: 0.25,
    roughness: 0.38,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x263944,
    metalness: 0.15,
    roughness: 0.18,
  });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.62, 4.15), paint);
  lowerBody.position.y = 0.72;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  vehicle.add(lowerBody);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 1.2), paint);
  hood.position.set(0, 1.08, 1.28);
  hood.castShadow = true;
  vehicle.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.82, 1.85), glass);
  cabin.position.set(0, 1.28, -0.22);
  cabin.castShadow = true;
  vehicle.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.15), paint);
  roof.position.set(0, 1.74, -0.25);
  roof.castShadow = true;
  vehicle.add(roof);

  const wheels = [];
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.3, 1.3]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.3, 18),
        new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 1 }),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      wheel.castShadow = true;
      wheels.push(wheel);
      vehicle.add(wheel);
    }
  }

  for (const x of [-0.67, 0.67]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.22, 0.08),
      new THREE.MeshStandardMaterial({
        color: 0xfff1bd,
        emissive: 0x4c3f19,
      }),
    );
    light.position.set(x, 0.85, 2.095);
    vehicle.add(light);
  }

  vehicle.userData.wheels = wheels;
  return vehicle;
}

const car = createCar();
const carSpawnPoint = spawnPoint.clone().add(new THREE.Vector3(2.5, 0, 0.8));
car.position.copy(carSpawnPoint);
car.rotation.y = Math.PI;
scene.add(car);

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
let isDriving = false;
let carSpeed = 0;
let walkTime = 0;
const timer = new THREE.Timer();
timer.connect(document);
const playerDirection = new THREE.Vector3();
const targetCamera = new THREE.Vector3();

addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "KeyE" && !event.repeat && gameStarted) {
    toggleVehicle();
  }
  if (event.code === "KeyR") {
    player.position.copy(spawnPoint);
    player.visible = true;
    car.position.copy(carSpawnPoint);
    car.rotation.y = Math.PI;
    carSpeed = 0;
    isDriving = false;
    goalReached = false;
    message.classList.remove("visible");
    marker.visible = true;
    updateHudMode();
  }
});
addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

startButton.addEventListener("click", () => {
  gameStarted = true;
  startScreen.classList.add("hidden");
  updateHudMode();
});

function updateHudMode() {
  speedometer.classList.toggle("visible", isDriving);
  primaryControl.innerHTML = isDriving
    ? "<kbd>W/S</kbd> gaz / hamulec"
    : "<kbd>WASD</kbd> ruch";
  secondaryControl.innerHTML = isDriving
    ? "<kbd>A/D</kbd> skręcanie"
    : "<kbd>SHIFT</kbd> bieg";
  missionText.textContent = isDriving
    ? "Jedź do żółtego znacznika"
    : "Znajdź auto i jedź do znacznika";
}

function toggleVehicle() {
  if (isDriving) {
    isDriving = false;
    player.visible = true;
    const exitOffset = new THREE.Vector3(2.2, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      car.rotation.y,
    );
    player.position.copy(car.position).add(exitOffset);
    player.rotation.y = car.rotation.y;
    updateHudMode();
    return;
  }

  if (player.position.distanceTo(car.position) <= 3.2) {
    isDriving = true;
    player.visible = false;
    actionPrompt.classList.remove("visible");
    updateHudMode();
  }
}

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

}

function updateCar(delta) {
  const throttle = Number(keys.KeyW) - Number(keys.KeyS);
  const steering = Number(keys.KeyA) - Number(keys.KeyD);
  const maxForwardSpeed = 25;
  const maxReverseSpeed = -9;

  if (throttle > 0) carSpeed += 15 * delta;
  if (throttle < 0) carSpeed -= (carSpeed > 1 ? 25 : 10) * delta;
  if (throttle === 0) carSpeed *= Math.exp(-1.8 * delta);

  carSpeed = THREE.MathUtils.clamp(carSpeed, maxReverseSpeed, maxForwardSpeed);
  if (Math.abs(carSpeed) < 0.04) carSpeed = 0;

  const speedRatio = THREE.MathUtils.clamp(Math.abs(carSpeed) / maxForwardSpeed, 0, 1);
  if (Math.abs(carSpeed) > 0.15) {
    const direction = Math.sign(carSpeed);
    car.rotation.y += steering * direction * (1.4 - speedRatio * 0.55) * delta;
  }

  car.position.x += Math.sin(car.rotation.y) * carSpeed * delta;
  car.position.z += Math.cos(car.rotation.y) * carSpeed * delta;

  for (const wheel of car.userData.wheels) {
    wheel.rotation.x += carSpeed * delta * 2.5;
  }

  speedValue.textContent = Math.round(Math.abs(carSpeed) * 3.6);
}

function updateInteractions() {
  const distanceToCar = player.position.distanceTo(car.position);
  const canEnter = gameStarted && !isDriving && distanceToCar <= 3.2;
  actionPrompt.classList.toggle("visible", canEnter || isDriving);
  actionPromptText.textContent = isDriving
    ? "Wysiądź z samochodu"
    : "Wsiądź do samochodu";
}

function updateGoal() {
  const controlledPosition = isDriving ? car.position : player.position;
  if (!goalReached && controlledPosition.distanceTo(marker.position) < 3.2) {
    goalReached = true;
    marker.visible = false;
    message.classList.add("visible");
  }
}

function updateCamera(delta) {
  if (isDriving) {
    const cameraOffset = new THREE.Vector3(0, 7.5, -12).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      car.rotation.y,
    );
    targetCamera.copy(car.position).add(cameraOffset);
    camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4.5));
    const lookAhead = new THREE.Vector3(0, 1.2, 7).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      car.rotation.y,
    );
    camera.lookAt(car.position.clone().add(lookAhead));
    return;
  }

  targetCamera.set(player.position.x + 12, 13, player.position.z + 18);
  camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4));
  camera.lookAt(player.position.x, player.position.y + 1, player.position.z - 3);
}

function animate(timestamp) {
  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);
  if (gameStarted) {
    if (isDriving) updateCar(delta);
    else updatePlayer(delta);
    updateInteractions();
    updateGoal();
  }
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
