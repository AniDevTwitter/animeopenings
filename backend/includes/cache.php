<?php
/*
This file validates the configuration settings and the video metadata file,
caching the results if there are no errors. If there are errors it will write
them to the output and die with a HTTP 500 error code.

Input:
	The input is all taken from other PHP files in this repository.

	config_default.php
		This file is commented with everything you need to know about it.
	config.php
		Overrides for config_default.php.
	names.php
		This file contains the video metadata for all videos to be displayed.
		names.php.sample contains information on the required format.

Output:
	The output is stored as PHP files, but these files should not be handled
	manually. This file automatically includes all of the cache files, and
	their data can be accessed using the variables specified below.

	$CACHE = [
		'WEBSITE_URL' => $WEBSITE_URL,
		'FILENAME_AS_BACKUP_UID' => $FILENAME_AS_BACKUP_UID,
		'SUBMISSION_EMAIL_TO' => $SUBMISSION_EMAIL_TO,
		'MAILGUN_URL' => $MAILGUN_URL,
		'MAILGUN_EMAIL' => $MAILGUN_EMAIL,
		'BEHAVIORS' => [
			Associative array of video behavior metadata. The keys of this
			array are the names and the abbreviations of the used behaviors.
			The behavior metadata layout can be seen in config_default.php.
			These behaviors also include a 'count' value of the number of
			videos that have this behavior.
		],
		'TYPES' => [
			Associative array of video type metadata. The keys of this
			array are the names and the abbreviations of the used types.
			The type metadata layout can be seen in config_default.php.
			These types also include a 'count' value of the number of
			videos that have this type.
		],
		'NUM_SOURCES' => < Count of all sources. >,
		'NUM_VIDEOS' => < Count of all videos. >
	]

	$GROUPED_DATA = [
		Associative array of arrays of video data grouped by behavior for getting random videos.
		< behavior abbr. > => array of [
			'source' => < source name >,
			'videos' => array of [
				'title' => < video title >,
				'file' => < video filename >,
				'mime' => < video mime type(s) >,
				'type' => < video type >,
				optional 'uid' => < uid >,
				optional 'song' => [
					'title' => < song title >,
					'artist' => < song artist >
				],
				optional 'subtitles' => < subtitle group name >,
				optional 'hidden' => < video type/abbreviation is hidden; set iff true >
			]
		]
	]

	$LIST_DATA = [
		Contains the video data in the order specified in names.php for printing to the list page.
		< source name > => array of [
			< video title > => [
				'uid' => < uid >,
				'hidden' => < video type/abbreviation is hidden >,
				optional 'song' => [
					'title' => < song title >,
					'artist' => < song artist >
				],
				optional 'subtitles' => < subtitle group name >
			]
		]
	]
*/

// Make sure cache directory exists.
$cache_dir = __DIR__ . '/cache';
if (!is_dir($cache_dir)) mkdir($cache_dir);
$main_cache_file = $cache_dir . '/main.php';
$grouped_cache_file = $cache_dir . '/grouped.php';
$list_cache_file = $cache_dir . '/list.php';

