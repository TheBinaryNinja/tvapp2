<div align="center">
<h6>Contribution Guidelines for BinaryNinja Applications</h6>
<h1>♾️ Contributing ♾️</h1>

<br />

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Downloads][github-downloads-img]][github-downloads-uri]
[![Size][github-size-img]][github-size-img]
[![Last Commit][github-commit-img]][github-commit-img]
[![Contributors][contribs-all-img]](#contributors-)
<!-- prettier-ignore-end -->

</div>

<br />

---

<br />

## About

Below are a list of ways that you can help contribute to this project, as well as policies and guides that explain how to get started.

Please review everything on this page before you submit your contribution.

<br />

---

<br />

- [About](#about)
- [Issues, Bugs, Ideas](#issues-bugs-ideas)
- [Contributing](#contributing)
  - [Before Submitting Pull Requests](#before-submitting-pull-requests)
  - [Conventional Commit Specification](#conventional-commit-specification)
    - [Types](#types)
      - [Example 1:](#example-1)
      - [Example 2:](#example-2)
  - [Committing](#committing)
  - [Languages](#languages)
    - [Python](#python)
      - [Indentation](#indentation)
      - [Line Length](#line-length)
      - [Blank Lines](#blank-lines)
      - [Imports](#imports)
      - [Commenting](#commenting)
      - [Casing](#casing)
    - [NodeJS](#nodejs)
      - [Prettier](#prettier)
      - [ESLint](#eslint)
        - [v9 \& Newer (Config)](#v9--newer-config)
        - [v8 \& Older (Config)](#v8--older-config)
      - [Packages](#packages)
      - [Indentation](#indentation-1)
      - [Style](#style)
      - [Line Length](#line-length-1)
      - [Commenting](#commenting-1)
      - [Casing](#casing-1)

<br />

---

<br />

## Issues, Bugs, Ideas

Stuff happens, and sometimes as best as we try, there may be issues within this project that we are unaware of. That is the great thing about open-source; anyone can use the program and contribute to making it better.

<br />

If you have found a bug, have an issue, or maybe even a cool idea; you can let us know by [submitting it](https://github.com/thebinaryninja/tvapp2/issues). However, before you submit your new issue, bug report, or feature request; head over to the [Issues Section](https://github.com/thebinaryninja/tvapp2/issues) and ensure nobody else has already submitted it.

<br />

Once you are sure that your issue has not already being dealt with; you may submit a new issue at [here](https://github.com/thebinaryninja/tvapp2/issues/new/choose). You'll be asked to specify exactly what your new submission targets, such as:
- Bug report
- Feature Suggestion

<br />

When writing a new submission; ensure you fill out any of the questions asked of you. If you do not provide enough information, we cannot help. Be as detailed as possible, and provide any logs or screenshots you may have to help us better understand what you mean. Failure to fill out the submission properly may result in it being closed without a response.

<br />

If you are submitting a bug report:

- Explain the issue
- Describe how you expect for a feature to work, and what you're seeing instead of what you expected.
- List possible options for a resolution or insight
- Provide screenshots, logs, or anything else that can visually help track down the issue.

<br />

<div align="center">

[![Submit Issue][btn-github-submit-img]][btn-github-submit-uri]

</div>

<br />

<div align="center">

**[`^        back to top        ^`](#about)**

</div>

<br />

---

<br />

## Contributing

If you are looking to contribute to this project by actually submit your own code; please review this section completely. There is important information and policies provided below that you must follow for your pull request to get accepted.

The source is here for everyone to collectively share and collaborate on. If you think you have a possible solution to a problem; don't be afraid to get your hands dirty.

All contributions are made via pull requests. To create a pull request, you need a GitHub account. If you are unclear on this process, see [GitHub's documentation on forking and pull requests](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request-from-a-fork). Pull requests should be targeted at the master branch.

<br />

### Before Submitting Pull Requests

- Follow the repository's code formatting conventions (see below);
- Include tests that prove that the change works as intended and does not add regressions;
- Document the changes in the code and/or the project's documentation;
- Your PR must pass the CI pipeline;
- When submitting your Pull Request, use one of the following branches:
  - For bug fixes: `main` branch
  - For features & functionality: `development` branch
- Include a proper git commit message following the [Conventional Commit Specification](https://conventionalcommits.org/en/v1.0.0/#specification).

<br />

If you have completed the above tasks, the pull request is ready to be reviewed and your pull request's label will be changed to "Ready for Review". At this point, a human will need to step in and manually verify your submission.

Reviewers will approve the pull request once they are satisfied with the patch it will be merged.

<br />

### Conventional Commit Specification

When committing your changes, we require you to follow the [Conventional Commit Specification](https://conventionalcommits.org/en/v1.0.0/#specification). The **Conventional Commits** is a specification for the format and content of a commit message. The concept behind Conventional Commits is to provide a rich commit history that can be read and understood by both humans and automated tools. Conventional Commits have the following format:

<br />

```
<type>[(optional <scope>)]: <description>

[optional <body>]

[optional <footer(s)>]
```

<br />

#### Types

Our repositories make use of the following commit tags:

<br />

| Type | Description |
| --- | --- |
| `feat` | <sup><sub>Introduce new feature</sub></sup> |
| `fix` | <sup><sub>Bug fix</sub></sup> |
| `chore` | <sup><sub>Includes technical or preventative maintenance task that is necessary for managing the app or repo, such as updating grunt tasks, but is not tied to any specific feature. Usually done for maintenance purposes.<br/>E.g: Edit .gitignore, .prettierrc, .prettierignore, .gitignore, eslint.config.js file</sub></sup> |
| `revert` | <sup><sub>Revert a previous commit</sub></sup> |
| `style` | <sup><sub>Update / reformat style of source code. Does not change the way app is implemented. Changes that do not affect the meaning of the code<br />E.g: white-space, formatting, missing semi-colons, change tabs to spaces, etc)</sub></sup> |
| `docs` | <sup><sub>Change website or markdown documents. Does not mean changes to the documentation generator script itself, only the documents created from the generator. <br/>E.g: documentation, readme.md or markdown |
| `build` | <sup><sub>Changes to the build / compilation / packaging process or auxiliary tools such as doc generation<br />E.g: create new build tasks, update release script, etc.</sub></sup> |
| `refactor` | <sup><sub>Change to production code that leads to no behavior difference,<br/>E.g: split files, rename variables, rename package, improve code style, etc.</sub></sup> |
| `test` | <sup><sub>Add or refactor tests, no production code change. Changes the suite of automated tests for the app.</sub></sup> |
| `ci` | <sup><sub>Changes related to Continuous Integration (usually `yml` and other configuration files).</sub></sup> |
| `perf` | <sup><sub>Performance improvement of algorithms or execution time of the app. Does not change an existing feature.</sub></sup> |

<br />

##### Example 1:

```
feat(core): bug affecting menu [#22]
^───^────^  ^────────────────^ ^───^
|   |       |                  |
|   |       |                  └───⫸ (ISSUE):   Reference issue ID
│   │       │
│   │       └──────────────────────⫸ (DESC):   Summary in present tense. Use lower case not title case!
│   │
│   └──────────────────────────────⫸ (SCOPE):  The package(s) that this change affects
│
└──────────────────────────────────⫸ (TYPE):   See list above
```

<br />

##### Example 2:

```
<type>(<scope>): <short summary> [issue]
  |       |             |           |
  |       |             |           └─⫸ Reference issue id (optional)
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: animations|bazel|benchpress|common|compiler|compiler-cli|core|
  │                          elements|forms|http|language-service|localize|platform-browser|
  │                          platform-browser-dynamic|platform-server|router|service-worker|
  │                          upgrade|zone.js|packaging|changelog|docs-infra|migrations|ngcc|ve|
  │                          devtools....
  │
  └─⫸ Commit Type: build|ci|doc|docs|feat|fix|perf|refactor|test
                    website|chore|style|type|revert|deprecate
```

<br />

### Committing

If you are pushing a commit which addresses a submitted issue, reference your issue at the end of the commit message. You may also optionally add the major issue to the end of your commit body.

References should be on their own line, following the word `Ref` or `Refs`

```
Title:          fix(core): fix error message displayed to users. [#22]
Description:    The description of your commit

                Ref: #22, #34, #37
```

<br />
<br />

### Languages

The formatting of code greatly depends on the language being used for this repository. We provide various different languages below as this guide is utilized across multiple repositories.

- [Python](#python)
- [Javascript / Typescript / NodeJS](#nodejs)

<br />
<br />

#### Python

The following guidelines apply to any projects written with Python:

<br />

##### Indentation

Use `4 spaces` per indentation level.

<br />

> [!TIP] Correct
> ```python
> def Encrypt( key : int, bytestr : bytes ):
>     res = b''
>     i_blk, left_bytes = divmod( len(bytestr), 3 )
> ```

<br />

> [!CAUTION] Wrong
> ```python
> def encrypt( key : int, byteStr : bytes ):
>   Res = b''
>   iBlk, leftBytes = divmod( len(byteStr), 3 )
> ```

<br />

##### Line Length

Keep the maximum character count to `100 characters per line`. If you are revising old code which doesn't follow this guideline; please rewrite it to conform.

<br />

##### Blank Lines

Surround top-level functions and class definitions with a blank in-between.

Method definitions inside a class are surrounded by a single blank line.

Extra blank lines may be used (sparingly) to separate groups of functions related to one another. Blank lines may be omitted between a bunch of related one-liners (e.g: set of dummy implementations).

<br />

##### Imports

Imports should usually be on separate lines:

<br />

> [!TIP] Correct
> ```python
> import os
> import sys
> ```

<br />

> [!CAUTION] Wrong
> ```python
> import sys, os
> ```

<br />

The following is ok to do:

<br />

> [!TIP] Correct
> ```python
> from mypkg import siblingA, siblingB, siblingC
> ```

<br />

##### Commenting

Comment your code. It helps novice readers to better understand the process. It doesn't have to be painfully obvious explanations, but it helps to give an idea of what something does.

Please append `#` to the beginning of each line.

```python
# #
#   byteString  :   b'1#Aetherx|232#1#233262#0#0#0#'
# #

def Encrypt( key : int, byteString : bytes ):
    res = bytearray( )
```

<br />

<br />

##### Casing

- Stick to `snake_case`; unless:
  - naming functions, capitalize the first letter
  - Capitalize enums
- If you see code not conforming with this, please revise it in your pull request.

<br />

> [!TIP] Correct
> ```python
> def Encrypt( key : int, bytestr : bytes ):
>     res = b''
>     i_blk, left_bytes = divmod( len(bytestr), 3 )
> ```

<br />

> [!CAUTION] Wrong
> ```python
> def encrypt( key : int, byteStr : bytes ):
>     Res = b''
>     iBlk, leftBytes = divmod( len(byteStr), 3 )
> ```

<br />

<br />

<div align="center">

**[`^        back to top        ^`](#about)**

</div>

<br />

---

<br />

#### NodeJS

The following allows you to configure ESLint and Prettier.

<br />
<br />

##### Prettier

We have opted to make use of [ESLint](#eslint) over Prettier. We provide a detailed ESLint flag config file with very specific linting rules. Please review that section for more information.

<br />
<br />

##### ESLint

Within the root folder of the repo, there are several configuration files which you should be using within the project. These files dictate how prettier and eslint will behave and what is acceptable / not acceptable.

<br />

Pick the config file below depending on which version of ESLint you are using. The v8 and older `.eslint` may not be there if we have migrated over to an Eslint v9 flat config file:

<br />

###### v9 & Newer (Config)

Our NodeJS applications require that you utilize ESLint v9 or newer which makes use of a flat config structure. You may find a copy of our flat config at the link below:

- [📄 eslint.config.mjs](https://github.com/thebinaryninja/tvapp2/blob/main/tvapp2/eslint.config.mjs)

<br />

###### v8 & Older (Config)

- We no longer utilize any version of ESLint older than version 9.

<br />
<br />

> [!NOTE]
> When submitting your pull request, these linting and style rules will be verified with all of your files. If you did not follow these rules; the linter tests on your pull request will fail; and you'll be expected to correct these issues before your submission will be transferred over for human review.

<br />
<br />

##### Packages

We use the following packages for linting and prettier.

<br />

| Package | Repo File | Description |
| --- | --- | --- |
| [@stylistic/eslint-plugin-js](https://npmjs.com/package/@stylistic/eslint-plugin-js) | [package.json](./package.json) | JavaScript stylistic rules for ESLint, migrated from eslint core. |
| [@stylistic/eslint-plugin-ts](https://npmjs.com/package/@stylistic/eslint-plugin-ts) | [package.json](./package.json) | TypeScript stylistic rules for ESLint, migrated from typescript-eslint. |
| [@stylistic/eslint-plugin-plus](https://npmjs.com/package/@stylistic/eslint-plugin-plus) | [package.json](./package.json) | Supplementary rules introduced by ESLint Stylistic. |
| [eslint-plugin-prettier](https://npmjs.com/package/eslint-plugin-prettier) | [package.json](./package.json) | Runs Prettier as an ESLint rule and reports differences as individual ESLint issues. |

<br />

You can add the following to your `package.json` file:

```yml
"devDependencies": {
    "eslint": "9.17.0",
    "eslint-plugin-chai-friendly": "^1.0.1",
    "eslint-plugin-import": "2.31.0",
    "eslint-plugin-n": "17.15.0",
    "eslint-plugin-promise": "7.2.1",
    "@stylistic/eslint-plugin-js": "^3.1.0"
},
```

<br />
<br />

##### Indentation

Use `4 spaces` per indentation level.

<br />
<br />

##### Style

For files that are not controlled by [Prettier](#prettier) or [ESLint](#eslint); use `Allman Style`.  Braces should be on their own lines, and any code inside the braces should be indented 4 spaces.

<br />

```javascript
return {
    status: "failure",
    user:
    {
        id: "1aaa35aa-fb3a-62ae-ffec-a14g7fc401ac",
        label: "Test String",
    }
};

while (x == y)
{
    foo();
    bar();
}
```

<br />
<br />

##### Line Length

Keep the maximum character count to `100 characters per line`. The configs on this page have prettier automatically set up to detect more than 100 characters per line.

<br />

##### Commenting

Comment your code. It helps novice readers to better understand the process. You may use block style commenting, or single lines:

```javascript
/*
    tests to decide if the end-user is running on Darwin or another platform.
*/

test(`Return true if platform is Darwin`, () => {
    process.platform = 'darwin';
    expect(bIsDarwin()).toBe(true);
});

test(`Return false if platform is not Darwin`, () => {
    process.platform = 'linux';
    expect(bIsDarwin()).toBe(false);
});
```

<br />

##### Casing

Stick to `camelCase` as much as possible. 

```javascript
let myVar = 'one';
let secondVar = 'two';
```

<br />

If you are defining a new environment variable; it must be in ALL CAPS in the `Dockerfile`:

```dockerfile
ENV DIR_BUILD=/usr/src/app
ENV DIR_RUN=/usr/bin/app
ENV URL_REPO="https://git.binaryninja.net/binaryninja/"
ENV WEB_IP="0.0.0.0"
ENV WEB_PORT=4124
ENV STREAM_QUALITY="hd"
ENV FILE_PLAYLIST="playlist.m3u8"
ENV FILE_EPG="xmltv.xml"
ENV LOG_LEVEL=4
ENV TZ="Etc/UTC"
```

<br />

Then you may call your new environment variable within the Javascript code; and ensure you define a default value to correct any user misconfigurations:

```javascript
const envUrlRepo = process.env.URL_REPO || 'https://git.binaryninja.net/binaryninja';
const envStreamQuality = process.env.STREAM_QUALITY || 'hd';
const envFileM3U = process.env.FILE_PLAYLIST || 'playlist.m3u8';
const envFileXML = process.env.FILE_EPG || 'xmltv.xml';
const envFileTAR = process.env.FILE_TAR || 'xmltv.xml.gz';
```

<br />
<br />

<div align="center">

**[`^        back to top        ^`](#about)**

</div>

<br />
<br />

<br />
<br />

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- BADGE > GENERAL -->
  [general-npmjs-uri]: https://npmjs.com
  [general-nodejs-uri]: https://nodejs.org
  [general-npmtrends-uri]: http://npmtrends.com/tvapp2

<!-- BADGE > VERSION > GITHUB -->
  [github-version-img]: https://img.shields.io/github/v/tag/thebinaryninja/tvapp2?logo=GitHub&label=Version&color=ba5225
  [github-version-uri]: https://github.com/thebinaryninja/tvapp2/releases

<!-- BADGE > LICENSE > MIT -->
  [license-mit-img]: https://img.shields.io/badge/MIT-FFF?logo=creativecommons&logoColor=FFFFFF&label=License&color=9d29a0
  [license-mit-uri]: https://github.com/thebinaryninja/tvapp2/blob/main/LICENSE

<!-- BADGE > GITHUB > DOWNLOAD COUNT -->
  [github-downloads-img]: https://img.shields.io/github/downloads/thebinaryninja/tvapp2/total?logo=github&logoColor=FFFFFF&label=Downloads&color=376892
  [github-downloads-uri]: https://github.com/thebinaryninja/tvapp2/releases

<!-- BADGE > GITHUB > DOWNLOAD SIZE -->
  [github-size-img]: https://img.shields.io/github/repo-size/thebinaryninja/tvapp2?logo=github&label=Size&color=59702a
  [github-size-uri]: https://github.com/thebinaryninja/tvapp2/releases

<!-- BADGE > ALL CONTRIBUTORS -->
  [contribs-all-img]: https://img.shields.io/github/all-contributors/thebinaryninja/tvapp2?logo=contributorcovenant&color=de1f6f&label=contributors
  [contribs-all-uri]: https://github.com/all-contributors/all-contributors

<!-- BADGE > GITHUB > BUILD > NPM -->
  [github-build-img]: https://img.shields.io/github/actions/workflow/status/thebinaryninja/tvapp2/npm-release.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-uri]: https://github.com/thebinaryninja/tvapp2/actions/workflows/npm-release.yml

<!-- BADGE > GITHUB > BUILD > Pypi -->
  [github-build-pypi-img]: https://img.shields.io/github/actions/workflow/status/thebinaryninja/tvapp2/release-pypi.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-pypi-uri]: https://github.com/thebinaryninja/tvapp2/actions/workflows/pypi-release.yml

<!-- BADGE > GITHUB > TESTS -->
  [github-tests-img]: https://img.shields.io/github/actions/workflow/status/thebinaryninja/tvapp2/npm-tests.yml?logo=github&label=Tests&color=2c6488
  [github-tests-uri]: https://github.com/thebinaryninja/tvapp2/actions/workflows/npm-tests.yml

<!-- BADGE > GITHUB > COMMIT -->
  [github-commit-img]: https://img.shields.io/github/last-commit/thebinaryninja/tvapp2?logo=conventionalcommits&logoColor=FFFFFF&label=Last%20Commit&color=313131
  [github-commit-uri]: https://github.com/thebinaryninja/tvapp2/commits/main/

<!-- BADGE > Github > Docker Image > SELFHOSTED BADGES -->
  [github-docker-version-img]: https://badges-ghcr.onrender.com/thebinaryninja/tvapp2/latest_tag?color=%233d9e18&ignore=development-amd64%2Cdevelopment%2Cdevelopment-arm64%2Clatest&label=version&trim=
  [github-docker-version-uri]: https://github.com/thebinaryninja/tvapp2/pkgs/container/tvapp2

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
  [btn-github-submit-uri]: https://github.com/thebinaryninja/tvapp2/issues

<!-- prettier-ignore-end -->
<!-- markdownlint-restore -->
