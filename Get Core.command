#!/bin/zsh
set -e
echo "Downloading gba.min.js to $(pwd)..."
URL_1="https://cdn.jsdelivr.net/npm/gbajs@latest/dist/gba.min.js"
URL_2="https://unpkg.com/gbajs@latest/dist/gba.min.js"
URL_3="https://cdn.jsdelivr.net/gh/endrift/gbajs/gba.min.js"

fetch() {
  url="$1"
  echo "Trying $url"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "gba.min.js" && return 0
  elif command -v wget >/dev/null 2>&1; then
    wget -q "$url" -O "gba.min.js" && return 0
  fi
  return 1
}

if fetch "$URL_1" || fetch "$URL_2" || fetch "$URL_3"; then
  echo "✅ Downloaded gba.min.js"
else
  echo "❌ Failed to download gba.min.js. Please try again on another network."
  exit 1
fi
