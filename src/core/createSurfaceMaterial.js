import * as THREE from "three";

const STYLE_CODE = {
  asphalt: `
    float grain = hash21(floor(vSurfacePosition.xz * 2.4));
    float broad = hash21(floor(vSurfacePosition.xz * 0.16));
    diffuseColor.rgb *= 0.91 + grain * 0.07 + broad * 0.035;
  `,
  grass: `
    float grassPatch = hash21(floor(vSurfacePosition.xz * 0.22));
    float fine = hash21(floor(vSurfacePosition.xz * 1.35));
    diffuseColor.rgb *= 0.84 + grassPatch * 0.18 + fine * 0.035;
  `,
  paving: `
    vec2 tile = abs(fract(vSurfacePosition.xz / 2.15) - 0.5);
    float seam = step(0.474, max(tile.x, tile.y));
    float variation = hash21(floor(vSurfacePosition.xz / 2.15));
    diffuseColor.rgb *= 0.92 + variation * 0.08;
    diffuseColor.rgb *= 1.0 - seam * 0.11;
  `,
  water: `
    float ripple = sin(vSurfacePosition.x * 0.34 + vSurfacePosition.z * 0.22) * 0.5 + 0.5;
    diffuseColor.rgb *= 0.88 + ripple * 0.12;
  `,
  sport: `
    float stripe = step(0.5, fract(vSurfacePosition.x * 0.12));
    diffuseColor.rgb *= 0.93 + stripe * 0.07;
  `,
  rail: `
    float ballast = hash21(floor(vSurfacePosition.xz * 1.1));
    diffuseColor.rgb *= 0.82 + ballast * 0.18;
  `,
};

export function createSurfaceMaterial({
  color,
  style,
  simpleMaterials,
  extra = {},
}) {
  const material = simpleMaterials
    ? new THREE.MeshLambertMaterial({ color, ...extra })
    : new THREE.MeshStandardMaterial({
        color,
        roughness: 0.96,
        ...extra,
      });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSurfacePosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vSurfacePosition = transformed;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vSurfacePosition;
        float hash21(vec2 value) {
          return fract(sin(dot(value, vec2(127.1, 311.7))) * 43758.5453);
        }`,
      )
      .replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        ${STYLE_CODE[style] ?? ""}`,
      );
  };
  material.customProgramCacheKey = () =>
    `wawa-surface-${style}-${simpleMaterials ? "simple" : "standard"}`;
  return material;
}
