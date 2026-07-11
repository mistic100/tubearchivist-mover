FROM oven/bun:1-alpine

RUN apk --no-cache add ffmpeg 

WORKDIR /app
COPY . .
RUN bun install --production --frozen-lockfile
EXPOSE 9000

CMD ["bun", "src/server.ts"]
