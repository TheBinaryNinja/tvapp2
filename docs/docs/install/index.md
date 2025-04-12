---
title: Install
tags:
  - install
---

# Installing TVApp2

To install TVApp2 using docker; you will need to use either the `🗔 docker run` command, or create a `📄 docker-compose.yml` file which contains information about how to pull the latest image and spin the container up. We have provided instructions for both.

<br />

{==

Select your desired option to bring up the TVApp2 container with:

==}

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
<br />