// Load and validate the config files, caching the result.
// This is in a function to contain variable scope.
function validateConfig() {
	$default_config_file = __DIR__ . '/config_default.php';
	$config_file = __DIR__ . '/config.php';
	global $main_cache_file, $grouped_cache_file, $list_cache_file;
	$video_metadata_file = __DIR__ . '/../../names.php';
	$errors = [];

	// Check that the required files exist.
	if (!is_file($default_config_file)) $errors[] = 'The default config file is missing.';
	if (!is_file($config_file)) $errors[] = 'A local config file is missing.';
	if ($errors) return $errors;

	// If we have a cached config and it's still valid.
	$cache_last_modified = @filemtime($main_cache_file);
	if (is_file($main_cache_file) &&
		$cache_last_modified > @filemtime($default_config_file) &&
		$cache_last_modified > @filemtime($config_file) &&
		$cache_last_modified > @filemtime(__FILE__)) {
		return [];
	}

	require $default_config_file;
	require $config_file;


	// Check that the website URL is set.
	if ($WEBSITE_URL === '') $errors[] = '$WEBSITE_URL has not been set.';

	// The data to eventually cache.
	$CACHE = [
		'WEBSITE_URL' => $WEBSITE_URL,
		'FILENAME_AS_BACKUP_UID' => (bool)$FILENAME_AS_BACKUP_UID,
		'SUBMISSION_EMAIL_TO' => $SUBMISSION_EMAIL_TO,
		'MAILGUN_URL' => $MAILGUN_URL,
		'MAILGUN_EMAIL' => $MAILGUN_EMAIL,
		'BEHAVIORS' => [],
		'TYPES' => [],
		'NUM_SOURCES' => 0,
		'NUM_VIDEOS' => 0
	];
	$GROUPED_DATA = [];
	$LIST_DATA = [];

	// Validate and cache video behaviors.
	foreach ($VIDEO_BEHAVIORS as &$behavior) {
		$name = $behavior['name'];
		$abbr = $behavior['abbreviation'];

		// Check that names and abbreviations are unique strings and that names are not empty.
		if ($name === '')
			$errors[] = 'One of the $VIDEO_BEHAVIORS names is empty.';
		if (!is_string($name))
			$errors[] = 'One of the $VIDEO_BEHAVIORS names is not a string.';
		if (!is_string($abbr))
			$errors[] = 'One of the $VIDEO_BEHAVIORS abbreviations is not a string.';

		if (isset($CACHE['BEHAVIORS'][$name]))
			$errors[] = 'The $VIDEO_BEHAVIORS name "' . $name . '" is used more than once.';
		if ($name !== $abbr && isset($CACHE['BEHAVIORS'][$abbr]))
			$errors[] = 'The $VIDEO_BEHAVIORS abbreviation "' . $abbr . '" is used more than once.';

		// Check that chances and intervals are non-negative integers.
		if ($behavior['chance'] < 0)
			$errors[] = 'The chance of "' . $name . '" occurring is less than 0.';
		if ($behavior['interval'] < 0)
			$errors[] = 'The interval for "' . $name . '" is less than 0.';
		if (!is_int($behavior['chance']))
			$errors[] = 'The chance for "' . $name . '" is not an integer.';
		if (!is_int($behavior['interval']))
			$errors[] = 'The interval for "' . $name . '" is not an integer.';

		// Coerce "hidden" to a boolean.
		$behavior['hidden'] = (bool)$behavior['hidden'];

		// Check that "src_dir" is a string.
		if (!is_string($behavior['src_dir']))
			$errors[] = 'The source directory for the "' . $name . '" video behavior is not a string.';

		// Add a count to use later.
		$behavior['count'] = 0;

		// Cache the Values
		$CACHE['BEHAVIORS'][$name] = &$behavior;
		$CACHE['BEHAVIORS'][$abbr] = &$behavior;
	}
	unset($behavior);

	// Validate and cache video types.
	foreach ($VIDEO_TYPES as &$type) {
		$name = $type['name'];
		$abbr = $type['abbreviation'];

		// Check that names and abbreviations are unique strings and that names are not empty.
		if ($name === '')
			$errors[] = 'One of the $VIDEO_TYPES names is empty.';
		if (!is_string($name))
			$errors[] = 'One of the $VIDEO_TYPES names is not a string.';
		if (!is_string($abbr))
			$errors[] = 'One of the $VIDEO_TYPES abbreviations is not a string.';

		// Coerce "hidden" to a boolean.
		$type['hidden'] = (bool)$type['hidden'];

		if (isset($CACHE['TYPES'][$name]))
			$errors[] = 'The $VIDEO_TYPES name "' . $name . '" is used more than once.';
		if ($name !== $abbr && isset($CACHE['TYPES'][$abbr]))
			$errors[] = 'The $VIDEO_TYPES abbreviation "' . $abbr . '" is used more than once.';

		// Add a count to use later.
		$type['count'] = 0;

		// Cache the Values
		$CACHE['TYPES'][$name] = &$type;
		$CACHE['TYPES'][$abbr] = &$type;
	}
	unset($type);

	// Default behavior/type in case they aren't set and they should be.
	$missing_default_behavior = ['abbreviation' => '', 'count' => 0];
	$missing_default_type = ['abbreviation' => '', 'count' => 0];

	// Validate and cache video data and count the number of each behavior and type.
	$video_identifiers = [];
	require $video_metadata_file;
	foreach ($names as $source => $videos) {
		$new_list_videos = [];

		foreach ($videos as $old_video_title => $data) {
			$video_title = isset($data['title']) ? $data['title'] : $old_video_title;
			if (!isset($data['file'])) {
				if (is_int($video_title)) {
					$errors[] = "The filename of the video at index $video_title of $source was not declared.";
				} else {
					$errors[] = "The filename of $source $video_title was not declared.";
				}
				continue;
			}

			$filename = $data['file'];
			if (is_int($video_title)) {
				$video_title = $filename;
			}

			if (!isset($data['mime'])) {
				$errors[] = "No mime types for $source $video_title were declared.";
				continue;
			}

			// required attributes
			$new_data = [
				'file' => $filename,
				'mime' => $data['mime']
			];

			// optional attributes
			if (isset($data['uid']) && $data['uid'] !== '' && $data['uid'] !== $filename) {
				$new_data['uid'] = $data['uid'];
			}
			if (isset($data['song']['title']) || isset($data['song']['artist'])) {
				$temp = $data['song'];
				$new_data['song'] = [
					'title' => isset($temp['title']) ? $temp['title'] : '',
					'artist' => isset($temp['artist']) ? $temp['artist'] : ''
				];
			}
			if (isset($data['subtitles'])) {
				$new_data['subtitles'] = $data['subtitles'];
			}

			// count the number of times each video identifier is used
			// an error will be added later if it's not 1
			$ident = isset($new_data['uid']) ? $new_data['uid'] : $filename;
			if (!isset($video_identifiers[$ident])) {
				$video_identifiers[$ident] = 0;
			}
			++$video_identifiers[$ident];
			if ($FILENAME_AS_BACKUP_UID && isset($new_data['uid'])) {
				if (!isset($video_identifiers[$filename])) {
					$video_identifiers[$filename] = 0;
				}
				++$video_identifiers[$filename];
			}

			// get video behavior
			$temp = '';
			if (isset($data['behavior'])) {
				$behavior = $data['behavior'];
				if (isset($CACHE['BEHAVIORS'][$behavior])) {
					$temp = $CACHE['BEHAVIORS'][$behavior]['abbreviation'];
				} else if ($ERROR_ON_UNDECLARED_VIDEO_BEHAVIOR) {
					$errors[] = "The video behavior for $source $video_title ($behavior) was not declared.";
				}
			}
			$new_data['behavior'] = $temp;
			if ($temp === '' && !isset($CACHE['BEHAVIORS'][''])) {
				$errors[] = 'The default video behavior was not declared.';
				$CACHE['BEHAVIORS'][''] = &$missing_default_behavior;
			}
			++$CACHE['BEHAVIORS'][$temp]['count'];

			// get video type
			$temp = '';
			if (isset($data['type'])) {
				$type = $data['type'];
				if (isset($CACHE['TYPES'][$type])) {
					$temp = $CACHE['TYPES'][$type]['abbreviation'];
				} else if ($ERROR_ON_UNDECLARED_VIDEO_TYPE) {
					$errors[] = "The video type for $source $video_title ($type) was not declared.";
				}
			}
			$new_data['type'] = $temp;
			if ($temp === '' && !isset($CACHE['TYPES'][''])) {
				$errors[] = 'The default video type was not declared.';
				$CACHE['TYPES'][''] = &$missing_default_type;
			}
			++$CACHE['TYPES'][$temp]['count'];

			// if this video is 'hidden'
			$is_hidden = $CACHE['TYPES'][$new_data['type']]['hidden'] || $CACHE['BEHAVIORS'][$new_data['behavior']]['hidden'];

			{ // Create a new object containing the video data needed for the grouped cache.
				$behavior = $new_data['behavior'];
				$new_grouped_data = [
					'title' => $video_title,
					'file' => $filename,
					'mime' => $new_data['mime'],
					'type' => $new_data['type']
				];
				if (isset($new_data['uid'])) {
					$new_grouped_data['uid'] = $new_data['uid'];
				}
				if (isset($new_data['song'])) {
					$new_grouped_data['song'] = $new_data['song'];
				}
				if (isset($new_data['subtitles'])) {
					$new_grouped_data['subtitles'] = $new_data['subtitles'];
				}
				if ($is_hidden) {
					$new_grouped_data['hidden'] = true;
				}

				if (!isset($GROUPED_DATA[$behavior][$source])) {
					$GROUPED_DATA[$behavior][$source] = [];
				}
				$GROUPED_DATA[$behavior][$source][] = $new_grouped_data;
			}

			{ // Create a new object containing the video data needed for the list cache.
				$new_list_data = [
					'uid' => $ident,
					'hidden' => $is_hidden
				];
				if (isset($new_data['song'])) {
					$new_list_data['song'] = $new_data['song'];
				}
				if (isset($new_data['subtitles'])) {
					$new_list_data['subtitles'] = $new_data['subtitles'];
				}
				$new_list_videos[$video_title] = $new_list_data;
			}

			++$CACHE['NUM_VIDEOS'];
		}

		$LIST_DATA[$source] = $new_list_videos;

		++$CACHE['NUM_SOURCES'];
	}

	// Rearrange $GROUPED_DATA so that the data for each behavior
	// is an indexed array rather than an associative array.
	foreach ($GROUPED_DATA as $group => $group_data) {
		$new_group_data = [];
		foreach ($group_data as $source => $videos) {
			$new_group_data[] = [
				'source' => $source,
				'videos' => $videos
			];
		}
		$GROUPED_DATA[$group] = $new_group_data;
	}

	// Check that each video identifier was only used once.
	foreach ($video_identifiers as $ident => $count) {
		if ($count > 1) {
			$errors[] = "The video identifier \"$ident\" was used $count times.";
		}
	}

	// Check that all of the declared video behaviors/types
	// were used and remove the ones that weren't.
	foreach ($CACHE['BEHAVIORS'] as $key => $behavior) {
		$abbr = $behavior['abbreviation'];
		if ($key !== $abbr) continue;
		$name = $behavior['name'];
		if ($behavior['count'] === 0) {
			if ($ERROR_ON_UNUSED_VIDEO_BEHAVIOR) {
				$errors[] = "The video behavior \"$name\" ($abbr) was not used.";
			}
			unset($CACHE['BEHAVIORS'][$name]);
			unset($CACHE['BEHAVIORS'][$abbr]);
		}
	}
	foreach ($CACHE['TYPES'] as $key => $type) {
		$abbr = $type['abbreviation'];
		if ($key !== $abbr) continue;
		$name = $type['name'];
		if ($type['count'] === 0) {
			if ($ERROR_ON_UNUSED_VIDEO_TYPE) {
				$errors[] = "The video type \"$name\" ($abbr) was not used.";
			}
			unset($CACHE['TYPES'][$name]);
			unset($CACHE['TYPES'][$abbr]);
		}
	}


	if ($errors) return $errors;

	// Cache the validated data.
	file_put_contents($main_cache_file, '<?php' . PHP_EOL . '$CACHE = ' . var_export($CACHE,true) . ';' . PHP_EOL);
	file_put_contents($grouped_cache_file, '<?php' . PHP_EOL . '$GROUPED_DATA = ' . var_export($GROUPED_DATA,true) . ';' . PHP_EOL);
	file_put_contents($list_cache_file, '<?php' . PHP_EOL . '$LIST_DATA = ' . var_export($LIST_DATA,true) . ';' . PHP_EOL);
	chmod($main_cache_file, 0664);
	chmod($grouped_cache_file, 0664);
	chmod($list_cache_file, 0664);

	return [];
}

// Validate Config
$configValidationErrors = validateConfig();
if ($configValidationErrors) {
	header('HTTP/1.0 500 Internal Server Error');
	header('Content-Type: text/plain');
	echo 'The website configuration contains errors:' . "\n" . join("\n",$configValidationErrors) . "\n";
	die();
}
unset($configValidationErrors);

// Load Cached Data
require $main_cache_file;
require $grouped_cache_file;
require $list_cache_file;
