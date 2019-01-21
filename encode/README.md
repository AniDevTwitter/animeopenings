## "I want to encode 2000 videos."

Use `videoManager.py`. fontforge is recommended, though the script will detect if it's not installed and skip that part.

This script does not take any command-line arguments, instead using the settings in `settings.py` to handle the sources and destinations of all of the files that will be used and produced. Since everyone will have a different setup, they are currently set for our own use. *Make sure you change them to the correct directories for you*. The only directory that needs to exist before using this script is `directories.source`; the rest will be created automatically if they do not exist.

The directory pointed to by `directories.source` and the directories and files it contains must be in a specific format as follows. The source directory contains directories for every IP. Each of these directories contains directories for every series in that IP. Each series directory contains directories for every video from that series you want to encode, a file named `order` containing a single number describing the order that series is in within the IP, and optionally a file named `display_name` containing a string to be used visually on the website in place of the series' name. The video directory must be in the format `{OP,IN,ED}_{0,1,2,...}[{a,b,c,...}]_{C,NC}_{BD,DVD,PC,...}`. Each video directory must contain two files: the source video and a file named `status` containing the text "approved" (or not if you don't want to encode that video). They may also optionally contain the following 9 files:

* display_name - An alternate video title to display. A title will be created automatically if this is not given.
* encoder_override - Any extra parameters to pass to ffmpeg. Currently unused.
* song_artist - The song artist.
* song_title - The song title.
* source - A URL (or some other text) to the source of the source file. This is not used by the scripts; it's just for personal reference.
* subtitles - Contains the name of the subtitle group. This must exist for the subtitles to be displayed on the website.
* time_end - The time to stop encoding the source file at.
* time_start - The time to start encoding the source file at.
* easter_egg - Marker file that this is an Easter Egg.

The video directory may also optionally contain a `fonts` directory. You can put extra font files in here that are needed for the subtitles but not attached to the video file.

After running this script there will be two empty files created in each video directory named `fonts_extracted` and `subs_extracted`. The timestamps of these files are used to keep track of the last time the script was run, preventing unnecessary work when the script is run again.

Since some characters cannot be used in the names of directories on some systems, these `＜＞：”／￥｜？＊。` fullwidth characters can be used in place of `<>:"/\|?*.` and will be swapped out by the script when it generates the output text files as necessary.

## "I want to encode one video."

Use `videoEncoder.py`. Only `settings.py`, `videoEncoder.py`, `subtitleConverter.py`, and `videoClasses.py` are required. Run `videoEncoder.py -h` to see how to use it. If you want more control over the settings used, there are quite a few variables in `settings.py` that you can modify.

## "What does each file do?"

**`settings.py`** contains all of the customizable settings for all of the files.

**`videoClasses.py`** contains the definitions of the classes used to manage all of the video data. The functions in `videoEncoder.py` are called from this file.

**`videoEncoder.py`** contains the code that interacts with ffmpeg. It handles encoding, muxing, and font and subtitle extraction. This file is used by `videoManager.py` to batch encode videos, or it can be used directly to encode a single video, as explained above.

**`videoManager.py`** is the start file for batch encoding.

**`fontConverter.py`** is used with [FontForge](https://fontforge.github.io/en-US/) to convert all of the font files in a directory to the woff format. It then generates `fonts.css` to be placed in the website's CSS diretory. `fontConverter.py` will be automatically run from `videoManager.py` if you have FontForge installed. If you don't have FontForge installed on the computer/server you are running `videoManager.py` on, you can run it with `fontforge -script fontConverter.py font_source_directory font_output_directory`. `fonts.css` will be created in whatever directory the command is run from. (You do not have to configure FontForge with `--enable-pyextension` for this to work.)

**`fontConverter.alt.py`** is an updated version of `fontConverter.py` to work with more up-to-date versions of FontForge. It uses Python 3 instead of 2, and isn't called directly from FontForge. you can run it with `fontConverter,alt.py font_source_directory font_output_directory`.

**`subtitleConverter.py`** converts Advanced Substation Alpha (.ass) subtitles to a format more easily used by the website. The files created by this script are not necessarily compliant with the ASS standard, but they will be more compact. This file can also be used on its own as `subtitleConverter.py input_subtitles.ass | output_subtitles.ass`.
