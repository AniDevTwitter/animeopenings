<?php
// This file contains the default values for all of the available settings.
// By ensuring they are all set here, we don't have check that they are set before using them.
// To overwrite these values, create a copy of this file named 'config.php' in this directory.

// The base URL of this website (ex. 'openings.moe'). If this is not set in 'config.php' it will
// return an HTTP error and die.
$WEBSITE_URL = '';

// This specifies the number of digits that the index number in video filenames is padded to.
$VIDEO_INDEX_PADDING = 2;
// If true, this specifies that the name of the video file should be used as its URL identifier.
$USE_FILENAME_AS_IDENTIFIER = false;

// The e-mail addresses to send video submissions to.
$SUBMISSION_EMAIL_TO = '';
// The https://www.mailgun.com/ URL, with API key, to send e-mail to.
$MAILGUN_URL = '';
// The https://www.mailgun.com/ e-mail address to use.
$MAILGUN_EMAIL = '';
?>
