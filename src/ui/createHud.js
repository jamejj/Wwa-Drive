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
        `${statistics.renderObjects} obiektów renderowania.`,
    );
  }

  function setMapError(error) {
    console.error(error);
    elements.startButton.textContent = "NIE UDAŁO SIĘ WCZYTAĆ MAPY";
    document.querySelector(".start-card > p:not(.eyebrow)").textContent =
      "Nie udało się odczytać lokalnych danych mapy. Uruchom projekt przez Vite.";
  }

  return {
    elements,
    setDrivingMode,
    setVehiclePrompt,
    setMapReady,
    setMapError,
  };
}
