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

from html.parser import HTMLParser

# -----------------------------------------------------------------------------
# Classes
# -----------------------------------------------------------------------------

# Readtime parser
class ReadtimeParser(HTMLParser):

    # Initialize parser
    def __init__(self):
        super().__init__(convert_charrefs = True)

        # Keep track of text and images
        self.text   = []
        self.images = 0

    # Collect images
    def handle_starttag(self, tag, attrs):
        if tag == "img":
            self.images += 1

    # Collect text
    def handle_data(self, data):
        self.text.append(data)
