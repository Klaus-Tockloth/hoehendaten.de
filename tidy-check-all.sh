#!/bin/sh

# ------------------------------------
# Function:
# - Verify all webpages.
#
# Version:
# - v1.0.0 - 2025/06/06 initial release
# - v1.1.0 - 2025/06/13 website added
# - v1.2.0 - 2025/07/12 websites added
# - v1.3.0 - 2025/07/31 websites added
# - v1.4.0 - 2025/08/04 websites added
# - v1.5.0 - 2025/08/06 websites added
# - v1.6.0 - 2025/08/10 websites added
# - v1.7.0 - 2025/08/17 website added
# - v1.8.0 - 2025/09/04 website added
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -errors -quiet abbildung-allgemein.html
tidy -errors -quiet abbildung-farbrelief.html
tidy -errors -quiet abbildung-gelaenderauheit.html
tidy -errors -quiet abbildung-hangexposition.html
tidy -errors -quiet abbildung-hangneigung.html
tidy -errors -quiet abbildung-hoehenschichtlinien.html
tidy -errors -quiet abbildung-kolorierung.html
tidy -errors -quiet abbildung-schummerung.html
tidy -errors -quiet abbildung-tpi.html
tidy -errors -quiet abbildung-tri.html
tidy -errors -quiet abbildung-ueberlagerung.html
tidy -errors -quiet api-allgemein.html
tidy -errors -quiet api-aspectrequest.html
tidy -errors -quiet api-colorreliefrequest.html
tidy -errors -quiet api-contoursrequest.html
tidy -errors -quiet api-elevationprofile.html
tidy -errors -quiet api-gpxrequest.html
tidy -errors -quiet api-gpxanalyzerequest.html
tidy -errors -quiet api-hillshaderequest.html
tidy -errors -quiet api-histogramrequest.html
tidy -errors -quiet api-pointrequest.html
tidy -errors -quiet api-rawtifrequest.html
tidy -errors -quiet api-roughnessrequest.html
tidy -errors -quiet api-sloperequest.html
tidy -errors -quiet api-tpirequest.html
tidy -errors -quiet api-trirequest.html
tidy -errors -quiet api-utmpointrequest.html
tidy -errors -quiet dienst-farbrelief.html
tidy -errors -quiet dienst-gelaenderauheit.html
tidy -errors -quiet dienst-gpx.html
tidy -errors -quiet dienst-gpx-analyse.html
tidy -errors -quiet dienst-hangexposition.html
tidy -errors -quiet dienst-hangneigung.html
tidy -errors -quiet dienst-histogramm.html
tidy -errors -quiet dienst-hoehenprofil.html
tidy -errors -quiet dienst-hoehenschichtlinien.html
tidy -errors -quiet dienst-kolorierung.html
tidy -errors -quiet dienst-punkt_utm.html
tidy -errors -quiet dienst-punkt.html
tidy -errors -quiet dienst-quelldaten.html
tidy -errors -quiet dienst-schummerung.html
tidy -errors -quiet dienst-tpi.html
tidy -errors -quiet dienst-tri.html
tidy -errors -quiet grundlagen.html
tidy -errors -quiet impressum.html
tidy -errors -quiet index.html
tidy -errors -quiet karte.html

