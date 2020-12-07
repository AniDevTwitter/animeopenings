<?php
// Validate and load the cache.
// See the documentation in the file for more information.
require_once __DIR__ . '/cache.php';


const FULLWIDTH_CHARS = ['＜','＞','：','＂','／','＼','｜','？','＊','．'];
const HALFWIDTH_CHARS = ['<','>',':','"','/','\\','|','?','*','.'];

const PREFIX_SEEN = 'seen_';
const PREFIX_SKIP = 'skip_';


/**
 * echo's the name of the function that calls this function, and
 * the name and line number of where that function was called from.
 */
function echoCallerLocation() {
	$backtrace = debug_backtrace();
	if (count($backtrace) > 1) {
		$bt_parent = $backtrace[1];
		echo $bt_parent['function'] . '() was called from ' . $bt_parent['file'] . ':' . $bt_parent['line'] . "\n";
	} else {
		echo 'an unknown function was called from an unknown location' . "\n";
	}
}

// Returns true if the given parameter is '', '1', 'true', 'on', or 'yes'.
function getQueryFlag(&$param) {
	return isset($param) && $param === '' || filter_var($param, FILTER_VALIDATE_BOOLEAN);
}

/**
 * Swaps the values in the given array at the given indexes.
 */
function swap(array &$array, $i, $j) {
	$temp = $array[$i];
	$array[$i] = $array[$j];
	$array[$j] = $temp;
	//echoCallerLocation();
}

// A function is used because not all mime types
// are the same as their file extension.
function mimeToExt($mime) {
	if (strpos($mime,'mp4') !== false) return '.mp4';
	if (strpos($mime,'webm') !== false) return '.webm';
	return '';
}


/**
 * Returns a random number using a variant of the xorshift RNG. The state must be handled manually.
 * To "seed" this RNG, just give the seed as the first state. The given state must never be 0, and
 * this RNG will always return a number greater than 0.
 *
 * The algorithm has been slightly modified by the addition of two &'s since PHP doesn't have
 * unsigned integers. This does slightly reduce the range of returned values, but not by much.
 *
 * RNG state is usually handled internally so that it can be called from anywhere without having to
 * pass the state around. But since we are manually handling the state anyways, there's no reason
 * to keep that extra variable.
 *
 * @param integer $state - The externally held state of this RNG.
 *
 * @return integer - A new random number.
 */
const XORSHIFT_MIN = 1;
const XORSHIFT_MAX = 2**(PHP_INT_SIZE*8-1) - 1;
if (PHP_INT_SIZE === 4) {
	function xorshift($state) {
		$state ^= $state << 13;
		$state ^= ($state >> 17) & 0x7FFF; // 2^(32-17) - 1
		$state ^= $state << 5;
		return $state & 0x7FFFFFFF; // 2^31 - 1
	}
} else if (PHP_INT_SIZE === 8) {
	function xorshift($state) {
		$state ^= $state << 21;
		$state ^= ($state >> 35) & 0x1FFFFFFF; // 2^(64-35) - 1
		$state ^= $state << 4;
		return $state & 0x7FFFFFFFFFFFFFFF; // 2^63 - 1
	}
}

/**
 * Returns a new random seed.
 *
 * @return integer - A new random seed.
 */
function getRandomSeed() {
	// mt_rand() is |'d with 1 because xorshift can't have 0 as a seed.
	// xorshift is then called five times because the initial values aren't the most random.
	return xorshift(xorshift(xorshift(xorshift(xorshift(mt_rand()|1)))));
}

/**
 * Returns the next seed and a new random number in the range [min,max).
 *
 * @param integer $seed - The seed to use for the RNG.
 * @param integer $min - The minimum value to return (inclusive).
 * @param integer $max - The maximum value to return (exclusive).
 *
 * @return array - The next RNG seed and the generated random number.
 */
function getRandomNumber($seed,$min,$max) {
	$seed = xorshift($seed);
	$num = $min + ($max - $min) * ($seed - XORSHIFT_MIN) / (1 + XORSHIFT_MAX - XORSHIFT_MIN);
	return [$seed,$num];
}


/**
 * Returns a list of video data.
 *
 * @param array $params - An associative array of parameters:
 *    bool     hidden      false   Whether or not to return "hidden" videos.
 *    bool     shuffle     false   Whether or not to shuffle the returned list.
 *
 * @return array - The list of video data.
 */
