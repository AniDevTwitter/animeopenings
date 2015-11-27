# animeopenings

Maintainer: QuadPiece ([GitHub](https://github.com/QuadPiece), [Twitter](https://twitter.com/QuadPiece/))

## To do:

* Hopefully leave beta stage soon.
* Redesign hub?

*Check end of readme for list of things that WON'T be done*

## Requirements

Required:

* A recent version of PHP
* A web server
* Some video conversion software (ffmpeg recommended)

Optional:

* Python 3 (For the encode.py file)
* Git (For easy deployment)
* A linux machine for the shell scripts, some may function under cygwin

## Features

Openings.moe has a lot of features. I'll list the main features here:

* Play ramdom videos from a folder
* List all videos with metadata
* Relatively little server-side processing
* Minimalistic video player (It also looks/works great as an iframe as-is)
* Simple (but messy) metadata structure
* ASS subtitle support (Beta)

## Deployment

Deploy it like a regular PHP site. It requires no rewrite rules and no dependencies. Either clone the repository with `git clone https://github.com/AniDevTwitter/animeopenings.git` or just download a zip with all the files, which you then place on your web server.

To make videos appear, create a `video` folder and fill it up, then add the video's information to the names.php file.

For additional configuration, such as replacing the chat and editing the structure or name of the metadata, you're on your own.

## Updating

Simply update all the files that were changed. Just make sure not to break your botnet.html if that has content and make sure you back up your names.php along with the videos if you wish.

## Things that won't be done:

* Minifying Javascript (The bandwidth gains are not worth it considering the fact that all the videos they'll be viewing require roughly 3 mbit/s connections anyways, therefore this would serve no purpose for low bandwidth users. I'd rather let developers read the JS directly.)
* (Proper) Mobile support. (I will not be encoding MP4 copies. These would essentially double the storage requirements. The Chrome mobile browser blocks autoplaying background video, so proper fixes for that are straight up impossible. Other methods, such as opening videos in a media player may be considered.)
* Leaving beta apparently. Geez, one day it'll happen hopefully.
