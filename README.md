# TubeArchivist Mover

A collection of tools to move, rename, import videos in your [TubeArchivist](https://www.tubearchivist.com/) instance.

> [!CAUTION]
> This tool moves files and edits your TubeArchivist index directly.
> Use at your own risk and always have backups.

> [!IMPORTANT]
> It is strongly recommended to disable the "Refresh Metadata" schedule in TA.

![](./screenshot.png)

## Features

- Move a single video to another channel
- Move all videos from a channel to another
- Manually import additional videos
- Rename a channel
- Integrity checks

## Environment variables

| Variable           | Required | Default     | Description                         |
| ------------------ | -------- | ----------- | ----------------------------------- |
| `PORT`             | no       | `9000`      | HTTP port the server listens on.    |
| `DATA_DIR`         | no       | `/youtube`  | Root of the TA media volume.        |
| `CACHE_DIR`        | no       | `/cache`    | Root of the TA cache volume.        |
| `TA_HOST`          | **yes**  |             | HTTP host of TubeArchivist.         |
| `API_TOKEN`        | **yes**  |             | API token of TubeArchivist.         |
| `ES_URL`           | **yes**  | —           | Base URL of Elasticsearch.          |
| `ELASTIC_USER`     | no       | `elastic`   | Elasticsearch username.             |
| `ELASTIC_PASSWORD` | **yes**  | —           | Elasticsearch password.             |

## Running locally

Copy and complete `.env.example` into `.env`.

```sh
bun install
bun start
```

Then open <http://localhost:9000>.

## Running with Docker

Run tubearchivist-mover, sharing TubeArchivist's volumes and joining its network so the
container can reach Elasticsearch by service name:

```sh
docker run -d \
  --name tubearchivist-mover \
  --network tubearchivist_default \
  -p 9000:9000 \
  -e TA_HOST=http://tubearchist:8000 \
  -e API_TOKEN=verysecret \
  -e ES_URL=http://tubearchivist-es:9200 \
  -e ELASTIC_PASSWORD=verysecret \
  -v tubearchivist_media:/youtube \
  -v tubearchivist_cache:/cache \
  ghcr.io/mistic100/tubearchivist-mover:latest
```

Adjust the network, volumes names and environment variables to match your TubeArchivist deployment.

## Add to your compose stack

```yaml
services:
  tubearchivist:
    ...
  tubearchivist-es:
    ...

  tubearchivist-mover:
    image: ghcr.io/mistic100/tubearchivist-mover:latest
    container_name: tubearchivist-mover
    env_file: .env # contains ELASTIC_PASSWORD and API_TOKEN
    environment:
      TA_HOST: http://tubearchist:8000
      ES_URL: http://tubearchivist-es:9200
    ports:
      - '9000:9000'
    volumes:
      - media:/youtube
      - cache:/cache
    depends_on:
      tubearchivist-es:
        condition: service_healthy
```

## Security note

The app ships **no authentication**. It is intended to run on a trusted network
alongside your TubeArchivist stack. Do not expose it to the public internet.

## AI Involvement

This application has been bootstraped with Claude Opus 4.8 with carefull review by a human,
and further addition has been done by me.