function getVideoList(array $params) {
	// get flags/defaults
	$show_hidden = getQueryFlag($params['hidden']);
	$shuffle = getQueryFlag($params['shuffle']);

	global $LIST_DATA;

	$output = [];
	foreach ($LIST_DATA as $source_name => $source_videos) {
		foreach ($source_videos as $video_title => $video_data) {
			if ($show_hidden || !$video_data['hidden']) {
				$video_data['source'] = $source_name;
				if (!$show_hidden) {
					unset($video_data['hidden']);
				}
				$output[] = $video_data;
			}
		}
	}

	if ($shuffle) {
		shuffle($output);
	}

	return $output;
}

/**
 * Returns the data of a given video, or a random video. "name" takes
 * precedence over "index" if both are given. If the type of the requested
 * video is one of the types to skip and "name" is given, null will be
 * returned. If "name" is not given, then a random video with an acceptable
 * type and an index greater than the given index will be returned. If no
 * acceptable videos can be found then the requested video will be returned.
 *
 * This function is designed to be passed parameters from an HTTP request,
 * which is why its array parameter is only one level deep. Also, any of the
 * values can be strings, but they will be converted to their specified type.
 * Note that an empty string will be converted to True, not False, to
 * accommodate GET parameters that are not set to anything.
 *
 * @param array $params - An associative array of parameters:
 *    string    name    ''     The identifier of a video to get.
 *    integer   index   0      When getting a random video, generate this many random videos before generating
 *                             the random video to return.
 *    integer   seed    null   The seed to be used by the random number generator. If a seed is not given, a
 *                             random one will be generated.
 *    integer   {PREFIX_SEEN}{behavior}   0   The number of videos previously returned of the specified behavior. Used
 *                                            to determine whether or not to show a video that is set to be shown on an
 *                                            interval. Only behaviors that can be shown on an interval need to be here.
 *    boolean   {PREFIX_SKIP}{type}   false   The video types to skip. True for '', '1', 'true', 'on', or 'yes'.
 *
 * @return array|null - The video data or null if the video couldn't be found.
 */
