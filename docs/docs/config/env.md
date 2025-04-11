---
title: Environment Variables
tags:
  - config
---

# Environment Variables

Environment variables allow you to modify how TVApp2 functions within a docker container. Ensure that
you understand the setting you are changing before you modify these values, otherwise, TVApp2 may fail to
start due to misconfigurations.

<br />

## TZ
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `Etc/UTC` -->

The `TZ` environment variable specifies the timezone that your docker container will
utilize. This is useful for syncing your local time with console outputs such as
our logging system.

=== "Example"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - /etc/timezone:/etc/timezone:ro
                - /etc/localtime:/etc/localtime:ro
                - /var/run/docker.sock:/var/run/docker.sock
                - ./config:/config
                - ./app:/usr/bin/app
            environment:
                - TZ=Etc/UTC # (1)
    ```

    1.  :information: Changing this env variable will change the time for anything
        related to the TVApp2 docker container.

=== "Timezones"

    ``` yaml
      Etc/UTC
      Africa/Cairo
      Africa/Johannesburg
      Africa/Lagos
      America/Argentina/Buenos_Aires
      America/Bogota
      America/Caracas
      America/Chicago
      America/El_Salvador
      America/Juneau
      America/Lima
      America/Los_Angeles
      America/Mexico_City
      America/New_York
      America/Phoenix
      America/Santiago
      America/Sao_Paulo
      America/Toronto
      America/Vancouver
      Asia/Almaty
      Asia/Ashkhabad
      Asia/Bahrain
      Asia/Bangkok
      Asia/Chongqing
      Asia/Dubai
      Asia/Ho_Chi_Minh
      Asia/Hong_Kong
      Asia/Jakarta
      Asia/Jerusalem
      Asia/Kathmandu
      Asia/Kolkata
      Asia/Kuwait
      Asia/Muscat
      Asia/Qatar
      Asia/Riyadh
      Asia/Seoul
      Asia/Shanghai
      Asia/Singapore
      Asia/Taipei
      Asia/Tehran
      Asia/Tokyo
      Atlantic/Reykjavik
      Australia/ACT
      Australia/Adelaide
      Australia/Brisbane
      Australia/Sydney
      Europe/Athens
      Europe/Belgrade
      Europe/Berlin
      Europe/Copenhagen
      Europe/Helsinki
      Europe/Istanbul
      Europe/London
      Europe/Luxembourg
      Europe/Madrid
      Europe/Moscow
      Europe/Paris
      Europe/Riga
      Europe/Rome
      Europe/Stockholm
      Europe/Tallinn
      Europe/Vilnius
      Europe/Warsaw
      Europe/Zurich
      Pacific/Auckland
      Pacific/Chatham
      Pacific/Fakaofo
      Pacific/Honolulu
      Pacific/Norfolk
      US/Mountain
    ```

<br />

## WEB_IP
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `0.0.0.0` -->

The `WEB_IP` environment variable allows you to define what IP address will be
bound to the TVApp2 docker image.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - WEB_IP=0.0.0.0 # (1)
```

1.  :information: Specify `0.0.0.0` to bind to all local IP addresses.

<br />

## WEB_PORT
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `4124` -->

The `WEB_PORT` environment variable allows you to define what port the TVApp2
docker container will listen to.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - WEB_IP=4124 # (1)
```

1.  :information: The default port is `4124`

<br />

## WEB_ENCODING
<!-- md:control env -->
<!-- md:version stable-1.3.0 -->
<!-- md:default `deflate, br` -->

The `WEB_ENCODING` environment variable allows you to customize the HTTP `Accept-Encoding` request and response header. This value specifies what content encoding the sender can understand when sending these requests.

Most users will not need to modify this value unless you are running Jellyfin and receive the following error when attempting to sync EPG data between Jellyfin and the TVApp2 container:

!!! warning "Jellyfin  Error"

    ```
    [ERR] [27] Jellyfin.LiveTv.Guide.GuideManager: Error getting programs for channel 
    XXXXXXXXXXXXXXX (Source 2) System.Xml.XmlException: '', hexadecimal value 0x1F, 
    is an invalid character. Line 1, position 1.
    ```

If you receive the above error and you have already customized this environment variable to include `gzip`, you must remove it from your accepted encoders string to fix the error.

=== "Old"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - /etc/timezone:/etc/timezone:ro
                - /etc/localtime:/etc/localtime:ro
                - /var/run/docker.sock:/var/run/docker.sock
                - ./config:/config
                - ./app:/usr/bin/app
            environment:
                - WEB_ENCODING: 'gzip, deflate, br'
    ```

=== "New"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - /etc/timezone:/etc/timezone:ro
                - /etc/localtime:/etc/localtime:ro
                - /var/run/docker.sock:/var/run/docker.sock
                - ./config:/config
                - ./app:/usr/bin/app
            environment:
                - WEB_ENCODING: 'deflate, br'
    ```

<br />

## URL_REPO
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `https://git.binaryninja.net/binaryninja` -->
<!-- md:flag dangerous -->

