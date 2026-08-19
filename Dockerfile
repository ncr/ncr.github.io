# Etap 1: build statycznej strony (Astro)
FROM node:24-slim AS site
COPY shared/ /shared/
WORKDIR /site
COPY site/package.json site/package-lock.json ./
# `npm install`, nie `ci`: lock z npm 12 nie zawiera wszystkich opcjonalnych binarek platform i npm 11 w obrazie go odrzuca
RUN npm install --no-audit --no-fund
COPY site/ ./
ARG SITE_URL=http://localhost:8080
ENV SITE_URL=$SITE_URL
RUN npm run build

# Etap 2: wieczny peer (statyka + /submit + Yjs sync + signaling WebRTC)
FROM node:24-slim
COPY shared/ /shared/
WORKDIR /app
# classic-level (LevelDB) ma prebuilt binarki dla linux-x64 glibc, więc bez toolchaina
COPY peer/package.json peer/package-lock.json ./
RUN npm ci --omit=dev
COPY peer/server.mjs ./
COPY --from=site /site/dist ./public
ENV PORT=8080 HOST=0.0.0.0 STATIC_DIR=/app/public DATA_DIR=/data
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
USER node
CMD ["node", "server.mjs"]
