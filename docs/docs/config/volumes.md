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

<!-- md:control volume -->
<!-- md:version stable-1.0.0 -->

The mountable volume `/usr/bin/app` is where TVApp2 files will be placed once the app has been built when your docker container spins up. The files in this folder include:

| File | Description |
| --- | --- |
| `📁 node_modules` | List of all NodeJS packages utilized by TVApp2 |
| `📁 www` | Main storage folder for TVApp2. Contains website files and M3U / EPG synced files |
| `📄 package.json` | NodeJS package file |
| `📄 playlist.m3u8` | Generated playlist containing channels |
| `📄 urls.txt` | List containing cached URLs utilized by TVApp2 |
| `📄 xmltv.xml` | EPG guide data in uncompressed XML format |
| `📄 xmltv.xml.gz` | EPG guide data in compressed GZ archive |
| `📄 index.js` | Main source code file for TVApp2 |

<br />

=== "Example"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="7" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - ./app:/usr/bin/app # (1)
    ```

    1.  :information: Changing this env variable will change the time for anything
        related to the TVApp2 docker container.

<br />

This folder path can be changed by specifying a new path with the environment variable `DIR_RUN`

=== "Example"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="7" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - ./app:/usr/bin/app # (1) (2)
    ```

    1.  :information: Changing this env variable will change the folder within the docker container which stores the fully built TVApp2 files.

    2.  This should not be used unless you know what you're doing

<br />

---

<br />

## 📁 /config

<!-- md:control volume -->
<!-- md:version stable-1.0.0 -->

The mountable volume `/config` defines where the TVApp2 application will store SSL certificates related to the TVApp2 web interface being ran using https instead of http. The files in this folder include:

| File | Description |
| --- | --- |
| `📁 keys` | Folder which stores the SSL cert and keys |
| `📄 keys/cert.crt` | SSL public certificate |
| `📄 keys/key.crt` | SSL private key |

<br />


=== "Example"

    ``` { .yaml .copy .select title="docker-compose.yml" linenums="1" hl_lines="7" }
    services:
        tvapp2:
            container_name: tvapp2
            image: ghcr.io/thebinaryninja/tvapp2:latest
            restart: unless-stopped
            volumes:
                - ./config:/config # (1) (2)
    ```

    1.  :information: Changing this env variable will change the folder within the docker container which stores the fully built TVApp2 files.

    2.  This should not be used unless you know what you're doing

<br />
<br />
