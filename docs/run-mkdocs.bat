@CD 	    /d "%~dp0"
@ECHO 	    OFF
TITLE       mkdocs startup
SETLOCAL 	enableextensions enabledelayedexpansion
MODE        con:cols=125 lines=120
MODE        125,40
GOTO        comment_end

Starts up mkdocs from a windows system.
Ensure you have defined `GH_TOKEN` or the git-committers plugin will rate limit you.

    setx /m GH_TOKEN "github_pat_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

If using a Github Workflow, create a new secret in the repo settings named `GH_TOKEN`
and give it your Github fine-grained personal access token.

The token variable is defined in mkdocs.yml

:comment_end

ECHO.

:: #
::  define:     directories
:: #

set dir_home=%~dp0

:: #
::  define:     env variable
:: #

set TOKEN=%GH_TOKEN2%

echo  --------------------------------------------------------------------------------
echo    Mkdocs Launcher
echo  --------------------------------------------------------------------------------

IF [!TOKEN!]==[]  (
    echo  --------------------------------------------------------------------------------
    echo    GH_TOKEN not defined. Open %0%
    echo    Create a new one at https://github.com/settings/personal-access-tokens
    echo  --------------------------------------------------------------------------------
    set /P TOKEN= Enter Github Personal Access Token (fine-grained):

)

echo    GH_TOKEN: !TOKEN!
echo.
echo.

:: #
::  start mkdocs
:: #

echo Starting mkdocs ...
start cmd /k "mkdocs serve --clean"
