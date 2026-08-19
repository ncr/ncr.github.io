# Etap 1: build statycznej strony (Astro). PUBLIC_* wchodzą do statyki i muszą być
# takie same u wszystkich uczestników (każdy weryfikuje wpisy lokalnie).
FROM node:24-slim AS site
COPY shared/ /shared/
WORKDIR /site
COPY site/package.json site/package-lock.json ./
# `npm install`, nie `ci`: lock z npm 12 nie zawiera wszystkich opcjonalnych binarek platform i npm 11 w obrazie go odrzuca
RUN npm install --no-audit --no-fund
COPY site/ ./
ARG SITE_URL=http://localhost:8080
ARG PUBLIC_OWNER_PUBKEY=
ARG PUBLIC_POW_BITS=18
ARG PUBLIC_ROOM_NS=ncr-blog
ARG PUBLIC_SIGNALS=
ENV SITE_URL=$SITE_URL PUBLIC_OWNER_PUBKEY=$PUBLIC_OWNER_PUBKEY PUBLIC_POW_BITS=$PUBLIC_POW_BITS PUBLIC_ROOM_NS=$PUBLIC_ROOM_NS PUBLIC_SIGNALS=$PUBLIC_SIGNALS
RUN npm run build

# Etap 2: statyka + signaling (server.mjs) i wieczny czytelnik (visitor.mjs) w jednym kontenerze
FROM node:24-slim
COPY shared/ /shared/
WORKDIR /app
COPY peer/package.json peer/package-lock.json ./
RUN npm ci --omit=dev
COPY peer/server.mjs peer/visitor.mjs ./
COPY --from=site /site/dist ./public
ARG PUBLIC_OWNER_PUBKEY=
ARG PUBLIC_POW_BITS=18
ARG PUBLIC_ROOM_NS=ncr-blog
ENV PORT=8080 HOST=0.0.0.0 STATIC_DIR=/app/public DATA_DIR=/data \
    SIGNALS=ws://localhost:8080/signal ROOM_NS=$PUBLIC_ROOM_NS POW_BITS=$PUBLIC_POW_BITS OWNER_PUBKEY=$PUBLIC_OWNER_PUBKEY
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 8080
USER node
CMD ["sh", "-c", "node server.mjs & node visitor.mjs & wait"]
