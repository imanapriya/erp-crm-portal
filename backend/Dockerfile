# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
# Keeps devDependencies (drizzle-kit) so `drizzle-kit migrate` can run at
# container start. For a leaner production image, run migrations as a
# separate one-off job instead and switch this stage to `npm ci --omit=dev`.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/db/schema.ts ./src/db/schema.ts
COPY --from=build /app/package.json ./package.json

EXPOSE 4000
CMD ["node", "dist/server.js"]
