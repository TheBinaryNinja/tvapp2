# #
#   Copyright (c) 2025 Aetherinox
#
#   Permission is hereby granted, free of charge, to any person obtaining a copy
#   of this software and associated documentation files (the "Software"), to
#   deal in the Software without restriction, including without limitation the
#   rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
#   sell copies of the Software, and to permit persons to whom the Software is
#   furnished to do so, subject to the following conditions:
#
#   The above copyright notice and this permission notice shall be included in
#   all copies or substantial portions of the Software.
#
#   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
#   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#   FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE
#   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#   FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
#   IN THE SOFTWARE.
# #

# -----------------------------------------------------------------------------
# Disclaimer
# -----------------------------------------------------------------------------
# Please note: this version of the social plugin is not actively development
# anymore. Instead, Material for MkDocs Insiders ships a complete rewrite of
# the plugin which is much more powerful and addresses all shortcomings of
# this implementation. Additionally, the new social plugin allows to create
# entirely custom social cards. You can probably imagine, that this was a lot
# of work to pull off. If you run into problems, or want to have additional
# functionality, please consider sponsoring the project. You can then use the
# new version of the plugin immediately.
# -----------------------------------------------------------------------------

import concurrent.futures
import functools
import logging
import os
import posixpath
import re
import requests
import sys

from collections import defaultdict
from hashlib import md5
from io import BytesIO
from mkdocs.commands.build import DuplicateFilter
from mkdocs.exceptions import PluginError
from mkdocs.plugins import BasePlugin
from shutil import copyfile
from tempfile import TemporaryFile
from zipfile import ZipFile
try:
    from cairosvg import svg2png
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    pass

from .config import SocialConfig


# -----------------------------------------------------------------------------
# Classes
# -----------------------------------------------------------------------------

