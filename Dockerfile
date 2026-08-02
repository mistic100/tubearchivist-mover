FROM oven/bun:1-alpine

ARG APP_VERSION

WORKDIR /app

RUN apk --no-cache add ffmpeg=~6.1.2
COPY . .
RUN bun install --production --frozen-lockfile
RUN sed -i "s/\"version\": \".*\"/\"version\": \"${APP_VERSION}\"/g" package.json

EXPOSE 9000

HEALTHCHECK --interval=60s --timeout=5s --start-period=10s \
  CMD wget --quiet --spider http://localhost:9000

ENV NODE_ENV=production

CMD ["bun", "server/index.ts"]
