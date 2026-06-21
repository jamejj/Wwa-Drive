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

export function createSpatialIndex(items, cellSize = 32) {
  const cells = new Map();

  for (const item of items) {
    const minCellX = Math.floor(item.minX / cellSize);
    const maxCellX = Math.floor(item.maxX / cellSize);
    const minCellZ = Math.floor(item.minZ / cellSize);
    const maxCellZ = Math.floor(item.maxZ / cellSize);

    for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
        const key = `${cellX}:${cellZ}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(item);
      }
    }
  }

  return {
    query(minX, minZ, maxX, maxZ) {
      const found = new Set();
      const minCellX = Math.floor(minX / cellSize);
      const maxCellX = Math.floor(maxX / cellSize);
      const minCellZ = Math.floor(minZ / cellSize);
      const maxCellZ = Math.floor(maxZ / cellSize);

      for (let cellX = minCellX; cellX <= maxCellX; cellX += 1) {
        for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ += 1) {
          const cell = cells.get(`${cellX}:${cellZ}`);
          if (!cell) continue;
          for (const item of cell) found.add(item);
        }
      }
      return found;
    },
  };
}

export function collidesWithBuildings(position, radius, spatialIndex) {
  const x = position.x;
  const z = position.z;
  const radiusSquared = radius * radius;
  const nearbyColliders = spatialIndex.query(
    x - radius,
    z - radius,
    x + radius,
    z + radius,
  );

  for (const collider of nearbyColliders) {
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
  const nearbyRoads = roadSurfaces.query(
    position.x,
    position.z,
    position.x,
    position.z,
  );

  for (const road of nearbyRoads) {
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
