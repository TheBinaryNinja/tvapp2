#!/usr/bin/with-contenv bash
# shellcheck shell=bash

# #
#   @project        thetvapp-docker
#   @about          download script for fetching m3u8 and xml
#   @file           /download.sh
#   @repo           https://github.com/Aetherinox/thetvapp-docker
# #

DATE=$(TZ=${TZ} date '+%m-%d-%Y %H:%M:%S')

# #
#   Run Download
# #

echo -e
echo -e " Start        : Downloading latest ${FILE_NAME} m3u + xml"

# Download .xml
wget -q -O /config/www/${FILE_NAME}.xml ${URL_XML}
echo -e "                Getting ${FILE_NAME}.xml › ${URL_XML}"

# Download .xml.gz
wget -q -O /config/www/${FILE_NAME}.xml.gz ${URL_XML_GZ}
echo -e "                Getting ${FILE_NAME}.xml.gz › ${URL_XML_GZ}"

# Download .m3u8
wget -q -O /config/www/${FILE_NAME}.m3u8 ${URL_M3U}
echo -e "                Getting ${FILE_NAME}.m3u8 › ${URL_M3U}"

echo -e " End          : Finished update at ${DATE}"
