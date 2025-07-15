#!/bin/sh

# ------------------------------------
# Function:
# - Formats all webpages.
#
# Version:
# - v1.0.0 - 2025/06/06 initial release
# - v1.1.0 - 2025/06/13 website added
# - v1.2.0 - 2025/07/12 websites added
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -config tidy-config.txt -quiet -modify abbildung-allgemein.html
tidy -config tidy-config.txt -quiet -modify abbildung-hangexposition.html
tidy -config tidy-config.txt -quiet -modify abbildung-hangneigung.html
tidy -config tidy-config.txt -quiet -modify abbildung-hoehenschichtlinien.html
tidy -config tidy-config.txt -quiet -modify abbildung-kolorierung.html
tidy -config tidy-config.txt -quiet -modify abbildung-ri.html
tidy -config tidy-config.txt -quiet -modify abbildung-schummerung.html
tidy -config tidy-config.txt -quiet -modify abbildung-tpi.html
tidy -config tidy-config.txt -quiet -modify abbildung-tri.html
tidy -config tidy-config.txt -quiet -modify api-allgemein.html
tidy -config tidy-config.txt -quiet -modify api-aspectrequest.html
tidy -config tidy-config.txt -quiet -modify api-contoursrequest.html
tidy -config tidy-config.txt -quiet -modify api-gpxrequest.html
tidy -config tidy-config.txt -quiet -modify api-gpxanalyzerequest.html
tidy -config tidy-config.txt -quiet -modify api-hillshaderequest.html
tidy -config tidy-config.txt -quiet -modify api-pointrequest.html
tidy -config tidy-config.txt -quiet -modify api-sloperequest.html
tidy -config tidy-config.txt -quiet -modify api-utmpointrequest.html
tidy -config tidy-config.txt -quiet -modify dienst-gpx.html
tidy -config tidy-config.txt -quiet -modify dienst-gpx-analyse.html
tidy -config tidy-config.txt -quiet -modify dienst-hangexposition.html
tidy -config tidy-config.txt -quiet -modify dienst-hangneigung.html
tidy -config tidy-config.txt -quiet -modify dienst-hoehenschichtlinien.html
tidy -config tidy-config.txt -quiet -modify dienst-kolorierung.html
tidy -config tidy-config.txt -quiet -modify dienst-punkt_utm.html
tidy -config tidy-config.txt -quiet -modify dienst-punkt.html
tidy -config tidy-config.txt -quiet -modify dienst-schummerung.html
tidy -config tidy-config.txt -quiet -modify dud.html
tidy -config tidy-config.txt -quiet -modify impressum.html
tidy -config tidy-config.txt -quiet -modify index.html

# unerwünschte Änderungen im Bereich <head> ... </head>
# tidy -config tidy-config.txt -quiet -modify karte.html

