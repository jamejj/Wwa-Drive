export const locations = [
  {
    id: "centrum",
    name: "Centrum",
    district: "Śródmieście",
    description:
      "Wieżowce, Pałac Kultury, metro i ruchliwe ulice wokół Emilii Plater.",
    available: true,
    badge: "GRYWALNE",
    map: {
      type: "warsaw-osm",
      dataFile: "/warsaw-center.json",
      landcoverFile: "/warsaw-landcover.json",
      center: { lat: 52.2331, lon: 21.0065 },
      bounds: {
        south: 52.2288,
        west: 20.9988,
        north: 52.2374,
        east: 21.015,
      },
    },
    spawn: {
      player: { lat: 52.23225, lon: 21.00335 },
      carOffset: { x: 2.5, z: 0.8 },
      carRotation: Math.PI,
    },
    mission: {
      title: "PIERWSZY CEL",
      onFoot: "Znajdź auto i jedź do znacznika",
      driving: "Jedź do żółtego znacznika",
      target: { lat: 52.2352, lon: 21.0086 },
    },
    atmosphere: {
      sky: 0x9fb4bd,
      fog: 0x9fb4bd,
      sun: 0xffe5bd,
      hemisphereSky: 0xddebf0,
      hemisphereGround: 0x59604f,
      exposure: 1,
    },
    radio: {
      station: "WAWA FM",
      show: "NOCNA ZMIANA",
      track: "Sygnał testowy — centrum",
    },
    landmarks: [
      {
        type: "metro",
        label: "M",
        subtitle: "ŚWIĘTOKRZYSKA",
        position: { lat: 52.23502, lon: 21.0083 },
      },
      {
        type: "direction",
        label: "BULWARY",
        subtitle: "WISŁA →",
        position: { lat: 52.2334, lon: 21.0136 },
        rotation: -Math.PI / 2,
      },
      {
        type: "district",
        label: "CENTRUM",
        subtitle: "WAWA DRIVE",
        position: { lat: 52.2327, lon: 21.005 },
      },
    ],
    missions: ["pierwszy-przejazd"],
  },
  {
    id: "bulwary",
    name: "Bulwary nad Wisłą",
    district: "Powiśle",
    description:
      "Schodki, promenada, mosty i nocne światła odbijające się w Wiśle.",
    available: true,
    badge: "GRYWALNE",
    map: {
      type: "warsaw-osm",
      dataFile: "/warsaw-bulwary.json",
      landcoverFile: "/warsaw-bulwary-landcover.json",
      center: { lat: 52.2395, lon: 21.031 },
      bounds: {
        south: 52.235,
        west: 21.021,
        north: 52.244,
        east: 21.041,
      },
    },
    spawn: {
      player: { lat: 52.23839, lon: 21.03209 },
      carOffset: { x: 3, z: 1 },
      carRotation: -Math.PI / 2,
    },
    mission: {
      title: "NAD WISŁĘ",
      onFoot: "Znajdź auto przy Centrum Nauki Kopernik",
      driving: "Jedź w stronę Mostu Świętokrzyskiego",
      target: { lat: 52.24155, lon: 21.0338 },
    },
    atmosphere: {
      sky: 0x8298aa,
      fog: 0x8298aa,
      sun: 0xffd4a0,
      hemisphereSky: 0xc9d9e5,
      hemisphereGround: 0x344c4b,
      exposure: 0.94,
    },
    radio: {
      station: "WAWA FM",
      show: "NAD RZEKĄ",
      track: "Beton i woda — instrumental",
    },
    landmarks: [
      {
        type: "metro",
        label: "M",
        subtitle: "CENTRUM NAUKI KOPERNIK",
        position: { lat: 52.23831, lon: 21.03115 },
      },
      {
        type: "district",
        label: "WISŁA",
        subtitle: "BULWARY",
        position: { lat: 52.2405, lon: 21.0299 },
        rotation: Math.PI / 2,
      },
      {
        type: "direction",
        label: "MOST",
        subtitle: "ŚWIĘTOKRZYSKI →",
        position: { lat: 52.2392, lon: 21.0354 },
      },
    ],
    missions: ["przejazd-bulwarami"],
    cityModels: [
      {
        name: "Most Świętokrzyski — model zewnętrzny",
        url: "/models/city/most-swietokrzyski.glb",
        enabled: false,
        position: { lat: 52.24155, lon: 21.0336, y: 0 },
        rotation: 0,
        scale: 1,
      },
    ],
  },
  {
    id: "praga",
    name: "Praga",
    district: "Praga-Północ",
    description:
      "Kamienice, podwórka, neony, tramwaje i bardziej surowy klimat ulicy.",
    available: true,
    badge: "GRYWALNE",
    map: {
      type: "warsaw-osm",
      dataFile: "/warsaw-praga.json",
      landcoverFile: "/warsaw-praga-landcover.json",
      center: { lat: 52.255, lon: 21.043 },
      bounds: {
        south: 52.2505,
        west: 21.034,
        north: 52.2595,
        east: 21.052,
      },
    },
    spawn: {
      player: { lat: 52.25533, lon: 21.04298 },
      carOffset: { x: -3, z: 1.5 },
      carRotation: Math.PI / 2,
    },
    mission: {
      title: "PRASKI KURS",
      onFoot: "Znajdź samochód w okolicy Konesera",
      driving: "Jedź w stronę Dworca Wileńskiego",
      target: { lat: 52.2542, lon: 21.0359 },
    },
    atmosphere: {
      sky: 0xa59b91,
      fog: 0xa59b91,
      sun: 0xffd3a6,
      hemisphereSky: 0xd7d0c8,
      hemisphereGround: 0x514b47,
      exposure: 0.93,
    },
    radio: {
      station: "WISŁA ROCK",
      show: "PRAWA STRONA",
      track: "Stare mury — instrumental",
    },
    landmarks: [
      {
        type: "district",
        label: "PRAGA",
        subtitle: "KONESER",
        position: { lat: 52.25545, lon: 21.0448 },
      },
      {
        type: "metro",
        label: "M",
        subtitle: "DWORZEC WILEŃSKI",
        position: { lat: 52.25438, lon: 21.0358 },
      },
    ],
    missions: ["praski-kurs"],
  },
  {
    id: "mokotow",
    name: "Mokotów",
    district: "Mokotów",
    description:
      "Bloki, szkoły, osiedlowe sklepy, parki i szerokie arterie.",
    available: true,
    badge: "GRYWALNE",
    map: {
      type: "warsaw-osm",
      dataFile: "/warsaw-mokotow.json",
      landcoverFile: "/warsaw-mokotow-landcover.json",
      center: { lat: 52.2077, lon: 21.0085 },
      bounds: {
        south: 52.203,
        west: 20.998,
        north: 52.212,
        east: 21.019,
      },
    },
    spawn: {
      player: { lat: 52.20845, lon: 21.0072 },
      carOffset: { x: 2.8, z: -1 },
      carRotation: 0,
    },
    mission: {
      title: "MOKOTOWSKA RUNDA",
      onFoot: "Znajdź auto przy Polu Mokotowskim",
      driving: "Przejedź przez Stary Mokotów",
      target: { lat: 52.20539, lon: 21.01398 },
    },
    atmosphere: {
      sky: 0xa8bdc2,
      fog: 0xa8bdc2,
      sun: 0xffe0ad,
      hemisphereSky: 0xdcebed,
      hemisphereGround: 0x53664f,
      exposure: 1.02,
    },
    radio: {
      station: "WAWA FM",
      show: "OSIEDLOWY LOT",
      track: "Zielona linia — instrumental",
    },
    landmarks: [
      {
        type: "metro",
        label: "M",
        subtitle: "POLE MOKOTOWSKIE",
        position: { lat: 52.2081, lon: 21.0072 },
      },
      {
        type: "district",
        label: "MOKOTÓW",
        subtitle: "STARY MOKOTÓW",
        position: { lat: 52.2058, lon: 21.0128 },
      },
    ],
    missions: ["mokotowska-runda"],
  },
];

export function getLocation(id) {
  return locations.find((location) => location.id === id) ?? locations[0];
}

export function getDefaultLocation() {
  return locations.find((location) => location.available) ?? locations[0];
}

export function getRequestedLocation() {
  const requestedId = new URLSearchParams(
    globalThis.location?.search ?? "",
  ).get("location");
  const requested = getLocation(requestedId);
  return requested.available ? requested : getDefaultLocation();
}
