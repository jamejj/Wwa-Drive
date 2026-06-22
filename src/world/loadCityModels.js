import * as THREE from "three";

function loadGltf(loader, url) {
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

export async function loadCityModels(location, geoToWorld) {
  const group = new THREE.Group();
  group.name = `Zewnętrzne modele miasta: ${location.name}`;
  const definitions = (location.cityModels ?? []).filter(
    (definition) => definition.enabled,
  );
  if (definitions.length === 0) return group;

  const { GLTFLoader } = await import(
    "three/addons/loaders/GLTFLoader.js"
  );
  const loader = new GLTFLoader();
  for (const definition of definitions) {
    try {
      const gltf = await loadGltf(loader, definition.url);
      const model = gltf.scene;
      model.name = definition.name;
      model.position.copy(
        geoToWorld(definition.position.lat, definition.position.lon),
      );
      model.position.y = definition.position.y ?? 0;
      model.rotation.y = definition.rotation ?? 0;
      model.scale.setScalar(definition.scale ?? 1);
      model.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = false;
        object.receiveShadow = true;
      });
      group.add(model);
    } catch (error) {
      console.warn(`Nie udało się wczytać modelu ${definition.name}.`, error);
    }
  }
  return group;
}
