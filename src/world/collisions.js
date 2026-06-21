function pointInPolygon(x, z, points) {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current++) {
    const a = points[current];
    const b = points[previous];
    const intersects =
      a.z > z !== b.z > z &&
      x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function squaredDistanceToSegment(x, z, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return (x - start.x) ** 2 + (z - start.z) ** 2;
  }

  const amount = Math.max(
    0,
    Math.min(1, ((x - start.x) * dx + (z - start.z) * dz) / lengthSquared),
  );
  const closestX = start.x + amount * dx;
  const closestZ = start.z + amount * dz;
  return (x - closestX) ** 2 + (z - closestZ) ** 2;
}

export function collidesWithBuildings(position, radius, colliders) {
  const x = position.x;
  const z = position.z;
  const radiusSquared = radius * radius;

  for (const collider of colliders) {
    if (
      x + radius < collider.minX ||
      x - radius > collider.maxX ||
      z + radius < collider.minZ ||
      z - radius > collider.maxZ
    ) {
      continue;
    }

    if (pointInPolygon(x, z, collider.points)) return true;

    for (let index = 0; index < collider.points.length; index += 1) {
      const start = collider.points[index];
      const end = collider.points[(index + 1) % collider.points.length];
      if (squaredDistanceToSegment(x, z, start, end) <= radiusSquared) return true;
    }
  }

  return false;
}

export function isPointOnRoad(position, roadSurfaces) {
  for (const road of roadSurfaces) {
    if (
      position.x < road.minX ||
      position.x > road.maxX ||
      position.z < road.minZ ||
      position.z > road.maxZ
    ) {
      continue;
    }

    if (
      squaredDistanceToSegment(position.x, position.z, road.start, road.end) <=
      road.halfWidth * road.halfWidth
    ) {
      return true;
    }
  }
  return false;
}
