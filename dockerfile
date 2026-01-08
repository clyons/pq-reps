# ---------- Build stage ----------
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build TypeScript → dist and copy UI assets
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy compiled server + UI assets
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/server.js"]