function getVideoData(array $params) {
	global $CACHE, $GROUPED_DATA;


	// Get an array of the behavior abbreviations.
	$behavior_abbreviations = [];
	foreach ($CACHE['BEHAVIORS'] as $key => $value) {
		if ($key !== $value['abbreviation']) continue;
		$behavior_abbreviations[] = $key;
	}

	// Get the chance of each behavior in an array, with each successive
	// value including the sum of the previous values. This way we can get
	// a random number between 0 and $total_behavior_chance, and just check
	// at each behavior if its value is less than the random value.
	$behavior_chances = [];
	$total_behavior_chance = 0;
	foreach ($CACHE['BEHAVIORS'] as $key => $value) {
		if ($key !== $value['abbreviation']) continue;
		$behavior_chances[$key] = $total_behavior_chance + $value['chance'];
		$total_behavior_chance += $value['chance'];
	}

	// Parse the parameters and set default values.
	// The parameters should not be modified after this block.
	{
		$index = isset($params['index']) ? intval($params['index'],10) : 0;

		// A $seed of 0 means we need to generate a seed.
		$seed = isset($params['seed']) ? intval($params['seed'],10) : 0;
		if ($seed === 0) {
			$seed = getRandomSeed();
		}

		// Remove the prefix from the seen behaviors and create a new mapping
		// that has all of the behaviors, in the same order they were defined,
		// and all using their abbreviation.
		$behaviors_last_seen = array_fill_keys($behavior_abbreviations,0);
		foreach ($params as $key => $value) {
			if (strncasecmp($key,PREFIX_SEEN,5) === 0) {
				$skey = substr($key,5);
				if (isset($CACHE['BEHAVIORS'][$skey])) {
					$behavior = $CACHE['BEHAVIORS'][$skey];
					$behaviors_last_seen[$behavior['abbreviation']] = intval($value,10);
				}
			}
		}

		// Remove the prefix from the types to skip and convert them into a set
		// containing both the name and abbreviation of the valid types in the
		// given array for easier lookup later.
		$types_to_skip = [];
		foreach ($params as $key => $value) {
			if (strncasecmp($key,PREFIX_SKIP,5) === 0 && getQueryFlag($value)) {
				$skey = substr($key,5);
				if (isset($CACHE['TYPES'][$skey])) {
					$type = $CACHE['TYPES'][$skey];
					$types_to_skip[$type['name']] = true;
					$types_to_skip[$type['abbreviation']] = true;
				}
			}
		}
		// Check if all types are set to be skipped.
		if (count(array_diff_key($CACHE['TYPES'],$types_to_skip)) === 0) {
			// If all types are skipped it will not be possible to get a video by name, so just return here.
			if (isset($params['name'])) return null;
			// When getting a video by index all types being skipped is the same as no
			// videos being skipped, but slower, so we'll just unset all of those.
			$types_to_skip = [];
		}
	}


	$data = null;
	$index_of_video = $index;
	$behavior_selected = '';

	if (isset($params['name'])) {
		// Try to find the video by name.
		$c = new Collator('');
		$name = $params['name'];
		$FILENAME_AS_BACKUP_UID = $CACHE['FILENAME_AS_BACKUP_UID'];
		foreach ($GROUPED_DATA as $behavior => $group_data) {
			foreach ($group_data as $source) {
				foreach ($source['videos'] as $video) {
					$ident = isset($video['uid']) ? $video['uid'] : $video['file'];
					if ($c->compare($ident,$name) === 0 || ($FILENAME_AS_BACKUP_UID && $c->compare($video['file'],$name) === 0)) {
						// We found the video and its type is not in the list to skip.
						if (!isset($types_to_skip[$video['type']])) {
							$data = $video;
							$data['source'] = $source['source'];
							$source_videos = $source['videos'];
							$behavior_selected = $behavior;
						}
						break 3;
					}
				}
			}
		}

		if ($data === null) return null;

		// Get the video index.
		$selected_behavior = $CACHE['BEHAVIORS'][$behavior_selected];
		if ($selected_behavior['chance'] === 0 && $selected_behavior['interval'] === 0) {
			// If both the chance and interval for this video's behavior are 0
			// then there is no index that could be used to reach it, so we'll
			// just go with this.
			$index_of_video = -1;
		} else {
			$index_of_video = 0;

			// Determine how many times we would have to loop through this behavior to get to this video.
			$video_seed = $seed;
			$num_videos_for_source = count($source_videos);
			$num_videos_for_behavior = $selected_behavior['count'];
			for ($v = 0; $v < $num_videos_for_source; ++$v) {
				list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
				swap($source_videos,$video_index,$v);
				if ($source_videos[$v]['file'] === $data['file']) {
					break;
				}
				$index_of_video += $num_videos_for_behavior;
			}

			// Determine how many times this behavior has to be selected to get our source.
			$sources_seed = $seed;
			$selected_behavior_sources = $GROUPED_DATA[$behavior_selected];
			$num_sources_for_behavior = count($selected_behavior_sources);
			for ($s = 0; $s <= $num_sources_for_behavior; ++$s) {
				list($sources_seed,$source_index) = getRandomNumber($sources_seed,$s,$num_sources_for_behavior);
				swap($selected_behavior_sources,$source_index,$s);
				if ($selected_behavior_sources[$s]['source'] === $data['source']) {
					break;
				}
				++$index_of_video;
			}

			// Determine how many times a different behavior is selected before this behavior has been selected enough times to get our video.
			if (count($behavior_chances) > 1 && ) {
				$seed_copy = $seed;
				$this_behavior_selected = 0;
				$other_behaviors_selected = 0;
				while ($this_behavior_selected < $index_of_video) {
					list($seed_copy,$num) = getRandomNumber($seed_copy,0,$total_behavior_chance);
					foreach ($behavior_chances as $behavior => $chance) {
						if ($num < $chance) {
							if ($behavior === $behavior_selected)
								++$this_behavior_selected;
							else
								++$other_behaviors_selected;
							break;
						}
					}
				}
				$index_of_video += $other_behaviors_selected;
			}
		}
	} else {
		// Count the number of times each behavior has been selected based on the current index.
		$seed_copy = $seed;
		$behavior_selected_count = array_fill_keys($behavior_abbreviations,0);
		for ($i = 0; $i < $index; ++$i) {
			list($seed_copy,$num) = getRandomNumber($seed_copy,0,$total_behavior_chance);
			foreach ($behavior_chances as $behavior => $chance) {
				if ($num < $chance) {
					$behavior_selected = $behavior;
					++$behavior_selected_count[$behavior];
					break;
				}
			}
		}

		// Check if a behavior with a set interval must be chosen.
		foreach ($behaviors_last_seen as $behavior => $last_seen) {
			if ($last_seen > 0 && $CACHE['BEHAVIORS'][$behavior]['interval'] <= $last_seen) {
				$behavior_selected = $behavior;
				break;
			}
		}


		$selected_behavior = $CACHE['BEHAVIORS'][$behavior_selected];
		$times_behavior_seen = $behavior_selected_count[$behavior_selected];
		$selected_behavior_sources = $GROUPED_DATA[$behavior_selected];
		$num_sources_for_behavior = count($selected_behavior_sources);
		$num_videos_for_behavior = $selected_behavior['count'];


		// Partially shuffle the sources up to the one we want.
		$sources_seed = $seed;
		$first_source_index = $times_behavior_seen % $num_sources_for_behavior;
		$first_video_index = intval($times_behavior_seen / $num_sources_for_behavior);
		for ($s = 0; $s <= $first_source_index; ++$s) {
			list($sources_seed,$source_index) = getRandomNumber($sources_seed,$s,$num_sources_for_behavior);
			swap($selected_behavior_sources,$source_index,$s);
		}

		// Partially shuffle the videos in the sources we want up to the video we want.
		$video_seed = $seed;
		$source_videos =& $selected_behavior_sources[$first_source_index]['videos'];
		$num_videos_for_source = count($source_videos);
		$real_first_video_index = $first_video_index % $num_videos_for_source;
		for ($v = 0; $v <= $real_first_video_index; ++$v) {
			list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
			swap($source_videos,$video_index,$v);
		}

		$video = $source_videos[$real_first_video_index];
		$index_of_video = $index;
		// Use a loop so we can break out of it instead of checking if $video is null each time.
		do {
			// Check if the video we want is acceptable.
			if (!isset($types_to_skip[$video['type']])) {
				$video['source'] = $selected_behavior_sources[$first_source_index]['source'];
				break;
			}

			// Shuffle the rest of the videos in this source to see if any of them are acceptable.
			for ($v = $real_first_video_index + 1; $v < $num_videos_for_source; ++$v) {
				list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
				swap($source_videos,$video_index,$v);

				$video = $source_videos[$v];
				$index_of_video += $num_sources_for_behavior;
				if (!isset($types_to_skip[$video['type']])) {
					$video['source'] = $selected_behavior_sources[$first_source_index]['source'];
					break 2;
				}
			}

			// If we didn't find a video, continue shuffling the rest of the sources,
			// shuffling their videos, and checking if any of them are acceptable.
			for ($s = $first_source_index + 1; $s < $num_sources_for_behavior; ++$s) {
				$video_seed = $seed;
				$source_videos =& $selected_behavior_sources[$s]['videos'];
				$num_videos_for_source = count($source_videos);

				list($sources_seed,$source_index) = getRandomNumber($sources_seed,$s,$num_sources_for_behavior);
				swap($selected_behavior_sources,$source_index,$s);
				for ($v = 0; $v < $num_videos_for_source; ++$v) {
					list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
					swap($source_videos,$video_index,$v);

					$video = $source_videos[$v];
					if (!isset($types_to_skip[$video['type']])) {
						$video['source'] = $selected_behavior_sources[$s]['source'];
						$index_of_video = $num_sources_for_behavior * $v + $s;
						while ($index_of_video < $index) {
							$index_of_video += $num_sources_for_behavior * $num_videos_for_source;
						}
						break 3;
					}
				}
			}

			// If we still haven't found a video, loop around to the start and shuffle
			// the videos in the source before the source we started with.
			for ($s = 0; $s < $first_source_index; ++$s) {
				$video_seed = $seed;
				$source_videos =& $selected_behavior_sources[$s]['videos'];
				$num_videos_for_source = count($source_videos);
				for ($v = 0; $v < $num_videos_for_source; ++$v) {
					list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
					swap($source_videos,$video_index,$v);

					$video = $source_videos[$v];
					if (!isset($types_to_skip[$video['type']])) {
						$video['source'] = $selected_behavior_sources[$s]['source'];
						$index_of_video = $num_sources_for_behavior * $v + $s;
						while ($index_of_video < $index) {
							$index_of_video += $num_sources_for_behavior * $num_videos_for_source;
						}
						break 3;
					}
				}
			}

			// If we still haven't found a video just use the one we originally wanted.
			$temp = $selected_behavior_sources[$first_source_index];
			$video = $temp['videos'][$real_first_video_index];
			$index_of_video = $index;
			$video['source'] = $temp['source'];
		} while (false);

		$data = $video;
	}


	if ($data !== null) {
		// Set the output values.
		$data['path'] = $CACHE['BEHAVIORS'][$behavior_selected]['src_dir'];
		$data['index'] = $index_of_video;
		$data['seed'] = $seed;

		// Copy last seen values for behaviors that have an interval, incrementing them by one.
		$data['seen'] = [];
		$behaviors_last_seen[$behavior_selected] = -1;
		foreach ($behaviors_last_seen as $behavior => $last_seen) {
			if ($CACHE['BEHAVIORS'][$behavior]['interval'] > 0) {
				$data['seen'][$behavior] = $last_seen + 1;
			}
		}

		// Copy the abbreviations of the types to skip.
		$data['skip'] = [];
		foreach ($CACHE['TYPES'] as $name => $type) {
			if ($name !== $type['abbreviation']) continue;
			$abbr = $type['abbreviation'];
			if (isset($types_to_skip[$abbr])) {
				$data['skip'][] = $abbr;
			}
		}
	}

	return $data;
}
