#!/bin/sh

# ------------------------------------
# Function:
# - Verify all webpages.
#
# Version:
# - v1.0.0 - 2025/06/06 initial release
# - v1.1.0 - 2025/06/13 website added
#
# Prerequisites:
# - tidy-html5 installed
# ------------------------------------

# set -o xtrace
set -o verbose

tidy -version

tidy -errors -quiet abbildung.html

tidy -errors -quiet api.html

tidy -errors -quiet dud.html

tidy -errors -quiet gpx.html

tidy -errors -quiet hoehenlinien.html

tidy -errors -quiet impressum.html

tidy -errors -quiet index.html

tidy -errors -quiet karte.html

tidy -errors -quiet punkt_utm.html

tidy -errors -quiet punkt.html

tidy -errors -quiet schummerung.html

