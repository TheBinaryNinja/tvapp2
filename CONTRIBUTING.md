<div align="center">
<h6>Thank you for your interest in contributing!</h6>
<h1>♾️ Contributing ♾️</h1>

<br />

<!-- prettier-ignore-start -->
[![Version][github-version-img]][github-version-uri]
[![Build Status][github-build-img]][github-build-uri]
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
  - [Commiting](#commiting)
  - [Commenting](#commenting)
  - [Casing](#casing)
  - [Indentation Style](#indentation-style)
  - [Spaces Instead Of Tabs](#spaces-instead-of-tabs)

<br />

---

<br />

## Issues, Bugs, Ideas
Stuff happens, and sometimes as best as we try, there may be issues within this project that we are unaware of. That is the great thing about open-source; anyone can use the program and contribute to making it better.

<br />

If you have found a bug, have an issue, or maybe even a cool idea; you can let us know by [submitting it](https://github.com/aetherinox/thetvapp-docker/issues). However, before you submit your new issue, bug report, or feature request; head over to the [Issues Section](https://github.com/aetherinox/thetvapp-docker/issues) and ensure nobody else has already submitted it.

<br />

Once you are sure that your issue has not already being dealt with; you may submit a new issue at [here](https://github.com/aetherinox/thetvapp-docker/issues/new/choose). You'll be asked to specify exactly what your new submission targets, such as:
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

The source is here for everyone to collectively share and colaborate on. If you think you have a possible solution to a problem; don't be afraid to get your hands dirty.

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
- Include a proper git commit message following the [Conventional Commit Specification](https://www.conventionalcommits.org/en/v1.0.0/#specification).

<br />

If you have completed the above tasks, the pull request is ready to be reviewed and your pull request's label will be changed to "Ready for Review". At this point, a human will need to step in and manually verify your submission.

Reviewers will approve the pull request once they are satisfied with the patch it will be merged.

<br />

### Conventional Commit Specification

When commiting your changes, we require you to follow the [Conventional Commit Specification](https://www.conventionalcommits.org/en/v1.0.0/#specification). The **Conventional Commits** is a specification for the format and content of a commit message. The concept behind Conventional Commits is to provide a rich commit history that can be read and understood by both humans and automated tools. Conventional Commits have the following format:

<br />

```
<type>[(optional <scope>)]: <description>

[optional <body>]

[optional <footer(s)>]
```

<br />

#### Types
| Type | Description |
| --- | --- |
| `feat` | Introduce new feature |
| `fix` | Bug fix |
| `deps` | Add or update existing dependencies |
| `docs` | Change website or markdown documents. Does not mean changes to the documentation generator script itself, only the documents created from the generator. <br/><br/><small>E.g: documentation, readme.md or markdown</small> <br /><br /> |
| `build` | Changes to the build / compilation / packaging process or auxiliary tools such as doc generation<br /><br/><small>E.g: create new build tasks, update release script, etc.</small> |
| `test` | Add or refactor tests, no production code change. Changes the suite of automated tests for the app. |
| `perf` | Performance improvement of algorithms or execution time of the app. Does not change an existing feature. |
| `style` | Update / reformat style of source code. Does not change the way app is implemented. Changes that do not affect the meaning of the code<br /><br/><small>E.g: white-space, formatting, missing semi-colons, change tabs to spaces, etc)</small> |
| `refactor` | Change to production code that leads to no behavior difference,<br/><br/><small>E.g: split files, rename variables, rename package, improve code style, etc.</small> |
| `change` | Change an existing feature. |
| `chore` | Includes technical or preventative maintenance task that is necessary for managing the app or repo, such as updating grunt tasks, but is not tied to any specific feature. Usually done for maintanence purposes.<br/><br/><small>E.g: Edit .gitignore, .prettierrc, .prettierignore, .gitignore, eslint.config.js file</small> |
| `ci` | Changes related to Continuous Integration (usually `yml` and other configuration files). |
| `misc` | Anything that doesn't fit into another commit type. Usually doesn't change production code; yet is not ci, test or chore. |
| `revert` | Revert a previous commit |
| `remove` | Remove a feature from app. Features are usually first deprecated for a period of time before being removed. Removing a feature from the app may be considered a breaking change that will require a major version number increment.|
| `deprecate` | Deprecate existing functionality, but does not remove it from the app.|

<br />

##### Example 1:

```
feat(core): bug affecting menu [#22]
^───^────^  ^────────────────^ ^───^
|   |       |                  |
|   |       |                  └───⫸ (ISSUE):   Reference issue ID
│   │       │
│   │       └───⫸ (DESC):   Summary in present tense. Use lower case not title case!
│   │
│   └───────────⫸ (SCOPE):  The package(s) that this change affects
│
└───────────────⫸ (TYPE):   See list above
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

### Commiting
If you are pushing a commit which addresses a submitted issue, reference your issue at the end of the commit message. You may also optionally add the major issue to the end of your commit body.

References should be on their own line, following the word `Ref` or `Refs`

```
Title:          fix(core): fix error message displayed to users. [#22]
Description:    The description of your commit

                Ref: #22, #34, #37
```

<br />

### Commenting

Comment your code. If someone else comes along, they should be able to do a quick glance and have an idea of what is going on. Plus it helps novice readers to better understand the process.

You may use block style commenting, or single lines:

```bash
# #
#   set perms and import user crontabs
# #

checkown "${cron_user}":"${cron_user}" "/config/crontabs/${cron_user}"
crontab -u "${cron_user}" "/config/crontabs/${cron_user}"
```

<br />

At the top of any new file introduced, please add the following header:

```bash
#!/usr/bin/with-contenv bash
# shellcheck shell=bash

# #
#   @project        thetvapp-docker
#   @about          DESCRIPTION OF WHAT FILE DOES
#   @file           /path/to/file.ext
#   @repo           https://github.com/Aetherinox/thetvapp-docker
# #
```

<br />

### Casing

When calling environment variables, you should use `UPPERCASE`:

```bash
arg_cron=$(echo ${CRON_TIME})
if [ -z "${arg_cron}" ]; then
    arg_cron="0/60 * * * *"
fi
```

<br />

When defining general variables, use `snake_case`

```bash
migrations_dir="/migrations"
migrations_history="/config/.migrations"
```

<br />

### Indentation Style
You should be using the `Allman Style`.  This style puts the brace associated with a control statement on the next line, indented. Statements within the braces are indented to the same level as the braces.

<br />

```javascript
location ~ ^(.+\.php)(.*)$
{
    # enable the next two lines for http auth
    # auth_basic "Restricted";
    # auth_basic_user_file /config/nginx/.htpasswd;

    fastcgi_split_path_info ^(.+\.php)(.*)$;
    if (!-f $document_root$fastcgi_script_name) { return 404; }
    fastcgi_pass 127.0.0.1:9000;
    fastcgi_index index.php;
    include /etc/nginx/fastcgi_params;
}

# deny access to .htaccess/.htpasswd files
location ~ /\.ht
{
    deny all;
}
```

<br />

### Spaces Instead Of Tabs
When writing your code, set your IDE to utilize **spaces**, with a configured size of `4 characters`. If this project utilizes ESLint, you should find the file `.editorconfig` in the root directory of the repo which defines how the file should be formatted. Load that file into programs such as Visual Studio Code.

<br />

<br />

<div align="center">

**[`^        back to top        ^`](#about)**

</div>

<br />
<br />

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- BADGE > GENERAL -->
  [general-npmjs-uri]: https://npmjs.com
  [general-nodejs-uri]: https://nodejs.org
  [general-npmtrends-uri]: http://npmtrends.com/thetvapp-docker

<!-- BADGE > VERSION > GITHUB -->
  [github-version-img]: https://img.shields.io/github/v/tag/Aetherinox/thetvapp-docker?logo=GitHub&label=Version&color=ba5225
  [github-version-uri]: https://github.com/Aetherinox/thetvapp-docker/releases

<!-- BADGE > VERSION > NPMJS -->
  [npm-version-img]: https://img.shields.io/npm/v/thetvapp-docker?logo=npm&label=Version&color=ba5225
  [npm-version-uri]: https://npmjs.com/package/thetvapp-docker

<!-- BADGE > VERSION > PYPI -->
  [pypi-version-img]: https://img.shields.io/pypi/v/thetvapp-docker-plugin
  [pypi-version-uri]: https://pypi.org/project/thetvapp-docker-plugin/

<!-- BADGE > LICENSE > MIT -->
  [license-mit-img]: https://img.shields.io/badge/MIT-FFF?logo=creativecommons&logoColor=FFFFFF&label=License&color=9d29a0
  [license-mit-uri]: https://github.com/Aetherinox/thetvapp-docker/blob/main/LICENSE

<!-- BADGE > GITHUB > DOWNLOAD COUNT -->
  [github-downloads-img]: https://img.shields.io/github/downloads/Aetherinox/thetvapp-docker/total?logo=github&logoColor=FFFFFF&label=Downloads&color=376892
  [github-downloads-uri]: https://github.com/Aetherinox/thetvapp-docker/releases

<!-- BADGE > NPMJS > DOWNLOAD COUNT -->
  [npmjs-downloads-img]: https://img.shields.io/npm/dw/%40aetherinox%2Fmkdocs-link-embeds?logo=npm&&label=Downloads&color=376892
  [npmjs-downloads-uri]: https://npmjs.com/package/thetvapp-docker

<!-- BADGE > GITHUB > DOWNLOAD SIZE -->
  [github-size-img]: https://img.shields.io/github/repo-size/Aetherinox/thetvapp-docker?logo=github&label=Size&color=59702a
  [github-size-uri]: https://github.com/Aetherinox/thetvapp-docker/releases

<!-- BADGE > NPMJS > DOWNLOAD SIZE -->
  [npmjs-size-img]: https://img.shields.io/npm/unpacked-size/thetvapp-docker/latest?logo=npm&label=Size&color=59702a
  [npmjs-size-uri]: https://npmjs.com/package/thetvapp-docker

<!-- BADGE > CODECOV > COVERAGE -->
  [codecov-coverage-img]: https://img.shields.io/codecov/c/github/Aetherinox/thetvapp-docker?token=MPAVASGIOG&logo=codecov&logoColor=FFFFFF&label=Coverage&color=354b9e
  [codecov-coverage-uri]: https://codecov.io/github/Aetherinox/thetvapp-docker

<!-- BADGE > ALL CONTRIBUTORS -->
  [contribs-all-img]: https://img.shields.io/github/all-contributors/Aetherinox/thetvapp-docker?logo=contributorcovenant&color=de1f6f&label=contributors
  [contribs-all-uri]: https://github.com/all-contributors/all-contributors

<!-- BADGE > GITHUB > BUILD > NPM -->
  [github-build-img]: https://img.shields.io/github/actions/workflow/status/Aetherinox/thetvapp-docker/deploy-docker.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-uri]: https://github.com/Aetherinox/thetvapp-docker/actions/workflows/deploy-docker.yml

<!-- BADGE > GITHUB > BUILD > Pypi -->
  [github-build-pypi-img]: https://img.shields.io/github/actions/workflow/status/Aetherinox/thetvapp-docker/release-pypi.yml?logo=github&logoColor=FFFFFF&label=Build&color=%23278b30
  [github-build-pypi-uri]: https://github.com/Aetherinox/thetvapp-docker/actions/workflows/pypi-release.yml

<!-- BADGE > GITHUB > TESTS -->
  [github-tests-img]: https://img.shields.io/github/actions/workflow/status/Aetherinox/thetvapp-docker/npm-tests.yml?logo=github&label=Tests&color=2c6488
  [github-tests-uri]: https://github.com/Aetherinox/thetvapp-docker/actions/workflows/npm-tests.yml

<!-- BADGE > GITHUB > COMMIT -->
  [github-commit-img]: https://img.shields.io/github/last-commit/Aetherinox/thetvapp-docker?logo=conventionalcommits&logoColor=FFFFFF&label=Last%20Commit&color=313131
  [github-commit-uri]: https://github.com/Aetherinox/thetvapp-docker/commits/main/

<!-- BADGE > BUTTON > SUBMIT ISSUES -->
  [btn-github-submit-img]: https://img.shields.io/badge/submit%20new%20issue-de1f5c?style=for-the-badge&logo=github&logoColor=FFFFFF
  [btn-github-submit-uri]: https://github.com/aetherinox/thetvapp-docker/issues

<!-- prettier-ignore-end -->
<!-- markdownlint-restore -->
