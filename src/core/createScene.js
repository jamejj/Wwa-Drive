import * as THREE from "three";

export function createScene(app, performanceProfile) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb4bd);
  scene.fog = new THREE.Fog(
    0x9fb4bd,
    performanceProfile.viewDistance * 0.48,
    performanceProfile.viewDistance * 0.92,
  );

  // Wyższa wartość near poprawia precyzję bufora głębi i ogranicza migotanie powierzchni.
  const camera = new THREE.PerspectiveCamera(
    55,
    innerWidth / innerHeight,
    0.4,
    performanceProfile.viewDistance,
  );
  camera.position.set(12, 14, 18);

  const renderer = new THREE.WebGLRenderer({
    antialias: performanceProfile.antialias,
    powerPreference: "low-power",
  });
  const initialPixelRatio = Math.min(
    devicePixelRatio,
    performanceProfile.maxPixelRatio,
  );
  renderer.setPixelRatio(initialPixelRatio);
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = performanceProfile.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = performanceProfile.name === "school" ? 1 : 1.08;
  app.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xddebf0, 0x59604f, 1.85));

  const sun = new THREE.DirectionalLight(0xffe5bd, 2.55);
  sun.position.set(-95, 125, 62);
  sun.castShadow = performanceProfile.shadows;
  sun.shadow.mapSize.set(
    performanceProfile.shadowMapSize,
    performanceProfile.shadowMapSize,
  );
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun);

  const groundMaterial = performanceProfile.simpleMaterials
    ? new THREE.MeshLambertMaterial({ color: 0x718365 })
    : new THREE.MeshStandardMaterial({ color: 0x718365, roughness: 1 });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1500, 1400),
    groundMaterial,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.renderOrder = -10;
  scene.add(ground);

  const handleResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  };
  addEventListener("resize", handleResize);

  return { scene, camera, renderer, initialPixelRatio };
}
