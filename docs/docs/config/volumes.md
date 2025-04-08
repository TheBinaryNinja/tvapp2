---
title: Environment Variables
tags:
  - config
---

# Mountable Volumes

Mountable volumes in Docker allow you to share folders within a docker container with your host machine. This allows you to access these specific files without having to bash into the container and using the terminal to navigate around.

The TVApp2 docker image provides a few different paths that you can mount to your host machine; as outlined below.

<br />

## 📁 /usr/bin/app
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
