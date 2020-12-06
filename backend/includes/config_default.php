<?php
// This file contains the default values for all of the available settings.
// These values are validated and cached in 'cache_config.php', and are reloaded with different names. Check 'cache_config.php' for their actual names.
// To overwrite these values, create a copy of this file named 'config.php' in this directory. 'config.php' is not optional.
// This file is loaded before 'config.php', so you can extend these values instead of overwriting them if you want to.
// All config values are validated and cached every time they or the video list are changed.


// The base URL of this website (ex. 'openings.moe'). You must set this to a non-empty string in 'config.php'.
$WEBSITE_URL = '';


/* Video Behaviors and Video Types
Behaviors determine the ordering and frequency of the videos and where they can be found.
Types determine how a video will be displayed and are mostly used for filtering.

A type name/abbreviation cannot be the same as any other type name/abbreviation unless they refer to the same type.
A behavior name/abbreviation cannot be the same as any other behavior name/abbreviation unless they refer to the same behavior.
The type/behavior with the '' abbreviation will be used as the default if one has not been specified for a video.
Type/Behavior names cannot be '' because they are displayed on the website.
A video will be 'hidden' if either one of its type or behavior has 'hidden' set to True.

Video Behaviors:
Chances and intervals must be non-negative integers.
Intervals take precedence over chance.
If both chance and interval are greater than 0, the interval will be counted from the last video, even if it was displayed by chance.
If more than one behavior with an interval end up trying to be shown at the same time, they will be shown in the order they appear in this list.
*/
$VIDEO_BEHAVIORS = [
	[
		'name' => 'Other',
		'abbreviation' => '',
		'chance' => 99,			// The chance that a video in this group will be returned, calculated as `chance / sum(chances)`.
		'interval' => 0,		// If not 0, a video with this behavior must be shown every "interval" videos on the main page.
		'hidden' => False,		// Whether or not to show these videos on the list page and include them in the video history on the main page.
		'src_dir' => 'video'	// The directory that videos of this type are located in.
	], [
		'name' => 'Easter Egg',
		'abbreviation' => 'EE',
		'chance' => 1,
		'interval' => 0,
		'hidden' => True,
		'src_dir' => 'video'
	], [
		'name' => 'Jingle',
		'abbreviation' => 'JI',
		'chance' => 0,
		'interval' => 6,
		'hidden' => True,
		'src_dir' => 'video'
	]
];
$VIDEO_TYPES = [
	[
		'name' => 'Other',
		'abbreviation' => '',
		'hidden' => False
	], [
		'name' => 'Opening',
		'abbreviation' => 'OP',
		'hidden' => False
	], [
		'name' => 'Insert',
		'abbreviation' => 'IN',
		'hidden' => False
	], [
		'name' => 'Ending',
		'abbreviation' => 'ED',
		'hidden' => False
	], [
		'name' => 'Easter Egg',
		'abbreviation' => 'EE',
		'hidden' => True
	], [
		'name' => 'Jingle',
		'abbreviation' => 'JI',
		'hidden' => True
	]
];

// Whether or not to allow unused video behaviors/types.
// false: unused entries are ignored
// true: unused entries will log an error message that must be fixed
$ERROR_ON_UNUSED_VIDEO_BEHAVIOR = false;
$ERROR_ON_UNUSED_VIDEO_TYPE = false;

// Whether or not to allow undeclared video behaviors/types.
// That is, if a video has a value for its behavior/type, but
// that behavior/type does not exist in $VIDEO_BEHAVIORS/$VIDEO_TYPES.
// false: undeclared entries will use the default behavior/type
// true: undeclared entries will log an error message that must be fixed
$ERROR_ON_UNDECLARED_VIDEO_BEHAVIOR = true;
$ERROR_ON_UNDECLARED_VIDEO_TYPE = true;

// If a UID is not given the filename will be used instead. If a UID is given
// the filename will not be used as a UID. Set this to true to treat both the
// given UID and filename as UID's.
$FILENAME_AS_BACKUP_UID = false;


// The e-mail addresses to send video submissions to.
$SUBMISSION_EMAIL_TO = '';
// The https://www.mailgun.com/ URL, with API key, to send e-mail to.
$MAILGUN_URL = '';
// The https://www.mailgun.com/ e-mail address to use.
$MAILGUN_EMAIL = '';
