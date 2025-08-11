#!/bin/sh

# ------------------------------------
# Function:
# - Formats all webpages.
#
# Version:
# - v1.0.0 - 2025/06/06 initial release
# - v1.1.0 - 2025/06/13 website added
# - v1.2.0 - 2025/07/12 websites added
# - v1.3.0 - 2025/07/31 websites added
# - v1.4.0 - 2025/08/04 websites added
# - v1.5.0 - 2025/08/06 websites added
# - v1.6.0 - 2025/08/10 websites added
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -config tidy-config.txt -quiet -modify abbildung-allgemein.html
tidy -config tidy-config.txt -quiet -modify abbildung-farbrelief.html
tidy -config tidy-config.txt -quiet -modify abbildung-gelaenderauheit.html
tidy -config tidy-config.txt -quiet -modify abbildung-hangexposition.html
tidy -config tidy-config.txt -quiet -modify abbildung-hangneigung.html
tidy -config tidy-config.txt -quiet -modify abbildung-hoehenschichtlinien.html
tidy -config tidy-config.txt -quiet -modify abbildung-kolorierung.html
tidy -config tidy-config.txt -quiet -modify abbildung-schummerung.html
tidy -config tidy-config.txt -quiet -modify abbildung-tpi.html
tidy -config tidy-config.txt -quiet -modify abbildung-tri.html
tidy -config tidy-config.txt -quiet -modify api-allgemein.html
tidy -config tidy-config.txt -quiet -modify api-aspectrequest.html
tidy -config tidy-config.txt -quiet -modify api-colorreliefrequest.html
tidy -config tidy-config.txt -quiet -modify api-contoursrequest.html
tidy -config tidy-config.txt -quiet -modify api-gpxrequest.html
tidy -config tidy-config.txt -quiet -modify api-gpxanalyzerequest.html
tidy -config tidy-config.txt -quiet -modify api-hillshaderequest.html
tidy -config tidy-config.txt -quiet -modify api-histogramrequest.html
tidy -config tidy-config.txt -quiet -modify api-pointrequest.html
tidy -config tidy-config.txt -quiet -modify api-rawtifrequest.html
tidy -config tidy-config.txt -quiet -modify api-roughnessrequest.html
tidy -config tidy-config.txt -quiet -modify api-sloperequest.html
tidy -config tidy-config.txt -quiet -modify api-tpirequest.html
tidy -config tidy-config.txt -quiet -modify api-trirequest.html
tidy -config tidy-config.txt -quiet -modify api-utmpointrequest.html
tidy -config tidy-config.txt -quiet -modify dienst-farbrelief.html
tidy -config tidy-config.txt -quiet -modify dienst-gelaenderauheit.html
tidy -config tidy-config.txt -quiet -modify dienst-gpx.html
tidy -config tidy-config.txt -quiet -modify dienst-gpx-analyse.html
tidy -config tidy-config.txt -quiet -modify dienst-hangexposition.html
tidy -config tidy-config.txt -quiet -modify dienst-hangneigung.html
tidy -config tidy-config.txt -quiet -modify dienst-histogramm.html
tidy -config tidy-config.txt -quiet -modify dienst-hoehenschichtlinien.html
tidy -config tidy-config.txt -quiet -modify dienst-kolorierung.html
tidy -config tidy-config.txt -quiet -modify dienst-punkt_utm.html
tidy -config tidy-config.txt -quiet -modify dienst-punkt.html
tidy -config tidy-config.txt -quiet -modify dienst-quelldaten.html
tidy -config tidy-config.txt -quiet -modify dienst-schummerung.html
tidy -config tidy-config.txt -quiet -modify dienst-tpi.html
tidy -config tidy-config.txt -quiet -modify dienst-tri.html
tidy -config tidy-config.txt -quiet -modify grundlagen.html
tidy -config tidy-config.txt -quiet -modify impressum.html
tidy -config tidy-config.txt -quiet -modify index.html

# unerwünschte Änderungen im Bereich <head> ... </head>
# tidy -config tidy-config.txt -quiet -modify karte.html

