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
  const benchAnchors = selected.filter((_, index) => index % 11 === 5);
  const binAnchors = selected.filter((_, index) => index % 13 === 7);
  const bollardAnchors = selected.filter((_, index) => index % 5 === 0);
  const shelterAnchors = selected.filter((_, index) => index % 23 === 9);

  const group = new THREE.Group();
  group.name = "Detale miejskie";

  const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x604735 });
  const crownMaterial = new THREE.MeshLambertMaterial({ color: 0x47704c });
  const metalMaterial = new THREE.MeshLambertMaterial({ color: 0x30363a });
  const lampMaterial = new THREE.MeshBasicMaterial({ color: 0xffe6a6 });
  const signMaterial = new THREE.MeshLambertMaterial({ color: 0x2c68a1 });
  const benchMaterial = new THREE.MeshLambertMaterial({ color: 0x6f4d32 });
  const glassMaterial = new THREE.MeshLambertMaterial({
    color: 0x92afb6,
    transparent: true,
    opacity: 0.56,
  });

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
  const treeShadowGeometry = new THREE.CircleGeometry(1.1, 10);
  treeShadowGeometry.rotateX(-Math.PI / 2);
  const treeShadows = createInstancedPart(
    treeShadowGeometry,
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    }),
    treeAnchors.length,
    "Cienie drzew",
  );
  treeAnchors.forEach((anchor, index) => {
    setInstance(trunks, index, anchor.clone().setY(1.1));
    const crownPosition = anchor.clone().setY(2.75);
    setInstance(crowns, index, crownPosition, 0.85 + (index % 4) * 0.08);
    detailColor.setHSL(0.31 + (index % 3) * 0.015, 0.28, 0.34 + (index % 2) * 0.04);
    crowns.setColorAt(index, detailColor);
    setInstance(treeShadows, index, anchor.clone().setY(0.022), 0.9);
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

  const benchSeats = createInstancedPart(
    new THREE.BoxGeometry(1.65, 0.13, 0.48),
    benchMaterial,
    benchAnchors.length,
    "Ławki",
  );
  const benchBacks = createInstancedPart(
    new THREE.BoxGeometry(1.65, 0.58, 0.11),
    benchMaterial,
    benchAnchors.length,
    "Oparcia ławek",
  );
  benchAnchors.forEach((anchor, index) => {
    const rotation = index % 2 ? 0 : Math.PI / 2;
    setInstance(benchSeats, index, anchor.clone().setY(0.52), 1, rotation);
    const backPosition = anchor.clone().setY(0.87);
    if (rotation === 0) backPosition.z -= 0.2;
    else backPosition.x -= 0.2;
    setInstance(benchBacks, index, backPosition, 1, rotation);
  });

  const bins = createInstancedPart(
    new THREE.CylinderGeometry(0.22, 0.25, 0.72, 8),
    metalMaterial,
    binAnchors.length,
    "Kosze uliczne",
  );
  binAnchors.forEach((anchor, index) => {
    setInstance(bins, index, anchor.clone().setY(0.36));
  });

  const bollards = createInstancedPart(
    new THREE.CylinderGeometry(0.075, 0.095, 0.72, 6),
    metalMaterial,
    bollardAnchors.length,
    "Słupki uliczne",
  );
  bollardAnchors.forEach((anchor, index) => {
    setInstance(bollards, index, anchor.clone().setY(0.36));
  });

  const shelters = createInstancedPart(
    new THREE.BoxGeometry(3.3, 2.35, 0.11),
    glassMaterial,
    shelterAnchors.length,
    "Wiaty przystankowe",
  );
  const shelterRoofs = createInstancedPart(
    new THREE.BoxGeometry(3.55, 0.12, 1.15),
    metalMaterial,
    shelterAnchors.length,
    "Dachy przystanków",
  );
  shelterAnchors.forEach((anchor, index) => {
    const rotation = index % 2 ? 0 : Math.PI / 2;
    setInstance(shelters, index, anchor.clone().setY(1.18), 1, rotation);
    setInstance(shelterRoofs, index, anchor.clone().setY(2.4), 1, rotation);
  });

  for (const mesh of [
    treeShadows,
    trunks,
    crowns,
    lampPosts,
    lampHeads,
    signPosts,
    signs,
    benchSeats,
    benchBacks,
    bins,
    bollards,
    shelters,
    shelterRoofs,
  ]) {
    mesh.computeBoundingSphere();
    group.add(mesh);
  }

  return group;
}
