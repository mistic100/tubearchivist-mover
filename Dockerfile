FROM oven/bun:1-alpine

ARG APP_VERSION

WORKDIR /app

RUN apk --no-cache add ffmpeg 
COPY . .
RUN bun install --production --frozen-lockfile
RUN sed -i "s/\"version\": \".*\"/\"version\": \"${APP_VERSION}\"/g" package.json

EXPOSE 9000

ENV NODE_ENV=production

CMD ["bun", "server/index.ts"]
