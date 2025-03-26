---
title: About TVApp2
tags:
  - info
---

# About

<figure markdown="span">
    ![Image settings](https://raw.githubusercontent.com/TheBinaryNinja/tvapp2/main/docs/img/screenshots/01.png){ width="100%" }
    <figcaption>TVApp2 Main Interest</figcaption>
</figure>

<br />

<h1 align="center"><b>TVApp2: M3U Playlist & Data Guides</b></h1>

<p align="center" markdown="1">

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Downloads][github-downloads-img]][github-downloads-uri]
[![Size][github-size-img]][github-size-img]
[![Last Commit][github-commit-img]][github-commit-img]
[![Contributors][contribs-all-img]](#contributors-)
<!-- prettier-ignore-end -->

</p>


## What is TVApp2?

**TVApp2** is a docker image which allows you to download M3U playlists and EPG guide data from various online IPTV services such as **TheTVApp**, **TVPass**, and **MoveOnJoy**. The playlist and guide data files can be imported into your favorite IPTV applications such as Jellyfin, Plex, and Emby.

Once the docker container is started; a fresh copy of the channel list and TV guide data will be downloaded and generated within your docker container. You can then visit the website URL associated with your docker container; which will give you direct links to the files that you can utilize with the above listed IPTV apps.

All channels contain multiple sources so that you have a reliable streaming experience, and helps you combat moments when one channel source goes offline.

<br />

---

<br />

## Associated Links

Check out the following websites for additional resources for the TVApp2 docker image below.

```embed
url:            https://github.com/TheBinaryNinja/tvapp2
image:          https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjFUDe-vdiprKpCsiLoRmfCdUq0WS5tqUR9fyEzJjQ0g&s
name:           Github: TVApp2
desc:           Official github repository for the TVApp2 docker container.
favicon:        https://github.com/Aetherinox/mkdocs-link-embeds/assets/118329232/6433449b-2988-4da3-9d43-ff4c992a9fcf
favicon_size:   25
```

<br />

```embed
url:            https://hub.docker.com/repository/docker/thebinaryninja/tvapp2/general
image:          https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRPt5TDzKi3PTTqLCyeXvnJ3Mj2y5speGcrvw&s
name:           Dockerhub: TVApp2
desc:           TVApp2 docker images hosted through Dockerhub.
favicon:        https://github.com/Aetherinox/mkdocs-link-embeds/assets/118329232/6433449b-2988-4da3-9d43-ff4c992a9fcf
favicon_size:   25
```

<br />

```embed
url:            https://git.binaryninja.net/BinaryNinja/
image:          https://avatars.githubusercontent.com/u/200161462?s=400&u=1ce7cfadace57652a2a2f76ef2fd5751fccbbe77&v=4
name:           Gitea: TVApp2
desc:           Official TVApp2 docker image hosted on Gitea.
favicon:        https://github.com/Aetherinox/mkdocs-link-embeds/assets/118329232/6433449b-2988-4da3-9d43-ff4c992a9fcf
favicon_size:   25
```

<br />

---

<br />

## Features

The following is a small list of the features available with the TVApp2 container:

- Multiple IPTV service sources:
    - TheTVApp
    - TVPass
    - MoveOnJoy
- Channel playlists can be downloaded as a `.m38u` or a compressed `.gzip` archive.
    - Compressed gzip compatible with 3rd party apps like Cabernet and Jellyfin.
- Tracking statistics which show the last update time, size, and a description for each file's purpose.
- Direct access to download each of the generated files, including multiple easy-to-remember URLs for each file type.
    - **M3U Playlist**:
        - http://127.0.0.1:4124/playlist
        - http://127.0.0.1:4124/m3u
        - http://127.0.0.1:4124/m38u
    - **EPG Guide Data (Uncompressed)**:
        - http://127.0.0.1:4124/guide
        - http://127.0.0.1:4124/epg
        - http://127.0.0.1:4124/xml
    - **EPG Guide Data (Compressed)**:
        - http://127.0.0.1:4124/gzip
        - http://127.0.0.1:4124/gz
- Video sources include both quality options `hd` and `sd`.
- Easily mountable docker volumes to access the generated files quickly.
- Wide variety of docker environment variables to change the binding IP, port, app root directory, quality, timezone, etc.
- Small docker image size; based on Alpine 3.x which averages `40MB`.
- Compatible with architectures `amd64` and `arm64/aarm64`.
- Example configurations for 3rd party apps such as Traefik and Authentik.

<br />

---

<br />

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- BADGE > GENERAL -->
  [general-npmjs-uri]: https://npmjs.com
  [general-nodejs-uri]: https://nodejs.org
  [general-npmtrends-uri]: http://npmtrends.com/csf-firewall

<!-- BADGE > VERSION > GITHUB -->
  [github-version-img]: https://img.shields.io/github/v/tag/TheBinaryNinja/tvapp2?logo=GitHub&label=Version&color=ba5225
  [github-version-uri]: https://github.com/TheBinaryNinja/tvapp2/releases

<!-- BADGE > LICENSE > MIT -->
  [license-mit-img]: https://img.shields.io/badge/MIT-FFF?logo=creativecommons&logoColor=FFFFFF&label=License&color=9d29a0
  [license-mit-uri]: https://github.com/TheBinaryNinja/tvapp2/blob/main/LICENSE

<!-- BADGE > GITHUB > DOWNLOAD COUNT -->
  [github-downloads-img]: https://img.shields.io/github/downloads/TheBinaryNinja/tvapp2/total?logo=github&logoColor=FFFFFF&label=Downloads&color=376892
  [github-downloads-uri]: https://github.com/TheBinaryNinja/tvapp2/releases

<!-- BADGE > GITHUB > DOWNLOAD SIZE -->
  [github-size-img]: https://img.shields.io/github/repo-size/TheBinaryNinja/tvapp2?logo=github&label=Size&color=59702a
  [github-size-uri]: https://github.com/TheBinaryNinja/tvapp2/releases

<!-- BADGE > ALL CONTRIBUTORS -->
  [contribs-all-img]: https://img.shields.io/github/all-contributors/TheBinaryNinja/tvapp2?logo=contributorcovenant&color=de1f6f&label=contributors
  [contribs-all-uri]: https://github.com/all-contributors/all-contributors

<!-- BADGE > GITHUB > BUILD > NPM -->
  [github-build-img]: https://img.shields.io/github/actions/workflow/status/TheBinaryNinja/tvapp2/npm-release.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-uri]: https://github.com/TheBinaryNinja/tvapp2/actions/workflows/npm-release.yml

<!-- BADGE > GITHUB > BUILD > Pypi -->
  [github-build-pypi-img]: https://img.shields.io/github/actions/workflow/status/TheBinaryNinja/tvapp2/release-pypi.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-pypi-uri]: https://github.com/TheBinaryNinja/tvapp2/actions/workflows/pypi-release.yml

<!-- BADGE > GITHUB > TESTS -->
  [github-tests-img]: https://img.shields.io/github/actions/workflow/status/TheBinaryNinja/tvapp2/npm-tests.yml?logo=github&label=Tests&color=2c6488
  [github-tests-uri]: https://github.com/TheBinaryNinja/tvapp2/actions/workflows/npm-tests.yml

<!-- BADGE > GITHUB > COMMIT -->
  [github-commit-img]: https://img.shields.io/github/last-commit/TheBinaryNinja/tvapp2?logo=conventionalcommits&logoColor=FFFFFF&label=Last%20Commit&color=313131
  [github-commit-uri]: https://github.com/TheBinaryNinja/tvapp2/commits/main/

<!-- BADGE > Github > Docker Image > SELFHOSTED BADGES -->
  [github-docker-version-img]: https://badges-ghcr.onrender.com/thebinaryninja/tvapp2/latest_tag?color=%233d9e18&ignore=development-amd64%2Cdevelopment%2Cdevelopment-arm64%2Clatest&label=version&trim=
  [github-docker-version-uri]: https://github.com/TheBinaryNinja/tvapp2/pkgs/container/tvapp2

<!-- BADGE > Dockerhub > Docker Image -->
  [dockerhub-docker-version-img]: https://img.shields.io/docker/v/thebinaryninja/tvapp2?sort=semver&arch=arm64
  [dockerhub-docker-version-uri]: https://hub.docker.com/repository/docker/thebinaryninja/tvapp2/general

<!-- BADGE > Gitea > Docker Image > SELFHOSTED BADGES -->
  [gitea-docker-version-img]: https://badges-ghcr.onrender.com/thebinaryninja/tvapp2/latest_tag?color=%233d9e18&ignore=latest&label=version&trim=
  [gitea-docker-version-uri]: https://git.binaryninja.net/BinaryNinja/tvapp2

<!-- BADGE > Gitea 2 > Docker Image -->
  [gitea2-docker-version-img]: https://img.shields.io/gitea/v/release/binaryninja/tvapp2?gitea_url=https%3A%2F%2Fgit.binaryninja.net
  [gitea2-docker-version-uri]: https://git.binaryninja.net/BinaryNinja/-/packages/container/tvapp2/latest

<!-- BADGE > BUTTON > SUBMIT ISSUES -->
  [btn-github-submit-img]: https://img.shields.io/badge/submit%20new%20issue-de1f5c?style=for-the-badge&logo=github&logoColor=FFFFFF
  [btn-github-submit-uri]: https://github.com/TheBinaryNinja/tvapp2/issues

<!-- prettier-ignore-end -->
<!-- markdownlint-restore -->
