import * as THREE from "three";

function meshBox(width, height, depth, color) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createPlayer() {
  const player = new THREE.Group();
  player.name = "Gracz";

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

  return player;
}
