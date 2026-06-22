# Legalne modele 3D Warszawy

Stan researchu: 22 czerwca 2026.

## Rekomendacja

Najbezpieczniejszym źródłem dokładniejszych brył są modele budynków GUGiK.
Geoportal opisuje LoD1 i LoD2 jako dane bezpłatne i możliwe do dowolnego
wykorzystania. Źródłowy format CityGML 2.0 nie nadaje się bezpośrednio do
Three.js. Dla gry należy pobierać pojedynczy powiat, wycinać małą lokację,
upraszczać geometrię i konwertować ją do GLB.

Modele drzew GUGiK są dostępne nieodpłatnie i do powszechnego wykorzystania.
Zawierają położenie i wysokość drzew powyżej 4 m. W grze lepiej wykorzystać
te dane do rozmieszczenia lekkich instancji niż importować każde drzew jako
oddzielny złożony model.

Fototeksturowany model siatkowy 3D jest dostępny bezpłatnie do pobrania, lecz
jest znacznie cięższy od LoD1/LoD2. Nie nadaje się obecnie do szkolnych
komputerów ani do importu całej dzielnicy.

Oficjalnego miejskiego modelu 3D Warszawy nie należy dodawać do repozytorium,
dopóki przy konkretnym pliku do pobrania nie znajdziemy jednoznacznych warunków
redystrybucji i wykorzystania w grze.

## Źródła i formaty

| Źródło | Dostęp | Format | Three.js | Decyzja |
| --- | --- | --- | --- | --- |
| GUGiK budynki LoD1 2024 | bezpłatne, dowolne użycie | CityGML 2.0 | po konwersji do GLB | najlepsze na pierwszy pilotaż |
| GUGiK budynki LoD2 2018 | bezpłatne, dowolne użycie | CityGML 2.0 | po konwersji do GLB | później, dachy są dokładniejsze, ale dane starsze |
| GUGiK drzewa LoD1 2023 | nieodpłatne, powszechne użycie | CityGML 2.0 | konwersja lub odczyt pozycji/wysokości | używać jako dane do instancingu |
| GUGiK 3D mesh | bezpłatne pobieranie | siatka z teksturami | wymaga konwersji i silnej redukcji | na razie nie |
| OpenStreetMap | ODbL, wymagane oznaczenie źródła | OSM/PBF/JSON | obecny pipeline | drogi, POI, rzeka i baza lokacji |
| miejski model Warszawy | licencja pliku niezweryfikowana | zależnie od publikacji | zależnie od formatu | nie importować bez dokumentu licencji |

## Pipeline pilotażowy

1. Zacząć od około 300 × 300 m Centrum albo Bulwarów.
2. Pobrać paczkę GUGiK CityGML LoD1 2024.
3. Wyciąć budynki przecinające granice lokacji w QGIS/GDAL.
4. Przekonwertować CityGML do glTF/GLB, np. przez QGIS/FME/Blender lub
   narzędzie oparte na 3DCityDB.
5. Przenieść współrzędne do lokalnego początku mapy.
6. Uprościć model, połączyć materiały i celować w maksymalnie kilka MB na
   lokację.
7. Zachować obecną geometrię OSM jako fallback.
8. Dopiero po pomiarze FPS rozszerzać obszar i wdrożyć ładowanie sektorami.

## Linki

- https://www.geoportal.gov.pl/pl/dane/inne-dane/modele-3d-budynkow/
- https://www.geoportal.gov.pl/pl/dane/inne-dane/modele-3d-drzew/
- https://www.geoportal.gov.pl/pl/dane/3d-mesh/
- https://www.openstreetmap.org/copyright
