import * as THREE from "three";

const dummy = new THREE.Object3D();
const detailColor = new THREE.Color();

function createInstancedPart(geometry, material, count, name) {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function setInstance(mesh, index, position, scale = 1, rotationY = 0) {
  dummy.position.copy(position);
  dummy.rotation.set(0, rotationY, 0);
  dummy.scale.setScalar(scale);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
}

export function createUrbanDetails({ anchors, profile }) {
  const detailCount = Math.min(
    anchors.length,
    profile.name === "school" ? 84 : profile.name === "balanced" ? 150 : 230,
  );
  const step = Math.max(1, Math.floor(anchors.length / Math.max(1, detailCount)));
  const selected = anchors
    .filter((_, index) => index % step === 0)
    .slice(0, detailCount);
  const treeAnchors = selected.filter((_, index) => index % 3 !== 1);
  const lampAnchors = selected.filter((_, index) => index % 3 === 1);
  const signAnchors = selected.filter((_, index) => index % 7 === 3);

  const group = new THREE.Group();
  group.name = "Detale miejskie";

  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x604735 });
  const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x47704c });
  const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x30363a });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffe6a6 });
  const signMaterial = new THREE.MeshLambertMaterial({ color: 0x2c68a1 });

  const trunks = createInstancedPart(
    new THREE.CylinderGeometry(0.14, 0.2, 2.2, 6),
    trunkMaterial,
    treeAnchors.length,
    "Pnie drzew",
  );
  const crowns = createInstancedPart(
    new THREE.IcosahedronGeometry(1.05, 0),
    crownMaterial,
    treeAnchors.length,
    "Korony drzew",
  );
  treeAnchors.forEach((anchor, index) => {
    setInstance(trunks, index, anchor.clone().setY(1.1));
    const crownPosition = anchor.clone().setY(2.75);
    setInstance(crowns, index, crownPosition, 0.85 + (index % 4) * 0.08);
    detailColor.setHSL(0.31 + (index % 3) * 0.015, 0.28, 0.34 + (index % 2) * 0.04);
    crowns.setColorAt(index, detailColor);
  });
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;

  const lampPosts = createInstancedPart(
    new THREE.CylinderGeometry(0.055, 0.075, 4.2, 6),
    metalMaterial,
    lampAnchors.length,
    "Latarnie",
  );
  const lampHeads = createInstancedPart(
    new THREE.BoxGeometry(0.34, 0.16, 0.24),
    lampMaterial,
    lampAnchors.length,
    "Światła latarni",
  );
  lampAnchors.forEach((anchor, index) => {
    setInstance(lampPosts, index, anchor.clone().setY(2.1));
    setInstance(lampHeads, index, anchor.clone().setY(4.22), 1, index % 2 ? 0 : Math.PI / 2);
  });

  const signPosts = createInstancedPart(
    new THREE.CylinderGeometry(0.04, 0.055, 2.5, 6),
    metalMaterial,
    signAnchors.length,
    "Słupki znaków",
  );
  const signs = createInstancedPart(
    new THREE.BoxGeometry(0.65, 0.65, 0.07),
    signMaterial,
    signAnchors.length,
    "Znaki drogowe",
  );
  signAnchors.forEach((anchor, index) => {
    const rotation = index % 2 ? 0 : Math.PI / 2;
    setInstance(signPosts, index, anchor.clone().setY(1.25));
    setInstance(signs, index, anchor.clone().setY(2.35), 1, rotation);
  });

  for (const mesh of [trunks, crowns, lampPosts, lampHeads, signPosts, signs]) {
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  return group;
}