The `URL_REPO` environment variable allows you to specify what Github repo is used to communicate 
with in order to fetch IPTV data. This is used as an internal environment variable by the developers 
and should not be changed by the end-user; otherwise you will be unable to fetch IPTV data.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - URL_REPO=https://git.binaryninja.net/binaryninja # (1)
```

1.  :warning: It is highly recommended that you do not change this value
    otherwise you will not be able to download the latest M3U playlists
    and EPG guide data.

<br />

## FILE_URL
<!-- md:control env -->
<!-- md:version stable-1.2.0 -->
<!-- md:default `urls.txt` -->

The `FILE_URL` environment variable allows you to specify what the name of the downloaded `urls.txt` cache file. This file is downloaded when you first spin up the TVApp2 container.

There should be no need to utilize this environment variable unless you have a specific reason.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - FILE_URL=urls.txt # (1)
```

1.  :warning: There is really no reason to modify this environment variable
    unless you have a specific purpose.

<br />

## FILE_M3U
<!-- md:control env -->
<!-- md:version stable-1.1.0 -->
<!-- md:default `playlist.m3u8` -->

The `FILE_M3U` environment variable allows you to specify what the name of the downloaded `playlist.m3u8` file will be. This file is downloaded when you first spin up the TVApp2 container, and contains a list of what channels you can pick from.

There should be no need to utilize this environment variable unless you have a specific reason.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - FILE_M3U=playlist.m3u8 # (1)
```

1.  :warning: There is really no reason to modify this environment variable
    unless you have a specific purpose.


<br />

## FILE_EPG
<!-- md:control env -->
<!-- md:version stable-1.1.0 -->
<!-- md:default `xmltv.xml` -->

The `FILE_EPG` environment variable specifies the filename that will be utilized when
your .xml EPG playlist file is generated.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - FILE_EPG=xmltv.xml # (1)
```

1.  :information: Changing this file only changes the filename locally; it does
    not affect the server-side fetching mechanism.

<br />

## FILE_GZIP
<!-- md:control env -->
<!-- md:version stable-1.1.0 -->
<!-- md:default `xmltv.xml.gz` -->

The `FILE_GZIP` environment variable specifies the filename that will be utilized when
a compressed `.gzip` is generated and when you download the file.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - FILE_GZIP=xmltv.xml.gz # (1)
```

1.  :information: Changing this file only changes the filename locally for
    generation and downloading. It does not affect the server-side fetching
    mechanism.

<br />

## STREAM_QUALITY
<!-- md:control env -->
<!-- md:version stable-1.1.0 -->
<!-- md:default `hd` -->

The `STREAM_QUALITY` environment variable specifies the default stream quality that will 
be used when you initiate a new channel to view.

Available Options:

  * `hd` High Definition
  * `sd` Standard Definition

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - STREAM_QUALITY=hd # (1)
```

1.  :information: This environment variable has the following options:
    - hd
    - sd

<br />

## DIR_BUILD
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `/usr/src/app` -->
<!-- md:flag dangerous -->

The `DIR_BUILD` environment variable specifies what local folder will be utilized
by the TVApp2 docker container when the container builds the app.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - DIR_BUILD=/usr/src/app # (1)
```

1.  :warning: You should not change this unless you are an advanced user.

<br />

## DIR_RUN
<!-- md:control env -->
<!-- md:version stable-1.0.0 -->
<!-- md:default `/usr/src/app` -->
<!-- md:flag dangerous -->

The `DIR_RUN` environment variable specifies what local folder will be utilized
by the TVApp2 docker container when the container has built the app and placed it
into a production folder.

``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
services:
    tvapp2:
        container_name: tvapp2
        image: ghcr.io/thebinaryninja/tvapp2:latest
        restart: unless-stopped
        volumes:
            - /etc/timezone:/etc/timezone:ro
            - /etc/localtime:/etc/localtime:ro
            - /var/run/docker.sock:/var/run/docker.sock
            - ./config:/config
            - ./app:/usr/bin/app
        environment:
            - DIR_RUN=/usr/bin/app # (1)
```

1.  :warning: You should not change this unless you are an advanced user.

<br />

## LOG_LEVEL
<!-- md:control env -->
<!-- md:version stable-1.1.0 -->
<!-- md:default `4` -->

The `LOG_LEVEL` environment variable allows you specify how deep logs should go
when being output to your console.

=== "Example"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="13" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - /etc/timezone:/etc/timezone:ro
                - /etc/localtime:/etc/localtime:ro
                - /var/run/docker.sock:/var/run/docker.sock
                - ./config:/config
                - ./app:/usr/bin/app
            environment:
                - LOG_LEVEL=4 # (1)
    ```

    1.  :information: The default log level is `4` (info).

=== "Log Levels"

    | Log Level       | Name        | Description                                                                     |
    | --------------- | ----------- | ------------------------------------------------------------------------------- |
    | `6`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-trace-color) " } Trace       | Displays all possible logs in console, along with anything below this line.     |
    | `5`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-debug-color) " } Debug       | Displays debug / developer logs, along with anything below this line.           |
    | `4`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-info-color) " } Info        | Displays informative logs, along with anything below this line.                 |
    | `3`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-notice-color) " } Notice      | Displays important notices, along with anything below this line.                |
    | `2`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-warn-color) " } Warn        | Displays warnings, along with anything below this line.                         |
    | `1`             | :material-checkbox-blank-circle:{ style="color: var(--md-loglevel-error-color) " } Error       | Displays only errors, none of the log levels above this line will be shown      |

<br />
<br />
