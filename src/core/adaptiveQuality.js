export function createAdaptiveQuality({
  renderer,
  profile,
  initialPixelRatio,
}) {
  let pixelRatio = initialPixelRatio;
  let measuredFrames = 0;
  let measuredTime = 0;
  let cooldown = 0;

  function resizeRenderer() {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(innerWidth, innerHeight, false);
  }

  return {
    update(delta) {
      measuredFrames += 1;
      measuredTime += delta;
      cooldown = Math.max(0, cooldown - delta);

      if (measuredTime < 4 || cooldown > 0) return;

      const averageFps = measuredFrames / measuredTime;
      const lowerThreshold = profile.targetFps * 0.82;
      const upperThreshold = profile.targetFps * 0.97;

      if (averageFps < lowerThreshold && pixelRatio > profile.minPixelRatio) {
        pixelRatio = Math.max(profile.minPixelRatio, pixelRatio - 0.1);
        resizeRenderer();
        cooldown = 6;
      } else if (
        averageFps > upperThreshold &&
        pixelRatio < Math.min(devicePixelRatio, profile.maxPixelRatio)
      ) {
        pixelRatio = Math.min(
          Math.min(devicePixelRatio, profile.maxPixelRatio),
          pixelRatio + 0.05,
        );
        resizeRenderer();
        cooldown = 8;
      }

      measuredFrames = 0;
      measuredTime = 0;
    },
    getPixelRatio() {
      return pixelRatio;
    },
  };
}
