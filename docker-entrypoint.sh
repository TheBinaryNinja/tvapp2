#!/bin/sh

# #
#   @project        TVApp2
#   @usage          docker image which allows you to download a m3u playlist and EPG guide data from
#                   multiple IPTV services.
#   @file           Dockerfile
#   @repo           https://github.com/iFlip721/tvapp2
#                   https://github.com/aetherinox/tvapp2
#                   https://github.com/aetherinox/docker-base-alpine
#                   https://git.binaryninja.net/pub_projects/tvapp2
#
#   you can build your own image by running
#       amd64       docker build --build-arg VERSION=1.0.0 --build-arg BUILDDATE=20250218 -t tvapp2:latest -t tvapp2:1.0.0 -t tvapp2:1.0.0-amd64 -f Dockerfile .
#       arm64       docker build --build-arg VERSION=1.0.0 --build-arg BUILDDATE=20250218 -t tvapp2:1.0.0-arm64 -f Dockerfile.aarch64 .
#
#   if you prefer to use `docker buildx`
#       create      docker buildx create --driver docker-container --name container --bootstrap --use
#       amd64       docker buildx build --no-cache --pull --build-arg VERSION=1.0.0 --build-arg BUILDDATE=20250218 -t tvapp2:latest -t tvapp2:1.0.0 --platform=linux/amd64 --output type=docker --output type=docker .
#       arm64       docker buildx build --no-cache --pull --build-arg VERSION=1.0.0 --build-arg BUILDDATE=20250218 -t tvapp2:latest -t tvapp2:1.0.0 --platform=linux/arm64 --output type=docker --output type=docker .
# #

set -e

# Run command with node if the first argument contains a "-" or is not a system command. The last
# part inside the "{}" is a workaround for the following bug in ash/dash:
# https://bugs.debian.org/cgi-bin/bugreport.cgi?bug=874264
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ] || { [ -f "${1}" ] && ! [ -x "${1}" ]; }; then
  set -- node "$@"
fi

exec "$@"
