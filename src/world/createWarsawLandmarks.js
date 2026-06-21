import * as THREE from "three";
import { createFacadeMaterial } from "./createFacadeMaterial.js";

function addBox(group, material, size, y, x = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  group.add(mesh);
}

export function createWarsawLandmarks(simpleMaterials, palacePosition) {
  const group = new THREE.Group();
  group.name = "Charakterystyczne budynki Warszawy";

  const stoneMaterial = createFacadeMaterial(0xb7ad98, simpleMaterials);
  const darkStoneMaterial = new THREE.MeshLambertMaterial({ color: 0x8f8879 });
  const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x59666b });

  const palace = new THREE.Group();
  palace.name = "Pałac Kultury i Nauki";
  palace.position.copy(palacePosition);

  addBox(palace, darkStoneMaterial, [58, 5, 46], 2.5);
  addBox(palace, stoneMaterial, [42, 17, 35], 13.5);
  addBox(palace, stoneMaterial, [11, 24, 17], 17, -25, 0);
  addBox(palace, stoneMaterial, [11, 24, 17], 17, 25, 0);
  addBox(palace, stoneMaterial, [17, 24, 11], 17, 0, -21);
  addBox(palace, stoneMaterial, [17, 24, 11], 17, 0, 21);
  addBox(palace, stoneMaterial, [27, 38, 25], 41);
  addBox(palace, stoneMaterial, [19, 22, 18], 71);
  addBox(palace, darkStoneMaterial, [14, 9, 13], 86.5);

  const crown = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 7.4, 12, 8),
    roofMaterial,
  );
  crown.position.y = 97;
  palace.add(crown);

  const clockMaterial = new THREE.MeshBasicMaterial({ color: 0xe5d7b5 });
  addBox(palace, clockMaterial, [5.2, 5.2, 0.18], 87, 0, 6.58);
  addBox(palace, clockMaterial, [5.2, 5.2, 0.18], 87, 0, -6.58);
  addBox(palace, clockMaterial, [0.18, 5.2, 5.2], 87, 7.08, 0);
  addBox(palace, clockMaterial, [0.18, 5.2, 5.2], 87, -7.08, 0);

  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 1.2, 34, 8),
    roofMaterial,
  );
  spire.position.y = 120;
  palace.add(spire);

  group.add(palace);

  return {
    group,
    colliders: [
      {
        points: [
          { x: palace.position.x - 29, z: palace.position.z - 23 },
          { x: palace.position.x + 29, z: palace.position.z - 23 },
          { x: palace.position.x + 29, z: palace.position.z + 23 },
          { x: palace.position.x - 29, z: palace.position.z + 23 },
        ],
        minX: palace.position.x - 29,
        maxX: palace.position.x + 29,
        minZ: palace.position.z - 23,
        maxZ: palace.position.z + 23,
      },
    ],
  };
}
