#!/bin/bash
set -e

echo "==> Installing system dependencies..."
apt-get update && apt-get install -y \
  chromium-browser \
  fonts-dejavu \
  gconf-service \
  libasound2 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgconf-2-4 \
  libgdk-pixbuf2.0-0 \
  libglib2.0-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  wget

echo "==> Installing Node dependencies..."
yarn install

echo "==> Installing Puppeteer Chrome..."
npx puppeteer browsers install chrome

echo "==> Build complete!"
