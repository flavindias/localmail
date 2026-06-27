FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN bun install
COPY tsconfig.json ./
COPY src ./src
RUN bun run build

FROM oven/bun:1-alpine
WORKDIR /app
COPY package*.json ./
RUN bun install --production
COPY --from=builder /app/dist ./dist
COPY public ./public
EXPOSE 1025 6245
CMD ["bun", "run", "start"]
