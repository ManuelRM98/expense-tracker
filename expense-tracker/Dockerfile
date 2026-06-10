# Multi-stage build. The final (default) stage serves the built app with nginx
# (DOCKER-03) — the Vite dev server only runs in the `dev` target used by
# docker-compose.yml.
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

# Development: Vite dev server with HMR (used by docker-compose.yml via target: dev)
FROM base AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM base AS build
RUN npm run build

# Production (default when building without --target): static files via nginx
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
