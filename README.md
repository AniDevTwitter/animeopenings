# animeopenings

Maintainers:  
Quad ([GitHub](https://github.com/QuadPiece), [Twitter](https://twitter.com/Kuwaddo/))  
Yay295 ([GitHub](https://github.com/Yay295))

## Requirements

Required:

* A recent version of PHP (with [intl](https://www.php.net/manual/en/book.intl.php))
* A web server

Optional:

* Git (for easy deployment)
* Python 3 (for the encoding scripts)
* Some video conversion software (ffmpeg recommended)

## Features

Openings.moe has a lot of features. I'll list the main features here:

* Play random videos from a folder
* List all videos with metadata
* Relatively little server-side processing
* Minimalistic video player (it also looks/works great as an iframe as-is)
* Simple metadata structure
* SSA/ASS subtitle support

## Deployment

Deploy it like a regular PHP site. It requires no rewrite rules and no dependencies. Either clone the repository with `git clone https://github.com/AniDevTwitter/animeopenings.git`, or just download a zip with all the files and place them on your web server.

To make videos appear, create a `video` folder and fill it up, then add the video information to the `names.php` file.

For additional configuration, such as replacing the chat and editing the structure or name of the metadata, you're on your own.

## Updating

Simply update all the files that were changed. If you're using git, the `.gitignore` file should keep most custom things from being overwritten.

## Releases

Listed here because GitHub won't let you create a release from an old commit. These commits are singled out because they cause breaking changes to things not stored in this repository (often `names.php` and `eggs.php`).

* [**Easter Eggs Added**](https://github.com/AniDevTwitter/animeopenings/tree/5d19f802f09b33734d5aec41c2ef1604d9aa40c8) - This release added support for Easter Egg videos. It requires a file named `eggs.php` in the root directory similar to `names.php`, but with the array it contains named `$eggs`. This file is required even if `$eggs` is empty (this was fixed [later](https://github.com/AniDevTwitter/animeopenings/tree/dfa84a101eca8923af0ebf62964ceaa34012b85b)).
* [**Font Awesome Sourced Locally**](https://github.com/AniDevTwitter/animeopenings/tree/5e417b71d8a0d7b8bd9e3129c4c017b35b0079cf) - This release changed the site to use a local version of Font Awesome instead of a remote CDN. We made this change because the CDN went offline one day and all of the icons stopped working. Just download Font Awesome 4.4.0 and put it in your root directory, specifically `/font-awesome-4.4.0/css/font-awesome.min.css`. We went back to the CDN four months later [with this commit](https://github.com/AniDevTwitter/animeopenings/tree/ea68b3a61cc2246fa0f3ffa7f9b0713053ac00f8).
* [**First `names.php` Automation Attempt Part A**](https://github.com/AniDevTwitter/animeopenings/tree/5062d3ade0b82c6952492ffa82c22b881bced08a) - This was our first attempt to automatically generate `names.php` from data stored elsewhere. Your current version of `names.php` will still work, so you can make a copy of that before you update and use it in place of the new version.
* [**First `names.php` Automation Attempt Part B**](https://github.com/AniDevTwitter/animeopenings/tree/a6ea19bf372113338342b38362b8b1992778a26e) - It turns out the method we tried was much more computationally expensive than expected, so we decided to not do that. This puts `names.php` back to what it was before the previous release.
* [**`botnet.html` and `eggs.php` Changed to Sample Files**](https://github.com/AniDevTwitter/animeopenings/tree/f27ac24d4769e340b4631dfd2f25bb642990cf6f) - This release changed `botnet.html` and `eggs.php` to `botnet.html.sample` and `eggs.php.sample`, so you don't have to make a backup before updating anymore.
* [**`eggs.php` Change**](https://github.com/AniDevTwitter/animeopenings/tree/9c97b9cd18bb962bf0dd7bd85346c0cdba6dccf3) - This release added a function in `eggs.php.sample` to properly merge `$names` and `$eggs`. Make sure you have this function in your copy of `eggs.php`. It also added an `egg` attribute to every video entry in `eggs.php`. A video is now considered an Easter Egg if, and only if, it has the `egg` attribute. However if you put an Easter Egg in `names.php` instead of `eggs.php`, it will be shown on the list page even though it's an Easter Egg.
* [**Second `names.php` Automation Attempt**](https://github.com/AniDevTwitter/animeopenings/tree/8d4e722cdd1b366566a729d9e8fc9ffdb20e9338) - As part of our second attempt to automate encoding and `names.php` generation, the data stored in `names.php` and `eggs.php` was changed, and video files now have a required naming scheme. The change to the php files is that the file extension is no longer included in the file name, and instead the mime types of the available files (yes *files*, not *file*. we support multiple encodings of the same video now.) are stored (the example `names.php.sample` file was updated in a later commit [here](https://github.com/AniDevTwitter/animeopenings/tree/aee06dedf1d1ea1cb6aa3579632e4d7a4e54b469)). The mime types are used in the same order they're entered, so the smaller file should be listed first. The required format of video file names is `{name}-{OP,ED}{0,1,2,...}[{a,b,c,...}][TV][C]-[N]C{BD,DVD,PC,...}`. Easter Egg files are exempt from this requirement and can still be named whatever you want.
* [**`eggs.php` Removed**](https://github.com/AniDevTwitter/animeopenings/tree/5d9c4a2fb9151efbd13a1e3dfb315e45050d445a) - Since Easter Eggs are distinguished only by having the `egg` attribute, it didn't make sense to keep them in a separate file anymore. This release removed all references to `eggs.php`, instead using the `egg` attribute to distinguish them. This does mean that Easter Eggs now have to follow the same filename requirements as everything else, which are currently `{name}-{OP,IN,ED}{0,1,2,...}[{a,b,c,...}]-[N]C{BD,DVD,PC,...}`.
* [**Added Video Behaviors and Types**](https://github.com/AniDevTwitter/animeopenings/tree/c3941d19e79aa0fc005642682a1a9d75b18ccfab) - This release added Behavior and Type classifications for videos. Examples and documentation for these - and some other new parameters - are in `config_default.php`. Video Types are mostly for filtering, but video Behaviors replace Easter Eggs and the video `egg` attribute. Video Behaviors also allow for video files to be placed into different directories, and for specified videos to be played on an interval rather than by chance. The backend was almost completely rewritten to support this, and also to support getting a random video by index (the main page now gets video data for one video each time instead of loading the entire list the first time). The list API no longer supports the `filenames` and `first` parameters, and the details API now supports four new parameters (details are, as before, on the developer API documentation page). Your existing `names.php` file will still work, though videos can now have four more attributes: `title`, `uid`, `type`, and `behavior`. All configuration files are now validated and cached whenever they're changed, and they must pass validation to be used.
* [**Separated Values Returned by Details API**](https://github.com/AniDevTwitter/animeopenings/tree/master) - This release reorganized the data returned by the details API. The actual video data is now under "data", and the parameters to get the next video are now under "next". Also the "name" parameter was renamed to "uid".

## Things that won't be done:

* Minifying JavaScript (The bandwidth gains are not worth it considering the fact that all the videos they'll be viewing require roughly 3 mbit/s connections anyways, therefore this would serve no purpose for low bandwidth users. I'd rather let developers read the JS directly.)