# Social plugin
class SocialPlugin(BasePlugin[SocialConfig]):

    def __init__(self):
        self._executor = concurrent.futures.ThreadPoolExecutor(4)

    # Retrieve configuration
    def on_config(self, config):
        self.color = colors.get("indigo")
        self.config.cards = self.config.enabled
        if not self.config.cards:
            return

        # Check dependencies
        if "Image" not in globals():
            raise PluginError(
                "Required dependencies of \"social\" plugin not found. "
                "Install with: pip install \"mkdocs-material[imaging]\""
            )

        # Move color options
        if self.config.cards_color:

            # Move background color to new option
            value = self.config.cards_color.get("fill")
            if value:
                self.config.cards_layout_options["background_color"] = value

            # Move color to new option
            value = self.config.cards_color.get("text")
            if value:
                self.config.cards_layout_options["color"] = value

        # Move font family to new option
        if self.config.cards_font:
            value = self.config.cards_font
            self.config.cards_layout_options["font_family"] = value

        # Check if site URL is defined
        if not config.site_url:
            log.warning(
                "The \"site_url\" option is not set. The cards are generated, "
                "but not linked, so they won't be visible on social media."
            )

        # Ensure presence of cache directory
        self.cache = self.config.cache_dir
        if not os.path.isdir(self.cache):
            os.makedirs(self.cache)

        # Retrieve palette from theme configuration
        theme = config.theme
        if "palette" in theme:
            palette = theme["palette"]

            # Use first palette, if multiple are defined
            if isinstance(palette, list):
                palette = palette[0]

            # Set colors according to palette
            if "primary" in palette and palette["primary"]:
                primary = palette["primary"].replace(" ", "-")
                self.color = colors.get(primary, self.color)

        # Retrieve color overrides
        options = self.config.cards_layout_options
        self.color = {
            "fill": options.get("background_color", self.color["fill"]),
            "text": options.get("color", self.color["text"])
        }

        # Retrieve logo and font
        self._resized_logo_promise = self._executor.submit(self._load_resized_logo, config)
        self.font = self._load_font(config)

        self._image_promises = []

    # Create social cards
    def on_page_markdown(self, markdown, page, config, files):
        if not self.config.cards:
            return

        # Resolve image directory
        directory = self.config.cards_dir
        file, _ = os.path.splitext(page.file.src_path)

        # Resolve path of image
        path = "{}.png".format(os.path.join(
            config.site_dir,
            directory,
            file
        ))

        # Resolve path of image directory
        directory = os.path.dirname(path)
        if not os.path.isdir(directory):
            os.makedirs(directory)

        # Compute site name
        site_name = config.site_name

        # Compute page title and description
        title = page.meta.get("title", page.title)
        description = config.site_description or ""
        if "description" in page.meta:
            description = page.meta["description"]

        # Check type of meta title - see https://t.ly/m1Us
        if not isinstance(title, str):
            log.error(
                f"Page meta title of page '{page.file.src_uri}' must be a "
                f"string, but is of type \"{type(title)}\"."
            )
            sys.exit(1)

        # Check type of meta description - see https://t.ly/m1Us
        if not isinstance(description, str):
            log.error(
                f"Page meta description of '{page.file.src_uri}' must be a "
                f"string, but is of type \"{type(description)}\"."
            )
            sys.exit(1)

        # Generate social card if not in cache
        hash = md5("".join([
            site_name,
            str(title),
            description
        ]).encode("utf-8"))
        file = os.path.join(self.cache, f"{hash.hexdigest()}.png")
        self._image_promises.append(self._executor.submit(
            self._cache_image,
            cache_path = file, dest_path = path,
            render_function = lambda: self._render_card(site_name, title, description)
        ))

        # Inject meta tags into page
        meta = page.meta.get("meta", [])
        page.meta["meta"] = meta + self._generate_meta(page, config)

    def on_post_build(self, config):
        if not self.config.cards:
            return

        # Check for exceptions
        for promise in self._image_promises:
            promise.result()

    # -------------------------------------------------------------------------

    # Render image to cache (if not present), then copy from cache to site
    def _cache_image(self, cache_path, dest_path, render_function):
        if not os.path.isfile(cache_path):
            image = render_function()
            image.save(cache_path)

        # Copy file from cache
        copyfile(cache_path, dest_path)

    @functools.lru_cache(maxsize=None)
    def _get_font(self, kind, size):
        return ImageFont.truetype(self.font[kind], size)

    # Render social card
    def _render_card(self, site_name, title, description):
        # Render background and logo
        image = self._render_card_background((1200, 630), self.color["fill"])
        image.alpha_composite(
            self._resized_logo_promise.result(),
            (1200 - 228, 64 - 4)
        )

        # Render site name
        font = self._get_font("Bold", 36)
        image.alpha_composite(
            self._render_text((826, 48), font, site_name, 1, 20),
            (64 + 4, 64)
        )

        # Render page title
        font = self._get_font("Bold", 92)
        image.alpha_composite(
            self._render_text((826, 328), font, title, 3, 30),
            (64, 160)
        )

        # Render page description
        font = self._get_font("Regular", 28)
        image.alpha_composite(
            self._render_text((826, 80), font, description, 2, 14),
            (64 + 4, 512)
        )

        # Return social card image
        return image

    # Render social card background
    def _render_card_background(self, size, fill):
        return Image.new(mode = "RGBA", size = size, color = fill)

    @functools.lru_cache(maxsize=None)
    def _tmp_context(self):
        image = Image.new(mode = "RGBA", size = (50, 50))
        return ImageDraw.Draw(image)

    @functools.lru_cache(maxsize=None)
    def _text_bounding_box(self, text, font):
        return self._tmp_context().textbbox((0, 0), text, font = font)

    # Render social card text
    def _render_text(self, size, font, text, lmax, spacing = 0):
        width = size[0]
        lines, words = [], []

        # Remove remnant HTML tags
        text = re.sub(r"(<[^>]+>)", "", text)

        # Retrieve y-offset of textbox to correct for spacing
        yoffset = 0

        # Create drawing context and split text into lines
        for word in text.split(" "):
            combine = " ".join(words + [word])
            textbox = self._text_bounding_box(combine, font = font)
            yoffset = textbox[1]
            if not words or textbox[2] <= width:
                words.append(word)
            else:
                lines.append(words)
                words = [word]

        # Join words for each line and create image
        lines.append(words)
        lines = [" ".join(line) for line in lines]
        image = Image.new(mode = "RGBA", size = size)

        # Create drawing context and split text into lines
        context = ImageDraw.Draw(image)
        context.text(
            (0, spacing / 2 - yoffset), "\n".join(lines[:lmax]),
            font = font, fill = self.color["text"], spacing = spacing - yoffset
        )

        # Return text image
        return image

    # -------------------------------------------------------------------------

    # Generate meta tags
    def _generate_meta(self, page, config):
        directory = self.config.cards_dir
        file, _ = os.path.splitext(page.file.src_uri)

        # Compute page title
        title = page.meta.get("title", page.title)
        if not page.is_homepage:
            title = f"{title} - {config.site_name}"

        # Compute page description
        description = config.site_description
        if "description" in page.meta:
            description = page.meta["description"]

        # Resolve image URL
        url = "{}.png".format(posixpath.join(
            config.site_url or ".",
            directory,
            file
        ))

        # Ensure forward slashes
        url = url.replace(os.path.sep, "/")

        # Return meta tags
        return [

            # Meta tags for Open Graph
            { "property": "og:type", "content": "website" },
            { "property": "og:title", "content": title },
            { "property": "og:description", "content": description },
            { "property": "og:image", "content": url },
            { "property": "og:image:type", "content": "image/png" },
            { "property": "og:image:width", "content": "1200" },
            { "property": "og:image:height", "content": "630" },
            { "property": "og:url", "content": page.canonical_url },

            # Meta tags for Twitter
            { "name": "twitter:card", "content": "summary_large_image" },
            # { "name": "twitter:site", "content": user },
            # { "name": "twitter:creator", "content": user },
            { "name": "twitter:title", "content": title },
            { "name": "twitter:description", "content": description },
            { "name": "twitter:image", "content": url }
        ]

    def _load_resized_logo(self, config, width = 144):
        logo = self._load_logo(config)
        height = int(width * logo.height / logo.width)
        return logo.resize((width, height))

    # Retrieve logo image or icon
    def _load_logo(self, config):
        theme = config.theme

        # Handle images (precedence over icons)
        if "logo" in theme:
            _, extension = os.path.splitext(theme["logo"])

            path = os.path.join(config.docs_dir, theme["logo"])

            # Allow users to put the logo inside their custom_dir (theme["logo"] case)
            if theme.custom_dir:
                custom_dir_logo = os.path.join(theme.custom_dir, theme["logo"])
                if os.path.exists(custom_dir_logo):
                    path = custom_dir_logo

            # Load SVG and convert to PNG
            if extension == ".svg":
                return self._load_logo_svg(path)

            # Load PNG, JPEG, etc.
            return Image.open(path).convert("RGBA")

        # Handle icons
        icon = theme["icon"] or {}
        if "logo" in icon and icon["logo"]:
            logo = icon["logo"]
        else:
            logo = "material/library"

        # Resolve path of package
        base = os.path.abspath(os.path.join(
            os.path.dirname(__file__),
            "../.."
        ))

        path = f"{base}/templates/.icons/{logo}.svg"

        # Allow users to put the logo inside their custom_dir (theme["icon"]["logo"] case)
        if theme.custom_dir:
            custom_dir_logo = os.path.join(theme.custom_dir, ".icons", f"{logo}.svg")
            if os.path.exists(custom_dir_logo):
                path = custom_dir_logo

        # Load icon data and fill with color
        return self._load_logo_svg(path, self.color["text"])

    # Load SVG file and convert to PNG
    def _load_logo_svg(self, path, fill = None):
        file = BytesIO()
        data = open(path).read()

        # Fill with color, if given
        if fill:
            data = data.replace("<svg", f"<svg fill=\"{fill}\"")

        # Convert to PNG and return image
        svg2png(bytestring = data, write_to = file, scale = 10)
        return Image.open(file)

    # Retrieve font
    def _load_font(self, config):
        name = self.config.cards_layout_options.get("font_family")
        if not name:

            # Retrieve from theme (default: Roboto)
            theme = config.theme
            if isinstance(theme["font"], dict) and "text" in theme["font"]:
                name = theme["font"]["text"]
            else:
                name = "Roboto"

        # Google fonts can return varients like OpenSans_Condensed-Regular.ttf so
        # we only use the font requested e.g. OpenSans-Regular.ttf
        font_filename_base = name.replace(' ', '')
        filename_regex = re.escape(font_filename_base)+r"-(\w+)\.[ot]tf$"

        font = {}
        # Check for cached files - note these may be in subfolders
        for currentpath, folders, files in os.walk(self.cache):
            for file in files:
                # Map available font weights to file paths
                fname = os.path.join(currentpath, file)
                match = re.search(filename_regex, fname)
                if match:
                    font[match.group(1)] = fname

        # If none found, fetch from Google and try again
        if len(font) == 0:
            self._load_font_from_google(name)
            for currentpath, folders, files in os.walk(self.cache):
                for file in files:
                    # Map available font weights to file paths
                    fname = os.path.join(currentpath, file)
                    match = re.search(filename_regex, fname)
                    if match:
                        font[match.group(1)] = fname

        # Return available font weights with fallback
        return defaultdict(lambda: font["Regular"], font)

    # Retrieve font from Google Fonts
    def _load_font_from_google(self, name):
        url = "https://fonts.google.com/download?family={}"
        res = requests.get(url.format(name.replace(" ", "+")), stream = True)

        # Write archive to temporary file
        tmp = TemporaryFile()
        for chunk in res.iter_content(chunk_size = 32768):
            tmp.write(chunk)

        # Unzip fonts from temporary file
        zip = ZipFile(tmp)
        files = [file for file in zip.namelist() if file.endswith(".ttf") or file.endswith(".otf")]
        zip.extractall(self.cache, files)

        # Close and delete temporary file
        tmp.close()
        return files

