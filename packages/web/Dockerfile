FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json ./
COPY packages/web/package.json ./packages/web/package.json
RUN bun install

COPY packages/web ./packages/web
WORKDIR /app/packages/web
RUN bun run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/packages/web/dist ./dist

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
