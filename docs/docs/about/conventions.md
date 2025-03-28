# Conventions
This documentation use some symbols for illustration purposes. Before you read
on, please make sure you've made yourself familiar with the following list of
conventions:

<br />

### <!-- md:version --> Release Type { data-toc-label="Version" }

The tag symbol in conjunction with a version number denotes when a specific feature or behavior was added. Make sure you're at least on this version if you want to use it.

:   <!-- md:version --> default
:   <!-- md:version stable- --> stable
:   <!-- md:version development- --> development

<br />

### <!-- md:control --> Controls { #default data-toc-label="Control" }

These icons define what type of control a specified setting uses.

:   <!-- md:control toggle --> toggle
:   <!-- md:control toggle_on --> toggle on
:   <!-- md:control toggle_off --> toggle off
:   <!-- md:control textbox --> textbox
:   <!-- md:control dropdown --> dropdown
:   <!-- md:control button --> button
:   <!-- md:control slider --> slider
:   <!-- md:control color #E5E5E5 #121315 --> color wheel

<br />

### <!-- md:default --> – Default Value { #default data-toc-label="Default value" }

This defines what the default value for a setting is.

:   <!-- md:default --> Specified setting has a default value
:   <!-- md:default none --> Specified setting has no default value and is empty
:   <!-- md:default computed --> Specified setting is automatically computed by the app

<br />

### <!-- md:command --> – Command { #command data-toc-label="Command" }

This defines a command

:   <!-- md:command --> Specified setting has a default value

<br />

### <!-- md:flag --> – Flags { #flags data-toc-label="Flags" }

:   <!-- md:flag --> Default
:   <!-- md:flag experimental --> Experimental
:   <!-- md:flag required --> Required
:   <!-- md:flag customization --> Customization
:   <!-- md:flag metadata --> Metadata
:   <!-- md:flag dangerous --> Dangerous
:   <!-- md:flag multiple --> Multiple
:   <!-- md:flag setting --> Setting

Anything listed with this icon are features or functionality that are still in development and may change in future versions.

<br />

### <!-- md:3rdparty --> – 3rd Party { data-toc-label="3rd Party" }

This symbol denotes that the item described is classified as something that changes the overall functionality of the plugin.

<br />

### <!-- md:flag setting --> – Configurable Settings { #setting data-toc-label="Configurable Setting" }

The following denotes a configurable setting. These can also be broken up into individual settings as shown below:

#### <!-- md:setting example.setting.enabled -->
<!-- md:version 1.0.0 -->
<!-- md:default `true` -->

This is an example setting

#### <!-- md:setting example.setting.other -->
<!-- md:version 1.0.0 -->
<!-- md:default `true` -->

This is another example setting

<br />

### <!-- md:flag multiple --> – Multiple instances { #multiple-instances data-toc-label="Multiple instances" }

This symbol denotes that the plugin supports multiple instances, i.e, that it
can be used multiple times in the `plugins` setting in `mkdocs.yml`.

<br />

### <!-- md:feature --> – Optional feature { #feature data-toc-label="Optional feature" }

Some features may be hidden behind feature flags, which means they must
be explicitly enabled first before they can be configured. This allows
for the existence of potentially orthogonal features.

<br />

### <!-- md:markdown --> – Markdown extension { data-toc-label="Markdown extension" #extension }

This symbol denotes that the thing described is a Markdown element.

<br />

### <!-- md:flag dangerous --> – Dangerous { #danger data-toc-label="Dangerous Property" }

This symbol denotes that the item described is a metadata property, which can
be used in Markdown documents as part of the front matter definition.


<br />

### <!-- md:backers --> – Backers only { data-toc-label="Backers only" }

The pumping heart symbol denotes that a specific feature or behavior is only
available to backers. Normal users will not have access to this particular item.

<br />

---

<br />

## Other Tags

<br />

### Example Download { #example data-toc-label="Dangerous Property" }
<!-- md:example my-example-file -->

The following denotes a downloadable file.

<br />

### Commands
<!-- md:command `-s,  --start` -->

The above denotes a command which can be executed in a terminal / command prompt.

<br />

## Options

Options are another form of setting which lists what the option does, and then examples of how it works.

<!-- md:option rss.enabled -->

:   <!-- md:default `true` --> This option specifies whether
    the plugin is enabled when building your project. If you want to speed up
    local builds, you can use an [environment variable][mkdocs.env]:

    ``` yaml
    plugins:
      - rss:
          enabled: !ENV [CI, false]
    ```

<!-- md:option rss.match_path -->

:   <!-- md:default `.*` --> This option specifies which
    pages should be included in the feed. For example, to only include blog
    posts in the feed, use the following regular expression:

    ``` yaml
    plugins:
      - rss:
          match_path: blog/posts/.*
    ```

<br />

---

<br />

<br />
<br />
