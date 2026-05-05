FROM node:18-bullseye-slim

# Install Chromium and all required dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-freefont-ttf \
    libgbm1 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading Chrome — use system Chromium instead
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm install

# Install frontend dependencies and build React app
COPY src/client/package*.json ./src/client/
RUN cd src/client && npm install

COPY . .

RUN cd src/client && npm run build

EXPOSE 10000

CMD ["node", "src/index.js"]
