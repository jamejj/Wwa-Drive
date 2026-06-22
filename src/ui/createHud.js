export function createHud(locations, initialLocation, onLocationChange) {
  const elements = {
    startScreen: document.querySelector("#start-screen"),
    startButton: document.querySelector("#start-button"),
    message: document.querySelector("#message"),
    actionPrompt: document.querySelector("#action-prompt"),
    speedometer: document.querySelector("#speedometer"),
    speedValue: document.querySelector("#speed-value"),
    primaryControl: document.querySelector("#primary-control"),
    secondaryControl: document.querySelector("#secondary-control"),
    missionTitle: document.querySelector(".mission small"),
    missionText: document.querySelector(".mission p"),
    performancePanel: document.querySelector("#performance-panel"),
    performanceFps: document.querySelector("#performance-fps"),
    performanceCalls: document.querySelector("#performance-calls"),
    performanceTriangles: document.querySelector("#performance-triangles"),
    performanceScale: document.querySelector("#performance-scale"),
    crosshair: document.querySelector("#crosshair"),
    locationGrid: document.querySelector("#location-grid"),
    selectedLocationDescription: document.querySelector(
      "#selected-location-description",
    ),
    locationName: document.querySelector("#location-name"),
    radioStation: document.querySelector("#radio-station"),
    radioShow: document.querySelector("#radio-show"),
    radioTrack: document.querySelector("#radio-track"),
  };
  elements.actionPromptText = elements.actionPrompt.querySelector("span");
  let selectedLocation = initialLocation;

  function renderLocations() {
    elements.locationGrid.replaceChildren();
    for (const location of locations) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "location-card";
      button.disabled = !location.available;
      button.classList.toggle("selected", location.id === selectedLocation.id);
      button.innerHTML = `
        <span class="location-badge">${location.badge}</span>
        <strong>${location.name}</strong>
        <small>${location.district}</small>
        <p>${location.description}</p>
      `;
      if (location.available) {
        button.addEventListener("click", () => {
          selectedLocation = location;
          renderLocations();
          setLocation(location);
          onLocationChange?.(location);
        });
      }
      elements.locationGrid.append(button);
    }
  }

  function setLocation(location) {
    selectedLocation = location;
    elements.selectedLocationDescription.textContent = location.description;
    elements.locationName.textContent = location.name.toUpperCase();
    elements.missionTitle.textContent = location.mission.title;
    elements.missionText.textContent = location.mission.onFoot;
    elements.radioStation.textContent = location.radio.station;
    elements.radioShow.textContent = location.radio.show;
    elements.radioTrack.textContent = location.radio.track;
  }

  function setRadio(radio) {
    elements.radioStation.textContent = radio.station;
    elements.radioShow.textContent = radio.show;
    elements.radioTrack.textContent = radio.track;
  }

  renderLocations();
  setLocation(initialLocation);

  function setDrivingMode(isDriving) {
    elements.speedometer.classList.toggle("visible", isDriving);
    elements.primaryControl.innerHTML = isDriving
      ? "<kbd>W/S</kbd> gaz / hamulec"
      : "<kbd>WASD</kbd> ruch";
    elements.secondaryControl.innerHTML = isDriving
      ? "<kbd>A/D</kbd> skręcanie"
      : "<kbd>SHIFT</kbd> bieg";
    elements.missionText.textContent = isDriving
      ? selectedLocation.mission.driving
      : selectedLocation.mission.onFoot;
  }

  function setVehiclePrompt(visible, isDriving) {
    elements.actionPrompt.classList.toggle("visible", visible);
    elements.actionPromptText.textContent = isDriving
      ? "Wysiądź z samochodu"
      : "Wsiądź do samochodu";
  }

  function setMapReady(statistics) {
    elements.startButton.disabled = false;
    elements.startButton.textContent =
      `WEJDŹ: ${selectedLocation.name.toUpperCase()}`;
    console.info(
      `Mapa gotowa: ${statistics.roads} dróg, ${statistics.buildings} budynków, ` +
        `${statistics.renderChunks} sektorów i ${statistics.renderObjects} warstw.`,
    );
  }

  function setMapError(error) {
    console.error(error);
    elements.startButton.textContent = "NIE UDAŁO SIĘ WCZYTAĆ MAPY";
    document.querySelector(".start-card > p:not(.eyebrow)").textContent =
      "Nie udało się odczytać lokalnych danych mapy. Uruchom projekt przez Vite.";
  }

  function setPerformanceVisible(visible) {
    elements.performancePanel.classList.toggle("visible", visible);
  }

  function updatePerformance({ fps, calls, triangles, pixelRatio }) {
    elements.performanceFps.textContent = `FPS: ${Math.round(fps)}`;
    elements.performanceCalls.textContent = `Draw calls: ${calls}`;
    elements.performanceTriangles.textContent =
      `Trójkąty: ${Math.round(triangles).toLocaleString("pl-PL")}`;
    elements.performanceScale.textContent = `Skala: ${pixelRatio.toFixed(2)}x`;
  }

  let crosshairTimer;

  function setCrosshairVisible(visible) {
    elements.crosshair.classList.toggle("visible", visible);
  }

  function pulseCrosshair(hit) {
    clearTimeout(crosshairTimer);
    elements.crosshair.classList.remove("shot", "hit");
    // Wymuszenie ponownego uruchomienia krótkiego przejścia CSS.
    void elements.crosshair.offsetWidth;
    elements.crosshair.classList.add("shot");
    if (hit) elements.crosshair.classList.add("hit");
    crosshairTimer = setTimeout(() => {
      elements.crosshair.classList.remove("shot", "hit");
    }, 90);
  }

  return {
    elements,
    setDrivingMode,
    setVehiclePrompt,
    setMapReady,
    setMapError,
    setPerformanceVisible,
    updatePerformance,
    setCrosshairVisible,
    pulseCrosshair,
    setLocation,
    setRadio,
    getSelectedLocation: () => selectedLocation,
  };
}
