---
title: Changelog
tags:
  - changelog
---

# Changelog

This section outlines all releases of TVApp2, including the version of the release, and the changes made for that release.

<br />

<p align="center" markdown="1">

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Downloads][github-downloads-img]][github-downloads-uri]
[![Size][github-size-img]][github-size-img]
[![Last Commit][github-commit-img]][github-commit-img]
[![Contributors][contribs-all-img]](#contributors)
<!-- prettier-ignore-end -->

</p>

<br />

---

<br />

### <!-- md:version stable- --> 1.1.0 <small>Mar 25, 2025</small> { id="1.1.0" }

- `feat`: new interface & theme for web ui
    - integrated bootstrap 4.x
    - new dark theme
    - all hosted files now display `date`, `download url`, `size`, and `description`
    - automatic viewport resizing depending on the device used
    - new favicon
    - localized css, js, and image support instead of relying on externally hosted resources
- `feat`: app now offers a compressed `gzip` for EPG guide data
- `feat`: add multiple url paths to download each asset
    - `/guide`, `/epg`, `xml`
    - `/playlist`, `/m3u`, `/m3u8`
    - `/gzip`, `/gz`
- `feat`: add mew environment variables
    - `LOG_LEVEL`: specifies what level of logs you will see in console
    - `STREAM_QUALITY`: specifies the quality of the stream; options: `hd` and `sd`
    - `FILE_PLAYLIST`: filename that M3U playlist data will be stored to
    - `FILE_EPG`: filename that EPG / XML guide data will be stored to
    - `FILE_GZIP`: filename that compressed gzip guide data will be stored to
- `build`: app migrated from CommonJS to ES Modules
- `build`: bump alpine base image from v3.20 to v3.21
- `build`: migrated html template to independent file in `www` folder; utilizes `ejs` module
- `build`: **amd64** and **arm64** docker images merged into one image with architecture support
- `fix`: resolved bug where local server could not be started using nodejs; related to ip address variable
- `build(deps)`: add package `ejs` 3.1.10
- `build(deps)`: add package `chalk` 5.3.0
- `build(deps)`: add package `moment` 2.30.1
- `build(deps-dev)`: add package `eslint` 9.17.0
- `build(deps-dev)`: add package `eslint-plugin-chai-friendly` 1.0.1
- `build(deps-dev)`: add package `eslint-plugin-import` 2.31.0
- `build(deps-dev)`: add package `eslint-plugin-n` 17.15.0
- `build(deps-dev)`: add package `eslint-plugin-promise` 7.2.1
- `build(deps-dev)`: add package `@stylistic/eslint-plugin-js` 3.1.0
- `remove`: tvapp2.fonts.min.js

<br />

### <!-- md:version stable- --> 1.0.0 <small>Feb 24, 2025</small> { id="1.0.0" }

- Initial release

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