# -----------------------------------------------------------------------------
# Data
# -----------------------------------------------------------------------------

# Set up logging
log = logging.getLogger("mkdocs")
log.addFilter(DuplicateFilter())

# Color palette
colors = {
    "red":         { "fill": "#ef5552", "text": "#ffffff" },
    "pink":        { "fill": "#e92063", "text": "#ffffff" },
    "purple":      { "fill": "#ab47bd", "text": "#ffffff" },
    "deep-purple": { "fill": "#7e56c2", "text": "#ffffff" },
    "indigo":      { "fill": "#4051b5", "text": "#ffffff" },
    "blue":        { "fill": "#2094f3", "text": "#ffffff" },
    "light-blue":  { "fill": "#02a6f2", "text": "#ffffff" },
    "cyan":        { "fill": "#00bdd6", "text": "#ffffff" },
    "teal":        { "fill": "#009485", "text": "#ffffff" },
    "green":       { "fill": "#4cae4f", "text": "#ffffff" },
    "light-green": { "fill": "#8bc34b", "text": "#ffffff" },
    "lime":        { "fill": "#cbdc38", "text": "#000000" },
    "yellow":      { "fill": "#ffec3d", "text": "#000000" },
    "amber":       { "fill": "#ffc105", "text": "#000000" },
    "orange":      { "fill": "#ffa724", "text": "#000000" },
    "deep-orange": { "fill": "#ff6e42", "text": "#ffffff" },
    "brown":       { "fill": "#795649", "text": "#ffffff" },
    "grey":        { "fill": "#757575", "text": "#ffffff" },
    "blue-grey":   { "fill": "#546d78", "text": "#ffffff" },
    "black":       { "fill": "#000000", "text": "#ffffff" },
    "white":       { "fill": "#ffffff", "text": "#000000" }
}
