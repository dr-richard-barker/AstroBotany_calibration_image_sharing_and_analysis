# Portable production image (usable on Render's Docker runtime, Fly.io, or your
# own CoSE server). Node 22.19 is pinned because the app uses the built-in
# node:sqlite module (requires Node >= 22.5).
FROM node:22.19.0-slim

WORKDIR /app

# Install deps (incl. dev, needed for the vite/esbuild build) against the lockfile
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Build client + bundle server
COPY . .
RUN npm run build

ENV NODE_ENV=production
# Persist the SQLite DB + uploaded images on a mounted volume
ENV DATA_DIR=/data
VOLUME ["/data"]

EXPOSE 3000
CMD ["npm", "run", "start"]
