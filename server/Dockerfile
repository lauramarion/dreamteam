# Dream Team backend: PocketBase with this repo's schema and hooks baked in.
#
# PocketBase is pre-1.0, so the version is pinned on purpose.
# To upgrade: read https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md,
# take a backup, change PB_VERSION below, rebuild (see server/README.md).

FROM alpine:3.24

ARG PB_VERSION=0.40.6
# Filled in by Docker with the server's CPU type (amd64 or arm64)
ARG TARGETARCH

RUN apk add --no-cache ca-certificates unzip wget tzdata \
 && wget -q -O /tmp/pb.zip \
    "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH:-amd64}.zip" \
 && unzip -q /tmp/pb.zip pocketbase -d /pb \
 && rm /tmp/pb.zip \
 && apk del unzip

COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks

# Database and uploaded files live here; mounted as a volume so they survive rebuilds
VOLUME /pb/pb_data

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q -O /dev/null http://127.0.0.1:8090/api/health || exit 1

CMD ["/pb/pocketbase", "serve", \
     "--http=0.0.0.0:8090", \
     "--dir=/pb/pb_data", \
     "--migrationsDir=/pb/pb_migrations", \
     "--hooksDir=/pb/pb_hooks", \
     "--publicDir=/pb/pb_public"]
