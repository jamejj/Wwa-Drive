import * as THREE from "three";
import "./style.css";
import { createAdaptiveQuality } from "./core/adaptiveQuality.js";
import { createScene } from "./core/createScene.js";
import { getPerformanceProfile } from "./core/performanceProfile.js";
import { createCar } from "./entities/createCar.js";
import { createMissionMarker } from "./entities/createMissionMarker.js";
import { createPedestrianSystem } from "./entities/createPedestrianSystem.js";
import { createPlayer } from "./entities/createPlayer.js";
import { createTrafficSystem } from "./entities/createTrafficSystem.js";
import { createWeaponSystem } from "./entities/createWeaponSystem.js";
import {
  getRequestedLocation,
  locations,
} from "./locations/locationRegistry.js";
import { createHud } from "./ui/createHud.js";
import { buildWarsawMap, geoToWorld } from "./world/warsawMap.js";
import { collidesWithBuildings, isPointOnRoad } from "./world/collisions.js";
import { createLocationLandmarks } from "./world/createLocationLandmarks.js";

const performanceProfile = getPerformanceProfile();
const activeLocation = getRequestedLocation();
const { scene, camera, renderer, initialPixelRatio } = createScene(
  document.querySelector("#app"),
  performanceProfile,
  activeLocation.atmosphere,
);
const adaptiveQuality = createAdaptiveQuality({
  renderer,
  profile: performanceProfile,
  initialPixelRatio,
});
const hud = createHud(locations, activeLocation, (location) => {
  if (location.id === activeLocation.id) return;
  const url = new URL(window.location.href);
  url.searchParams.set("location", location.id);
  window.location.assign(url);
});

const spawnPoint = geoToWorld(
  activeLocation.spawn.player.lat,
  activeLocation.spawn.player.lon,
);
const carSpawnPoint = spawnPoint.clone().add(
  new THREE.Vector3(
    activeLocation.spawn.carOffset.x,
    0,
    activeLocation.spawn.carOffset.z,
  ),
);

const player = createPlayer();
player.position.copy(spawnPoint);
scene.add(player);

const car = createCar();
car.position.copy(carSpawnPoint);
car.rotation.y = activeLocation.spawn.carRotation;
scene.add(car);

const { marker, ring: markerRing } = createMissionMarker();
marker.position.copy(
  geoToWorld(
    activeLocation.mission.target.lat,
    activeLocation.mission.target.lon,
  ),
);
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
const cameraOffset = new THREE.Vector3();
const cameraLookAhead = new THREE.Vector3();
const cameraLookTarget = new THREE.Vector3();
const frameInterval = 1000 / performanceProfile.targetFps;
const idleFrameInterval = 1000 / 15;
let lastFrameTime = 0;
let debugVisible = false;
let diagnosticFrames = 0;
let diagnosticTime = 0;
let buildingIndex = null;
let roadIndex = null;
let pedestrianSystem = null;
let weaponSystem = null;
let trafficSystem = null;
let nearbyTrafficCar = null;

function resetGame() {
  player.position.copy(spawnPoint);
  player.visible = true;
  car.position.copy(carSpawnPoint);
  car.rotation.y = activeLocation.spawn.carRotation;
  car.userData.paintMaterial.color.setHex(0xc72732);
  state.carSpeed = 0;
  state.isDriving = false;
  state.goalReached = false;
  hud.elements.message.classList.remove("visible");
  marker.visible = true;
  trafficSystem?.reset();
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
    return;
  }

  const trafficCar = trafficSystem?.getNearestEnterable(player.position);
  if (trafficCar) {
    const takenCar = trafficSystem.takeCar(trafficCar.index);
    if (!takenCar) return;
    car.position.copy(takenCar.position);
    car.rotation.y = takenCar.rotation;
    car.userData.paintMaterial.color.setHex(takenCar.color);
    state.carSpeed = 0;
    state.isDriving = true;
    player.visible = false;
    nearbyTrafficCar = null;
    hud.setVehiclePrompt(false, true);
    hud.setDrivingMode(true);
  }
}

addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "F3" && !event.repeat) {
    event.preventDefault();
    debugVisible = !debugVisible;
    hud.setPerformanceVisible(debugVisible);
    diagnosticFrames = 0;
    diagnosticTime = 0;
  }
  if (event.code === "KeyE" && !event.repeat && state.gameStarted) toggleVehicle();
  if (event.code === "KeyR") resetGame();
});
addEventListener("keyup", (event) => {
  keys[event.code] = false;
});
addEventListener("blur", () => {
  for (const code in keys) keys[code] = false;
});

hud.elements.startButton.addEventListener("click", () => {
  state.gameStarted = true;
  hud.elements.startScreen.classList.add("hidden");
  hud.setDrivingMode(false);
  hud.setCrosshairVisible(true);
  renderer.domElement.classList.add("game-active");
});

renderer.domElement.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !state.gameStarted) return;
  weaponSystem?.shoot(event.timeStamp);
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
    if (collidesWithBuildings(player.position, 0.38, buildingIndex)) {
      player.position.x = previousPosition.x;
      player.position.z = previousPosition.z;
    }
    if (trafficSystem?.collides(player.position, 0.38)) {
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
  const onRoad = isPointOnRoad(car.position, roadIndex);
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
  if (collidesWithBuildings(car.position, 1.2, buildingIndex)) {
    car.position.copy(previousPosition);
    car.rotation.y = previousRotation;
    state.carSpeed *= -0.12;
  }
  if (trafficSystem?.collides(car.position, 1.2)) {
    car.position.copy(previousPosition);
    car.rotation.y = previousRotation;
    state.carSpeed *= -0.18;
  }
  for (const wheel of car.userData.wheels) {
    wheel.rotation.x += state.carSpeed * delta * 2.5;
  }
  hud.elements.speedValue.textContent = Math.round(Math.abs(state.carSpeed) * 3.6);
}

