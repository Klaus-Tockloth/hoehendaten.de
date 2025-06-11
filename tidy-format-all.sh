#!/bin/sh

# ------------------------------------
# Function:
# - Formats all webpages.
#
# Version:
# - v1.0.0 - 2025/06/06 initial release
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -config tidy-config.txt -quiet -modify abbildung.html

tidy -config tidy-config.txt -quiet -modify api.html

tidy -config tidy-config.txt -quiet -modify dud.html

tidy -config tidy-config.txt -quiet -modify gpx.html

tidy -config tidy-config.txt -quiet -modify hoehenlinien.html

tidy -config tidy-config.txt -quiet -modify impressum.html

tidy -config tidy-config.txt -quiet -modify index.html

# unerwünschte Änderungen im Bereich <head> ... </head>
# tidy -config tidy-config.txt -quiet -modify karte.html

tidy -config tidy-config.txt -quiet -modify punkt_utm.html

tidy -config tidy-config.txt -quiet -modify punkt.html

