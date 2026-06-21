import * as THREE from "three";

export function createCar() {
  const vehicle = new THREE.Group();
  vehicle.name = "Samochód gracza";

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 16),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(0.88, 1.35, 1);
  contactShadow.position.y = 0.035;
  vehicle.add(contactShadow);

  const paint = new THREE.MeshStandardMaterial({
    color: 0xc72732,
    metalness: 0.25,
    roughness: 0.38,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x263944,
    metalness: 0.15,
    roughness: 0.18,
  });

  const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.62, 4.15), paint);
  lowerBody.position.y = 0.72;
  lowerBody.castShadow = true;
  lowerBody.receiveShadow = true;
  vehicle.add(lowerBody);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.28, 1.2), paint);
  hood.position.set(0, 1.08, 1.28);
  hood.castShadow = true;
  vehicle.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.82, 1.85), glass);
  cabin.position.set(0, 1.28, -0.22);
  cabin.castShadow = true;
  vehicle.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 1.15), paint);
  roof.position.set(0, 1.74, -0.25);
  roof.castShadow = true;
  vehicle.add(roof);

  const wheels = [];
  const tireMaterial = new THREE.MeshStandardMaterial({ color: 0x121315, roughness: 1 });
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.3, 1.3]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.39, 0.39, 0.3, 18),
        tireMaterial,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.45, z);
      wheel.castShadow = true;
      wheels.push(wheel);
      vehicle.add(wheel);
    }
  }

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff1bd,
    emissive: 0x4c3f19,
  });
  for (const x of [-0.67, 0.67]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.08), lightMaterial);
    light.position.set(x, 0.85, 2.095);
    vehicle.add(light);
  }

  vehicle.userData.wheels = wheels;
  vehicle.userData.paintMaterial = paint;
  return vehicle;
}
