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
    available: false,
    badge: "WKRÓTCE",
    plannedLandmarks: ["Wisła", "schodki", "Most Świętokrzyski", "metro CNK"],
  },
  {
    id: "praga",
    name: "Praga",
    district: "Praga-Północ",
    description:
      "Kamienice, podwórka, neony, tramwaje i bardziej surowy klimat ulicy.",
    available: false,
    badge: "WKRÓTCE",
    plannedLandmarks: ["Koneser", "Dworzec Wileński", "praskie kamienice"],
  },
  {
    id: "mokotow",
    name: "Mokotów",
    district: "Mokotów",
    description:
      "Bloki, szkoły, osiedlowe sklepy, parki i szerokie arterie.",
    available: false,
    badge: "WKRÓTCE",
    plannedLandmarks: ["Pole Mokotowskie", "metro", "osiedla i szkoły"],
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
