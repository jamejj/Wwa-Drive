const PROFILES = {
  school: {
    name: "school",
    targetFps: 30,
    maxPixelRatio: 1,
    shadows: false,
    shadowMapSize: 512,
  },
  balanced: {
    name: "balanced",
    targetFps: 45,
    maxPixelRatio: 1.35,
    shadows: false,
    shadowMapSize: 1024,
  },
  high: {
    name: "high",
    targetFps: 60,
    maxPixelRatio: 2,
    shadows: true,
    shadowMapSize: 2048,
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
