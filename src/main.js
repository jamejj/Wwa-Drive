import * as THREE from "three";
import "./style.css";
import { createScene } from "./core/createScene.js";
import { createCar } from "./entities/createCar.js";
import { createMissionMarker } from "./entities/createMissionMarker.js";
import { createPlayer } from "./entities/createPlayer.js";
import { createHud } from "./ui/createHud.js";
import { buildWarsawMap, geoToWorld } from "./world/warsawMap.js";
import { collidesWithBuildings, isPointOnRoad } from "./world/collisions.js";

const { scene, camera, renderer } = createScene(document.querySelector("#app"));
const hud = createHud();

const spawnPoint = geoToWorld(52.23225, 21.00335);
const carSpawnPoint = spawnPoint.clone().add(new THREE.Vector3(2.5, 0, 0.8));

const player = createPlayer();
player.position.copy(spawnPoint);
scene.add(player);

const car = createCar();
car.position.copy(carSpawnPoint);
car.rotation.y = Math.PI;
scene.add(car);

const { marker, ring: markerRing } = createMissionMarker();
marker.position.copy(geoToWorld(52.2352, 21.0086));
scene.add(marker);

const state = {
  gameStarted: false,
  goalReached: false,
  isDriving: false,
  carSpeed: 0,
  walkTime: 0,
};
const keys = {};
const timer = new THREE.Timer();
timer.connect(document);
const playerDirection = new THREE.Vector3();
const targetCamera = new THREE.Vector3();
const verticalAxis = new THREE.Vector3(0, 1, 0);
const previousPosition = new THREE.Vector3();
let buildingColliders = [];
let roadSurfaces = [];

function resetGame() {
  player.position.copy(spawnPoint);
  player.visible = true;
  car.position.copy(carSpawnPoint);
  car.rotation.y = Math.PI;
  state.carSpeed = 0;
  state.isDriving = false;
  state.goalReached = false;
  hud.elements.message.classList.remove("visible");
  marker.visible = true;
  hud.setDrivingMode(false);
}

function toggleVehicle() {
  if (state.isDriving) {
    state.isDriving = false;
    player.visible = true;
    const exitOffset = new THREE.Vector3(2.2, 0, 0).applyAxisAngle(
      verticalAxis,
      car.rotation.y,
    );
    player.position.copy(car.position).add(exitOffset);
    player.rotation.y = car.rotation.y;
    hud.setDrivingMode(false);
    return;
  }

  if (player.position.distanceTo(car.position) <= 3.2) {
    state.isDriving = true;
    player.visible = false;
    hud.setVehiclePrompt(false, true);
    hud.setDrivingMode(true);
  }
}

addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "KeyE" && !event.repeat && state.gameStarted) toggleVehicle();
  if (event.code === "KeyR") resetGame();
});
addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

hud.elements.startButton.addEventListener("click", () => {
  state.gameStarted = true;
  hud.elements.startScreen.classList.add("hidden");
  hud.setDrivingMode(false);
});

function updatePlayer(delta) {
  playerDirection.set(
    Number(keys.KeyD) - Number(keys.KeyA),
    0,
    Number(keys.KeyS) - Number(keys.KeyW),
  );

  if (playerDirection.lengthSq() > 0) {
    previousPosition.copy(player.position);
    playerDirection.normalize();
    const speed = keys.ShiftLeft || keys.ShiftRight ? 13 : 7.5;
    player.position.addScaledVector(playerDirection, speed * delta);
    player.rotation.y = Math.atan2(playerDirection.x, playerDirection.z);
    state.walkTime += delta * speed;
    player.position.y = Math.abs(Math.sin(state.walkTime * 2.5)) * 0.07;
    if (collidesWithBuildings(player.position, 0.38, buildingColliders)) {
      player.position.x = previousPosition.x;
      player.position.z = previousPosition.z;
    }
  } else {
    player.position.y = THREE.MathUtils.lerp(player.position.y, 0, delta * 12);
  }
}

function updateCar(delta) {
  const throttle = Number(keys.KeyW) - Number(keys.KeyS);
  const steering = Number(keys.KeyA) - Number(keys.KeyD);
  const onRoad = isPointOnRoad(car.position, roadSurfaces);
  const maxForwardSpeed = onRoad ? 25 : 10;
  const maxReverseSpeed = -9;
  const acceleration = onRoad ? 15 : 7;

  if (throttle > 0) state.carSpeed += acceleration * delta;
  if (throttle < 0) state.carSpeed -= (state.carSpeed > 1 ? 25 : 10) * delta;
  if (throttle === 0) state.carSpeed *= Math.exp(-(onRoad ? 1.8 : 3.8) * delta);

  state.carSpeed = THREE.MathUtils.clamp(
    state.carSpeed,
    maxReverseSpeed,
    maxForwardSpeed,
  );
  if (Math.abs(state.carSpeed) < 0.04) state.carSpeed = 0;

  const speedRatio = THREE.MathUtils.clamp(
    Math.abs(state.carSpeed) / maxForwardSpeed,
    0,
    1,
  );
  if (Math.abs(state.carSpeed) > 0.15) {
    car.rotation.y +=
      steering *
      Math.sign(state.carSpeed) *
      (1.4 - speedRatio * 0.55) *
      delta;
  }

  previousPosition.copy(car.position);
  const previousRotation = car.rotation.y;
  car.position.x += Math.sin(car.rotation.y) * state.carSpeed * delta;
  car.position.z += Math.cos(car.rotation.y) * state.carSpeed * delta;
  if (collidesWithBuildings(car.position, 1.2, buildingColliders)) {
    car.position.copy(previousPosition);
    car.rotation.y = previousRotation;
    state.carSpeed *= -0.12;
  }
  for (const wheel of car.userData.wheels) {
    wheel.rotation.x += state.carSpeed * delta * 2.5;
  }
  hud.elements.speedValue.textContent = Math.round(Math.abs(state.carSpeed) * 3.6);
}

function updateInteractions() {
  const canEnter =
    state.gameStarted &&
    !state.isDriving &&
    player.position.distanceTo(car.position) <= 3.2;
  hud.setVehiclePrompt(canEnter || state.isDriving, state.isDriving);
}

function updateGoal() {
  const controlledPosition = state.isDriving ? car.position : player.position;
  if (!state.goalReached && controlledPosition.distanceTo(marker.position) < 3.2) {
    state.goalReached = true;
    marker.visible = false;
    hud.elements.message.classList.add("visible");
  }
}

function updateCamera(delta) {
  if (state.isDriving) {
    const cameraOffset = new THREE.Vector3(0, 7.5, -12).applyAxisAngle(
      verticalAxis,
      car.rotation.y,
    );
    targetCamera.copy(car.position).add(cameraOffset);
    camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4.5));
    const lookAhead = new THREE.Vector3(0, 1.2, 7).applyAxisAngle(
      verticalAxis,
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

  if (state.gameStarted) {
    if (state.isDriving) updateCar(delta);
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
  buildingColliders = map.buildingColliders;
  roadSurfaces = map.roadSurfaces;
  hud.setMapReady(map.statistics);
} catch (error) {
  hud.setMapError(error);
}
