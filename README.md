# WAWA DRIVE

Przeglądarkowa gra 3D osadzona w Warszawie. Projekt powstaje jako miejski
sandbox inspirowany klasycznymi grami akcji z otwartym światem.

Obecny prototyp zawiera:

- fragment centrum Warszawy zbudowany na danych OpenStreetMap,
- prawdziwy układ ulic i obrysy budynków,
- sterowaną postać i kamerę 3D,
- prosty cel misji.

## Uruchomienie

Projekt wymaga Node.js.

```bash
npm install
npm run dev
```

Następnie otwórz adres wyświetlony w terminalu, domyślnie
`http://localhost:5173`.

## Sterowanie

- `WASD` — poruszanie postacią
- `Shift` — bieg
- `R` — powrót na pozycję startową

## Technologie

- JavaScript
- Three.js
- Vite
- OpenStreetMap / Overpass API

## Plan rozwoju

- poprawa wyglądu ulic i budynków,
- samochód oraz wsiadanie i wysiadanie,
- fizyka i kolizje,
- ruch uliczny i piesi,
- system policji,
- misje i kolejne dzielnice Warszawy.

## Dane mapowe

Dane mapy: © autorzy OpenStreetMap.
