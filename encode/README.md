more detailed instructions may be added eventually

## "I want to encode 2000 videos."

use `videoManager.py`  
all script files are required  
fontforge is recommended, though the script will detect if it's not installed and skip that part

## "I want to encode one video."

use `videoEncoder.py`  
only `videoEncoder.py`, `subtitleConverter.py`, and `videoClasses.py` are required

## "What does each file do?"

**`fontConverter.py`** is used with [FontForge](https://fontforge.github.io/en-US/) to convert all of the font files in a directory to the woff format. It then generates `fonts.css` to be placed in the website's CSS diretory. `fontConverter.py` will be automatically run from `videoManager.py` if you have FontForge installed. If you don't have FontForge installed on the computer/server you are running `videoManager.py` on, you can run it with `fontforge -script fontConverter.py font_source_directory font_result_directory`. `fonts.css` will be created in whatever directory the command is run from. (You do not have to configure FontForge with `--enable-pyextension` for this to work.)