function updateInteractions() {
  const canEnterPlayerCar =
    state.gameStarted &&
    !state.isDriving &&
    player.position.distanceTo(car.position) <= 3.2;
  nearbyTrafficCar =
    state.gameStarted && !state.isDriving
      ? trafficSystem?.getNearestEnterable(player.position)
      : null;
  hud.setVehiclePrompt(
    canEnterPlayerCar || Boolean(nearbyTrafficCar) || state.isDriving,
    state.isDriving,
  );
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
    cameraOffset.set(0, 5.1, -10.2).applyAxisAngle(verticalAxis, car.rotation.y);
    targetCamera.copy(car.position).add(cameraOffset);
    camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4.5));
    cameraLookAhead.set(0, 1.15, 8).applyAxisAngle(
      verticalAxis,
      car.rotation.y,
    );
    cameraLookTarget.copy(car.position).add(cameraLookAhead);
    camera.lookAt(cameraLookTarget);
    return;
  }

  targetCamera.set(player.position.x + 8.5, 7.2, player.position.z + 10.5);
  camera.position.lerp(targetCamera, 1 - Math.exp(-delta * 4));
  camera.lookAt(player.position.x, player.position.y + 1.15, player.position.z - 1.2);
}

function isGameplayActive() {
  return (
    keys.KeyW ||
    keys.KeyA ||
    keys.KeyS ||
    keys.KeyD ||
    keys.ShiftLeft ||
    keys.ShiftRight ||
    Math.abs(state.carSpeed) > 0.05
  );
}

function animate(timestamp) {
  requestAnimationFrame(animate);
  const gameplayActive = state.gameStarted && isGameplayActive();
  const currentFrameInterval = state.gameStarted
    ? gameplayActive
      ? frameInterval
      : idleFrameInterval
    : 100;
  if (document.hidden || timestamp - lastFrameTime < currentFrameInterval) return;
  lastFrameTime =
    timestamp - ((timestamp - lastFrameTime) % currentFrameInterval);

  timer.update(timestamp);
  const delta = Math.min(timer.getDelta(), 0.05);

  if (state.gameStarted) {
    if (state.isDriving) updateCar(delta);
    else updatePlayer(delta);
    updateInteractions();
    updateGoal();
    const focusPosition = state.isDriving ? car.position : player.position;
    pedestrianSystem?.update(delta, timer.getElapsed(), focusPosition);
    if (state.isDriving) {
      pedestrianSystem?.hitByVehicle(car.position, state.carSpeed);
    }
    const trafficObstacles = player.visible
      ? [player.position, car.position]
      : [car.position];
    trafficSystem?.update(delta, trafficObstacles);
    trafficSystem?.forEachMovingCar((position, speed) => {
      pedestrianSystem?.hitByVehicle(position, speed);
    });
    weaponSystem?.update(delta);
    if (gameplayActive) adaptiveQuality.update(delta);
  }

  updateCamera(delta);
  marker.rotation.y += delta * 0.7;
  markerRing.scale.setScalar(1 + Math.sin(timer.getElapsed() * 3) * 0.08);
  renderer.render(scene, camera);

  if (debugVisible) {
    diagnosticFrames += 1;
    diagnosticTime += delta;
    if (diagnosticTime >= 1) {
      hud.updatePerformance({
        fps: diagnosticFrames / diagnosticTime,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        pixelRatio: adaptiveQuality.getPixelRatio(),
      });
      diagnosticFrames = 0;
      diagnosticTime = 0;
    }
  }
}

requestAnimationFrame(animate);

try {
  const map = await buildWarsawMap(performanceProfile, activeLocation);
  scene.add(map.group);
  scene.add(createLocationLandmarks(activeLocation, geoToWorld));
  buildingIndex = map.buildingIndex;
  roadIndex = map.roadIndex;
  pedestrianSystem = createPedestrianSystem({
    count: performanceProfile.pedestrianCount,
    spawnCenter: player.position,
    buildingIndex,
  });
  scene.add(pedestrianSystem.group);
  trafficSystem = createTrafficSystem({
    segments: map.trafficSegments,
    profile: performanceProfile,
    focusPosition: player.position,
  });
  scene.add(trafficSystem.group);
  weaponSystem = createWeaponSystem({
    camera,
    scene,
    getTargets: () => pedestrianSystem.raycastTargets,
    onNpcHit: (index) => pedestrianSystem.hitNpc(index),
    onShot: (hit) => hud.pulseCrosshair(hit),
  });
  hud.setMapReady(map.statistics);
  console.info(
    `Tryb wydajności: ${performanceProfile.name}, limit ` +
      `${performanceProfile.targetFps} FPS, pixel ratio ${adaptiveQuality.getPixelRatio()}, ` +
      `${pedestrianSystem.count} pieszych, ${trafficSystem.movingCount} aut w ruchu i ` +
      `${trafficSystem.parkedCount} zaparkowanych.`,
  );
} catch (error) {
  hud.setMapError(error);
}
