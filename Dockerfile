# Astro SSR (@astrojs/node standalone) — DigitalOcean App Platform / any container host
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/data ./data
COPY --from=build /app/scripts ./scripts
EXPOSE 8080
CMD ["node", "./scripts/node-with-uploads.mjs"]
