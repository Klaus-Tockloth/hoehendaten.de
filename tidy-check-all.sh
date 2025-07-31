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
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -errors -quiet abbildung-allgemein.html
tidy -errors -quiet abbildung-gelaenderauheit.html
tidy -errors -quiet abbildung-hangexposition.html
tidy -errors -quiet abbildung-hangneigung.html
tidy -errors -quiet abbildung-hoehenschichtlinien.html
tidy -errors -quiet abbildung-kolorierung.html
tidy -errors -quiet abbildung-schummerung.html
tidy -errors -quiet api-allgemein.html
tidy -errors -quiet api-aspectrequest.html
tidy -errors -quiet api-contoursrequest.html
tidy -errors -quiet api-gpxrequest.html
tidy -errors -quiet api-gpxanalyzerequest.html
tidy -errors -quiet api-hillshaderequest.html
tidy -errors -quiet api-pointrequest.html
tidy -errors -quiet api-rawtifrequest.html
tidy -errors -quiet api-roughnessrequest.html
tidy -errors -quiet api-sloperequest.html
tidy -errors -quiet api-utmpointrequest.html
tidy -errors -quiet dienst-gelaenderauheit.html
tidy -errors -quiet dienst-gpx.html
tidy -errors -quiet dienst-gpx-analyse.html
tidy -errors -quiet dienst-hangexposition.html
tidy -errors -quiet dienst-hangneigung.html
tidy -errors -quiet dienst-hoehenschichtlinien.html
tidy -errors -quiet dienst-kolorierung.html
tidy -errors -quiet dienst-punkt_utm.html
tidy -errors -quiet dienst-punkt.html
tidy -errors -quiet dienst-quelldaten.html
tidy -errors -quiet dienst-schummerung.html
tidy -errors -quiet grundlagen.html
tidy -errors -quiet impressum.html
tidy -errors -quiet index.html
tidy -errors -quiet karte.html

