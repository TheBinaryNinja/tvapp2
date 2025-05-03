# syntax=docker/dockerfile:1

# #
#   @project        TVApp2
#   @usage          docker image which allows you to download a m3u playlist and EPG guide data from
#                   multiple IPTV services.
#   @file           Dockerfile
#   @repo           https://github.com/TheBinaryNinja/tvapp2
#                   https://git.binaryninja.net/BinaryNinja/tvapp2
#                   https://github.com/aetherinox/docker-base-alpine
#
#   build your own image by running
#       amd64                   docker build --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 -t tvapp2:latest -t tvapp2:1.5.0 -t tvapp2:1.5.0-amd64 -f Dockerfile .
#       arm64                   docker build --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 -t tvapp2:1.5.0-arm64 -f Dockerfile.aarch64 .
#
#   OR; build using `docker buildx`
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64                   docker buildx build --build-arg ARCH=amd64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=stable --tag ghcr.io/thebinaryninja/tvapp2:1.5.0-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64                   docker buildx build --build-arg ARCH=arm64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=stable --tag ghcr.io/thebinaryninja/tvapp2:1.5.0-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#
#   OR; build single amd64 image
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64                   docker buildx build --build-arg ARCH=amd64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=stable --tag ghcr.io/thebinaryninja/tvapp2:1.5.0 --tag ghcr.io/thebinaryninja/tvapp2:1.5 --tag ghcr.io/thebinaryninja/tvapp2:1 --tag ghcr.io/thebinaryninja/tvapp2:latest --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --push .
#
#   OR; build official image (publish)
#       create                  docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64-stable            docker buildx build --build-arg ARCH=amd64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=stable --tag ghcr.io/thebinaryninja/tvapp2:1.5.0-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64-stable            docker buildx build --build-arg ARCH=arm64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=stable --tag ghcr.io/thebinaryninja/tvapp2:1.5.0-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       amd64-dev               docker buildx build --build-arg ARCH=amd64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=development --tag ghcr.io/thebinaryninja/tvapp2:development-amd64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/amd64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       arm64-dev               docker buildx build --build-arg ARCH=arm64 --build-arg VERSION=1.5.0 --build-arg BUILDDATE=20260812 --build-arg RELEASE=development --tag ghcr.io/thebinaryninja/tvapp2:development-arm64 --attest type=provenance,disabled=true --attest type=sbom,disabled=true --file Dockerfile --platform linux/arm64 --output type=docker --allow network.host --network host --no-cache --pull --push .
#       amd64-stable-hash       docker buildx imagetools inspect ghcr.io/thebinaryninja/tvapp2:1.5.0-amd64
#       arm64-stable-hash       docker buildx imagetools inspect ghcr.io/thebinaryninja/tvapp2:1.5.0-arm64
#       amd64-dev-hash          docker buildx imagetools inspect ghcr.io/thebinaryninja/tvapp2:development-amd64
#       arm64-dev-hash          docker buildx imagetools inspect ghcr.io/thebinaryninja/tvapp2:development-arm64
#       merge-stable            docker buildx imagetools create --tag ghcr.io/thebinaryninja/tvapp2:1.5.0 --tag ghcr.io/thebinaryninja/tvapp2:1.5 --tag ghcr.io/thebinaryninja/tvapp2:1 --tag ghcr.io/thebinaryninja/tvapp2:latest sha256:0abe1b1c119959b3b1ccc23c56a7ee2c4c908c6aaef290d4ab2993859d807a3b sha256:e68b9de8669eac64d4e4d2a8343c56705e05e9a907cf0b542343f9b536d9c473
#       merge-dev               docker buildx imagetools create --tag ghcr.io/thebinaryninja/tvapp2:development sha256:8f36385a28c8f6eb7394d903c9a7a2765b06f94266b32628389ee9e3e3d7e69d sha256:c719ccb034946e3f0625003f25026d001768794e38a1ba8aafc9146291d548c5
# #

