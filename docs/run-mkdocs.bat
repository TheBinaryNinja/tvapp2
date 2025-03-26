@CD 	    /d "%~dp0"
@ECHO 	    OFF
TITLE       mkdocs startup
SETLOCAL 	enableextensions enabledelayedexpansion
MODE        con:cols=125 lines=120
MODE        125,40
GOTO        comment_end

    @usage              Starts up mkdocs from a windows system.
                        Ensure you have defined `GH_TOKEN` or the git-committers plugin will rate limit you.

                            setx /m GH_TOKEN "github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

                        If using a Github Workflow, create a new secret in the repo settings named `GH_TOKEN`
                        and give it your Github fine-grained personal access token.

                        The token variable is defined in mkdocs.yml

    @update             use the following commands to update mkdocs and the mkdocs-material theme:
                            pip install --upgrade mkdocs
                            pip install --upgrade --force-reinstall mkdocs-material

:comment_end

ECHO.

:: #
::  define:     directories
:: #

set dir_home=%~dp0

:: #
::  define:     env variable
:: #

echo  ------------------------------------------------------------------------------------------------
echo    Mkdocs Launcher
echo  ------------------------------------------------------------------------------------------------

IF "!GH_TOKEN!"==""  (
    echo    GH_TOKEN not defined.
    echo        Open %0%
    echo    Create a new one at:
    echo        https://github.com/settings/personal-access-tokens
    echo  ------------------------------------------------------------------------------------------------
    set /p TOKEN=" Enter Github Personal Access Token (fine-grained): "
)

echo    GH_TOKEN: !GH_TOKEN!
echo.
echo.

echo Creating environment variable GH_TOKEN
setx GH_TOKEN "!GH_TOKEN!"

timeout 2 > NUL

:: #
::  start mkdocs
:: #

echo Starting mkdocs ...
start cmd /k "mkdocs serve --clean"

timeout 5 > NUL
