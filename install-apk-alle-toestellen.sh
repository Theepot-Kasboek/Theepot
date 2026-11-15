#!/bin/bash
# Installeert een APK op alle via USB aangesloten Android-toestellen.
# Gebruik: ./install-apk-alle-toestellen.sh pad/naar/app.apk

set -e

APK="$1"

if [ -z "$APK" ]; then
  echo "Gebruik: $0 pad/naar/app.apk"
  exit 1
fi

if [ ! -f "$APK" ]; then
  echo "Bestand niet gevonden: $APK"
  exit 1
fi

SERIALS=$(adb devices | grep -w "device" | cut -f1)

if [ -z "$SERIALS" ]; then
  echo "Geen toestellen gevonden. Check of USB-debugging aanstaat en de computer vertrouwd is op elk toestel."
  exit 1
fi

echo "Gevonden toestellen:"
echo "$SERIALS"
echo ""

for serial in $SERIALS; do
  echo "Installeren op $serial ..."
  adb -s "$serial" install -r "$APK"
done

echo ""
echo "Klaar. APK geïnstalleerd op alle aangesloten toestellen."
