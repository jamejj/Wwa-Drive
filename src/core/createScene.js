import * as THREE from "three";
import { createSurfaceMaterial } from "./createSurfaceMaterial.js";

export function createScene(app, performanceProfile, atmosphere) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(atmosphere.sky);
  scene.fog = new THREE.Fog(
    atmosphere.fog,
    performanceProfile.viewDistance * 0.48,
    performanceProfile.viewDistance * 0.92,
  );

  // Wyższa wartość near poprawia precyzję bufora głębi i ogranicza migotanie powierzchni.
  const camera = new THREE.PerspectiveCamera(
    60,
    innerWidth / innerHeight,
    0.4,
    performanceProfile.viewDistance,
  );
  camera.position.set(12, 14, 18);

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(performanceProfile.viewDistance * 0.92, 16, 10),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: {
          value: new THREE.Color(atmosphere.sky).multiplyScalar(0.72),
        },
        horizonColor: {
          value: new THREE.Color(atmosphere.fog).lerp(
            new THREE.Color(0xffffff),
            0.25,
          ),
        },
      },
      vertexShader: `
        varying float vSkyHeight;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vSkyHeight = normalize(worldPosition.xyz).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        varying float vSkyHeight;
        void main() {
          float blend = smoothstep(-0.08, 0.72, vSkyHeight);
          gl_FragColor = vec4(mix(horizonColor, topColor, blend), 1.0);
        }
      `,
    }),
  );
  sky.name = "Niebo";
  scene.add(sky);

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
  renderer.toneMappingExposure =
    atmosphere.exposure *
    (performanceProfile.name === "school" ? 1 : 1.08);
  app.append(renderer.domElement);

  scene.add(
    new THREE.HemisphereLight(
      atmosphere.hemisphereSky,
      atmosphere.hemisphereGround,
      1.85,
    ),
  );

  const sun = new THREE.DirectionalLight(atmosphere.sun, 2.55);
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

  const groundMaterial = createSurfaceMaterial({
    color: 0x718365,
    style: "grass",
    simpleMaterials: performanceProfile.simpleMaterials,
  });
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
