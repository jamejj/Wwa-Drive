import * as THREE from "three";

export function createMissionMarker() {
  const marker = new THREE.Group();
  marker.name = "Znacznik misji";

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.09, 10, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd91a }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 1.25, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd91a,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.position.y = 3;
  marker.add(ring, beam);

  return { marker, ring };
}
