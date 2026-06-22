FROM oven/bun:1-alpine

WORKDIR /app
COPY . .
RUN bun install --production --frozen-lockfile
EXPOSE 9000

CMD ["bun", "src/server.ts"]
