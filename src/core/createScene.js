import * as THREE from "three";

export function createScene(app) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa8bfcb);
  scene.fog = new THREE.Fog(0xa8bfcb, 180, 680);

  // Wyższa wartość near poprawia precyzję bufora głębi i ogranicza migotanie powierzchni.
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.4, 850);
  camera.position.set(12, 14, 18);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
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
    new THREE.PlaneGeometry(1500, 1400),
    new THREE.MeshStandardMaterial({ color: 0x667b5a, roughness: 1 }),
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

  return { scene, camera, renderer };
}
