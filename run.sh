#!/usr/bin/with-contenv bash
# shellcheck shell=bash

# #
#   @project        thetvapp-docker
#   @about          initial run script, creates cron
#   @file           /run.sh
#   @repo           https://github.com/Aetherinox/thetvapp-docker
# #

# #
#   Disable, or cron asterisks will be converted to file paths.
# #

set -f

# #
#   For details see man crontabs
#
#   Example of job definition:
#   .---------------- minute (0 - 59)
#   |  .------------- hour (0 - 23)
#   |  |  .---------- day of month (1 - 31)
#   |  |  |  .------- month (1 - 12) OR jan,feb,mar,apr ...
#   |  |  |  |  .---- day of week (0 - 6) (Sunday=0 or 7) OR sun,mon,tue,wed,thu,fri,sat
#   |  |  |  |  |
#   *  *  *  *  *
# #

ARG_CRON_TIME=$(echo ${CRON_TIME})
if [ -z "${ARG_CRON_TIME}" ]; then
    ARG_CRON_TIME="0/60 * * * *"
fi

ARG_TZ=$(echo ${TZ})
if [ -z "${ARG_TZ}" ]; then
    ARG_TZ="Etc/UTC"
fi

echo -e " Config       : Setting task to run ${ARG_CRON_TIME}"
echo -e "                Setting timezone ${ARG_TZ}"
echo "${ARG_CRON_TIME} sh /download.sh" > /crontab.conf
crontab  /crontab.conf
set +f
