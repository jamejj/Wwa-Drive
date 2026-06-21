import * as THREE from "three";

export function createFacadeMaterial(color, simpleMaterials) {
  const material = simpleMaterials
    ? new THREE.MeshLambertMaterial({ color })
    : new THREE.MeshStandardMaterial({ color, roughness: 0.88 });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFacadePosition;
        varying vec3 vFacadeNormal;`,
      )
      .replace(
        "#include <beginnormal_vertex>",
        `#include <beginnormal_vertex>
        vFacadeNormal = objectNormal;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vFacadePosition = transformed;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vFacadePosition;
        varying vec3 vFacadeNormal;`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        float facadeMask = 1.0 - smoothstep(0.35, 0.72, abs(vFacadeNormal.y));
        float facadeAxis = abs(vFacadeNormal.x) > abs(vFacadeNormal.z)
          ? vFacadePosition.z
          : vFacadePosition.x;
        vec2 facadeCell = fract(vec2(facadeAxis / 3.15, vFacadePosition.y / 3.05));
        float windowX = step(0.18, facadeCell.x) * step(facadeCell.x, 0.78);
        float windowY = step(0.28, facadeCell.y) * step(facadeCell.y, 0.78);
        float windowMask = windowX * windowY * facadeMask;
        float floorLine = (1.0 - smoothstep(0.03, 0.08, facadeCell.y)) * facadeMask;
        vec3 windowColor = vec3(0.13, 0.20, 0.23);
        diffuseColor.rgb = mix(diffuseColor.rgb, windowColor, windowMask * 0.72);
        diffuseColor.rgb *= 1.0 - floorLine * 0.09;`,
      );
  };
  material.customProgramCacheKey = () =>
    `wawa-facade-${simpleMaterials ? "simple" : "standard"}`;

  return material;
}
