# ---------- build: instala deps, compila TS e o admin, remove devDependencies ----------
FROM node:22-alpine AS build
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git python3
WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# ---------- runtime: imagem enxuta, roda como usuario "node" ----------
FROM node:22-alpine
RUN apk add --no-cache vips-dev
ENV NODE_ENV=production
WORKDIR /opt/app
COPY --chown=node:node --from=build /opt/app ./
USER node
EXPOSE 7870
CMD ["npm", "run", "start"]
