# Modele miasta

Do tego katalogu trafiają wyłącznie zoptymalizowane pliki `.glb`, dla których
zapisano źródło, autora/instytucję, datę pobrania i warunki ponownego użycia.

Nie dodawaj tutaj modeli pobranych z Google Maps, Street View ani serwisów bez
jednoznacznej licencji. Każdy import powinien mieć obok plik `NAZWA.LICENSE.md`.

Planowany pipeline dla danych GUGiK:

1. pobrać mały wycinek CityGML LoD1/LoD2,
2. przekonwertować układ współrzędnych do lokalnego układu lokacji,
3. usunąć niewidoczne dane semantyczne i zduplikowane wierzchołki,
4. uprościć geometrię i wyeksportować do binarnego GLB,
5. sprawdzić rozmiar, liczbę trójkątów oraz licencję przed dodaniem do gry.
