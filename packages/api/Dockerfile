FROM oven/bun:1-alpine
WORKDIR /app

COPY package.json ./
COPY packages/api/package.json ./packages/api/package.json
RUN bun install

COPY packages/api ./packages/api
WORKDIR /app/packages/api

EXPOSE 3000
CMD ["sh", "-c", "bun run db:migrate && bun run start"]
