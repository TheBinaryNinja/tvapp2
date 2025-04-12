---
title: "Install: docker-run"
tags:
  - install
---

# docker run

Our documentation provides two ways that you may start up a TVApp2 docker container:

<div class="grid cards" markdown>

-   :material-circle: &nbsp; [docker run](docker-run.md)

    ---

    Spin up the TVApp2 container using the `docker run` command. 
    This is useful for quick launches, but is not time efficient
    if you plan to use this container long-term.

    This requires a longer command that must be used each time
    you wish to bring the container up.

-   :material-circle: &nbsp; [docker compose](docker-compose.md)

    ---

    Spin up the TVApp2 container by creating a `📄 docker-compose.yml`
    file which will store all of your options such as env variables,
    mounted volumes, and labels.

    To bring the container up, `cd` into the folder with the 
    `📄 docker-compose.yml` file, and run the
    command `docker compose up -d`.

</div>

<br />

The `🗔 docker run` command allows you to start up a docker container by providing a set of [options](#command-options) which define how the container should operate, including the environment variables, mounted volumes, assigned IP address, etc.

<br />

---

<br />

## Start TVApp2

Pulling the image if needed and starting the container. To spin up a TVApp2 container using this method; run a command similar to the below example. See the section [Options](#options) below for a list of what you can specify.

=== "Terminal"

    ```shell
    docker run -d \
    --restart=unless-stopped \ # (1)!
    --name tvapp2 \ # (2)!
    -p 4124:4124 \ # (3)!
    -e "TZ=Etc/UTC" \ # (4)!
    -v ${PWD}/app:/usr/bin/app \ # (5)!
    ghcr.io/thebinaryninja/tvapp2:latest # (6)!
    ```

    1.  Specifies what happens if the container becomes unresponsive or goes down.
    2.  Name to assign the container; otherwise, a random id will be given.
    3.  Port that will be used for the container
    4.  Environment variable which specifies the timezone to use for the container.
    5.  Mount the container volume `/usr/bin/app` to your host machine in the subfolder `./app`
    6.  Specifies what docker image to spin up.

<br />

To confirm that the container has been brought up, run the command `docker ps | grep tvapp2`. If you have the app [Portainer](https://portainer.io/), you can sign into your admin interface and view your TVApp2 container details, instead of using a command-line.

```
e95236c42b43     binaryninja/tvapp2:1.4.0     "/init"     3 seconds ago     Up 3 seconds     4124/tcp     tvapp2
```

<br />

---

<br />

## Options

Review the list of docker run options below. These allow you to define how a docker container will start up.

???- note "Official Docker Documentation"
    To view a full list of the available docker parameters, view the official docker documentation at:

    - https://docs.docker.com/reference/cli/docker/container/run/

| Parameter / Flag | Description |
| --- | --- |
| `-d, --detach` | Run container in background and print container ID |
| `-e, --env` | Set environment variable |
| `--env-file` | Read in a file of environment variables |
| `--expose` | Expose a port or a range of ports |
| `--health-cmd` | Command to run to check health |
| `--health-interval` | Time between running the check<br/>`ms|s|m|h` (default 0s) |
| `--health-retries` | Consecutive failures needed to report unhealthy |
| `--health-start-interval` | Time between running the check during the start period<br/>`ms|s|m|h` (default 0s) |
| `--health-start-period` | Start period for the container to initialize before starting health-retries countdown<br/>`ms|s|m|h` (default 0s) |
| `--health-timeout` | Maximum time to allow one check to run<br/>`ms|s|m|h` (default 0s) |
| `-h, --hostname` | Container host name |
| `--ip` | IPv4 address (e.g., 172.30.100.104) |
| `--ip6` | IPv6 address (e.g., 2001:db8::33) |
| `-l, --label` | Set meta data on a container |
| `--mount` | Attach a filesystem mount to the container |
| `--name` | Assign a name to the container |
| `--network` | Connect a container to a network |
| `--privileged` | Give extended privileges to this container |
| `-p, --publish` | Publish a container's port(s) to the host |
| `--pull` | Pull image before running<br/>`always`, `missing`, `never` |
| `--restart` | Restart policy to apply when a container exits <br/> `on-failure[:max-retries]`, `always`, `unless-stopped` |
| `-u, --user` | Username or UID <br/>`<name|uid>[:<group|gid>]` |
| `-v, --volume` | Bind mount a volume |
| `-w, --workdir` | 	Working directory inside the container |

<br />


<br />
<br />