# #
#   FROM
#   any args defined before FROM cannot be called after FROM and the ARE is classified outside the build process.
#   You will have to re-define the arg after FROM to utilize it anywhere else in the build process.
#
#   @ref            https://docs.docker.com/reference/dockerfile/#understand-how-arg-and-from-interact
# #

ARG ARCH=amd64
ARG ALPINE_VERSION=3.21
FROM --platform=linux/${ARCH} ghcr.io/aetherinox/alpine-base:${ALPINE_VERSION}

# #
#   Set Args
# #

ARG ARCH=amd64
ARG ALPINE_VERSION=3.21
ARG BUILDDATE
ARG VERSION
ARG RELEASE

# #
#   Set Labels
# #

LABEL org.opencontainers.image.authors="Aetherinox, iFlip721, Optx"
LABEL org.opencontainers.image.vendor="BinaryNinja"
LABEL org.opencontainers.image.title="TVApp2"
LABEL org.opencontainers.image.description="Automatic m3u and xml guide updater for TheTvApp, TVPass, and MoveOnJoy utilized within your IPTV client."
LABEL org.opencontainers.image.source="https://github.com/thebinaryninja/tvapp2"
LABEL org.opencontainers.image.repo.1="https://github.com/thebinaryninja/tvapp2"
LABEL org.opencontainers.image.repo.2="https://git.binaryninja.net/binaryninja/tvapp2"
LABEL org.opencontainers.image.repo.3="https://github.com/aetherinox/docker-base-alpine"
LABEL org.opencontainers.image.documentation="https://thebinaryninja.github.io/tvapp2"
LABEL org.opencontainers.image.url="https://github.com/thebinaryninja/tvapp2/pkgs/container/tvapp2"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.architecture="${ARCH}"
LABEL org.opencontainers.image.ref.name="main"
LABEL org.opencontainers.image.registry="local"
LABEL org.opencontainers.image.release="${RELEASE}"
LABEL org.tvapp2.image.maintainers="Aetherinox, iFlip721, Optx"
LABEL org.tvapp2.image.build-version="Version:- ${VERSION} Date:- ${BUILDDATE}"
LABEL org.tvapp2.image.build-version-alpine="${ALPINE_VERSION}"
LABEL org.tvapp2.image.build-architecture="${ARCH}"
LABEL org.tvapp2.image.build-release="${RELEASE}"

# #
#   Set Env Var
# #

ENV NODE_VERSION=22.8.0
ENV YARN_VERSION=1.22.22
ENV RELEASE="${RELEASE}"
ENV DIR_BUILD=/usr/src/app
ENV DIR_RUN=/usr/bin/app
ENV URL_REPO="https://git.binaryninja.net/binaryninja/"
ENV WEB_IP="0.0.0.0"
ENV WEB_PORT=4124
ENV WEB_ENCODING="deflate, br"
ENV WEB_PROXY_HEADER="x-forwarded-for"
ENV STREAM_QUALITY="hd"
ENV FILE_URL="urls.txt"
ENV FILE_M3U="playlist.m3u8"
ENV FILE_EPG="xmltv.xml"
ENV FILE_TAR="xmltv.xml.gz"
ENV HEALTH_TIMER=600000
ENV LOG_LEVEL=4
ENV TZ="Etc/UTC"

# #
#   Install
# #

RUN \
    apk add --no-cache \
        wget \
        curl \
        bash \
        nano \
        npm \
        openssl

# #
#   Copy docker-entrypoint
# #

COPY docker-entrypoint.sh /usr/local/bin/

# #
#   copy s6-overlays root to image root
# #

COPY root/ /

# #
#   set work directory
# #

WORKDIR ${DIR_BUILD}

# #
#   copy tvapp2 project to workdir
# #

COPY tvapp2/ ./

# #
#   set work dir to built app
# #

WORKDIR ${DIR_RUN}

# #
#   Ports and volumes
# #

EXPOSE ${WEB_PORT}/tcp

# #
#   In case user sets up the cron for a longer duration, do a first run
#   and then keep the container running. Hacky, but whatever.
# #

ENTRYPOINT ["/init"]
