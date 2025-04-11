---
title: Healthcheck
tags:
  - usage
---

# Healthcheck

This docker container includes the ability to run health checks between the container api and outside services such as Portainer, or any other app that has the ability to query the endpoint `api/health`.

<br />

---

<br />

## API
<!-- md:version stable-1.4.0 -->

This container includes the ability to run health checks utilizing the built-in API. You can directly access the health check and view a json formatted result with the url `https://tvapp2.domain.lan/api/health`

=== "Example"

    ``` { .yaml .copy .select title="/api/health" linenums="1" }
    {
        "ip": "172.18.2.1",
        "gateway": "172.18.0.1",
        "uptime": 5903.549082501,
        "message": "healthy",
        "status": "healthy",
        "ref": "/api/health",
        "method": "GET",
        "code": 200,
        "timestamp": 1744386346242
    }
    ```

<br />

Numerous aliases have been added; you can use any of the following URLs to access the same health check results as they go to the same endpoint:

- https://tvapp2.domain.lan/api/health
- https://tvapp2.domain.lan/api/status

<br />

---

<br />

## Portainer
<!-- md:version stable-1.3.0 -->

To run a health check between TVApp2 and Portainer, apply the following lines of code to your TVApp2 `docker-compose.yml`. Two examples have been provided, you can use either one; `wget` or `curl`:

=== "Using CURL"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="14-18" }
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
                - TZ=Etc/UTC
            health check:
                test: "curl --fail --silent http://127.0.0.1:4124/api/health | grep -i healthy || exit 1"
                interval: 15s
                timeout: 10s
                retries: 3
    ```

=== "Using WGET"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="14-18" }
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
                - TZ=Etc/UTC
            health check:
                test: "wget -qO- http://127.0.0.1:4124/api/health | grep -i healthy || exit 1"
                interval: 15s
                timeout: 10s
                retries: 3
    ```

<br />

---

<br />

## Web Interface
<!-- md:version stable-1.4.0 -->

The TVApp2 web interface is equip with its own health check which is ran every `10 minutes` by default. Users will notice a health indicator in the top right of the header navigation bar which is represented by the :octicons-heart-fill-24:{ .heart } icon.

When the health check is ran every 10 minutes; a toast notification will appear in the lower-right side of the page:

<figure markdown="span">
    ![Image settings](../../assets/images/health-toast.gif){ width="80%" }
    <figcaption>Health check toast notification</figcaption>
</figure>

<br />

### Health Check Duration
<!-- md:control env -->
<!-- md:version stable-1.4.0 -->
<!-- md:default `600000` -->

By default, a health check between the TVApp2 container and the web interface is done every `10 minutes`, but you can change this duration to something less or more. Be aware that if you set the time too low, you will constantly be spammed with toast notifications. 

To change the health check delay, add the environment variable `HEALTH_TIMER` to your TVApp2 `docker-compose.yml`. Duration is in milliseconds.

<br />

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
                - HEALTH_TIMER=600000 # (1)
    ```

    1.  :information: Defines how often to perform health checks between the container and the web interface. Time is in milliseconds. <br /><br />Default value is `600000` (10 minutes)

=== "Time Chart"

    | HEALTH_TIMER Value | Delay Between Checks |
    | --- | --- |
    | `HEALTH_TIMER=300000` | 5 minutes |
    | `HEALTH_TIMER=600000` | 10 minutes |
    | `HEALTH_TIMER=1200000` | 20 minutes |
    | `HEALTH_TIMER=1800000` | 30 minutes |
    | `HEALTH_TIMER=3600000` | 1 hour |

<br />
<br />
