const PROFILES = {
  school: {
    name: "school",
    targetFps: 30,
    maxPixelRatio: 1,
    minPixelRatio: 0.72,
    antialias: false,
    simpleMaterials: true,
    shadows: false,
    shadowMapSize: 512,
    viewDistance: 360,
    pedestrianCount: 8,
  },
  balanced: {
    name: "balanced",
    targetFps: 45,
    maxPixelRatio: 1.35,
    minPixelRatio: 0.9,
    antialias: true,
    simpleMaterials: false,
    shadows: false,
    shadowMapSize: 1024,
    viewDistance: 560,
    pedestrianCount: 16,
  },
  high: {
    name: "high",
    targetFps: 60,
    maxPixelRatio: 2,
    minPixelRatio: 1,
    antialias: true,
    simpleMaterials: false,
    shadows: true,
    shadowMapSize: 2048,
    viewDistance: 850,
    pedestrianCount: 28,
  },
};

export function getPerformanceProfile() {
  const requestedProfile = new URLSearchParams(location.search).get("quality");
  if (requestedProfile && PROFILES[requestedProfile]) {
    return PROFILES[requestedProfile];
  }

  // Lekki profil jest domyślny, bo gra ma działać również na szkolnych komputerach.
  return PROFILES.school;
}
