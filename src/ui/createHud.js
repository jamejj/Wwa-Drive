export function createHud() {
  const elements = {
    startScreen: document.querySelector("#start-screen"),
    startButton: document.querySelector("#start-button"),
    message: document.querySelector("#message"),
    actionPrompt: document.querySelector("#action-prompt"),
    speedometer: document.querySelector("#speedometer"),
    speedValue: document.querySelector("#speed-value"),
    primaryControl: document.querySelector("#primary-control"),
    secondaryControl: document.querySelector("#secondary-control"),
    missionText: document.querySelector(".mission p"),
    performancePanel: document.querySelector("#performance-panel"),
    performanceFps: document.querySelector("#performance-fps"),
    performanceCalls: document.querySelector("#performance-calls"),
    performanceTriangles: document.querySelector("#performance-triangles"),
    performanceScale: document.querySelector("#performance-scale"),
  };
  elements.actionPromptText = elements.actionPrompt.querySelector("span");

  function setDrivingMode(isDriving) {
    elements.speedometer.classList.toggle("visible", isDriving);
    elements.primaryControl.innerHTML = isDriving
      ? "<kbd>W/S</kbd> gaz / hamulec"
      : "<kbd>WASD</kbd> ruch";
    elements.secondaryControl.innerHTML = isDriving
      ? "<kbd>A/D</kbd> skręcanie"
      : "<kbd>SHIFT</kbd> bieg";
    elements.missionText.textContent = isDriving
      ? "Jedź do żółtego znacznika"
      : "Znajdź auto i jedź do znacznika";
  }

  function setVehiclePrompt(visible, isDriving) {
    elements.actionPrompt.classList.toggle("visible", visible);
    elements.actionPromptText.textContent = isDriving
      ? "Wysiądź z samochodu"
      : "Wsiądź do samochodu";
  }

  function setMapReady(statistics) {
    elements.startButton.disabled = false;
    elements.startButton.textContent = "WEJDŹ DO CENTRUM";
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

  return {
    elements,
    setDrivingMode,
    setVehiclePrompt,
    setMapReady,
    setMapError,
    setPerformanceVisible,
    updatePerformance,
  };
}
