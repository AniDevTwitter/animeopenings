<?php
// Validate and load the cache.
// See the documentation in the file for more information.
require_once __DIR__ . '/cache.php';


const FULLWIDTH_CHARS = ['＜','＞','：','＂','／','＼','｜','？','＊','．'];
const HALFWIDTH_CHARS = ['<','>',':','"','/','\\','|','?','*','.'];

const PREFIX_INDEX = 'index_';
const PREFIX_SEEN_LAST = 'seen_last_';
const PREFIX_SKIP = 'skip_';
const PREFIX_INDEX_LEN = 6;//strlen(PREFIX_INDEX);
const PREFIX_SEEN_LAST_LEN = 10;//strlen(PREFIX_SEEN_LAST);
const PREFIX_SKIP_LEN = 5;//strlen(PREFIX_SKIP);


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
 * Returns the data of the video with the given UID, or a random video if a UID
 * is not given. When getting a random video, the given indexes are considered
 * a starting point, not an exact position to find. If there are no videos on
 * this website then no video data will be returned.
 *
 * If "strict" is False and a strict match is not found, the video types to
 * skip will be ignored. If a match is still not found and a UID was given,
 * the video with the UID most similar to the one given will be returned.
 *
 * This function is designed to be passed parameters from an HTTP request,
 * which is why its array parameters are only one level deep. Also, any of the
 * values can be strings, but they will be converted to their specified type.
 * Note that an empty string will be converted to True, not False, to
 * accommodate GET parameters that are not set to anything. The values that are
 * considered True are: '', '1', 'true', 'on', and 'yes'.
 *
 * @param array $params  - An associative array of parameters:
 *    string    uid      ''     The identifier of a video to get.
 *    integer   seed     null   The main seed to be used by the random number generator. If this seed is not given,
 *                              a random one will be generated.
 *    integer   seed_b   seed   A second seed to be used by the random number generator. This one exists for
 *                              performance reasons.
 *    integer   {PREFIX_INDEX}{behavior}       0   The index of the random video of a random behavior to get.
 *    integer   {PREFIX_SEEN_LAST}{behavior}   0   The number of videos that have been seen since this behavior was
 *                                                 last seen. Used to determine whether or not to show a video that is
 *                                                 set to be shown on an interval. Only behaviors that can be shown on
 *                                                 an interval need to be here.
 *    boolean   {PREFIX_SKIP}{type}   false   The video types to skip.
 *    boolean   strict                false   Whether or not to find an exact match.
 *
 * @return array - An associative array: [
 *                     optional 'data' => [ < video data > ],
 *                     optional 'next' => [ < The params to use to get the next random video. > ],
 *                     optional 'comment' => '< a comment or error message >'
 *                 ]
 */
function getVideoData(array $params) {
	global $CACHE, $GROUPED_DATA;

	if ($CACHE['NUM_VIDEOS'] === 0) {
		return ['comment' => 'There are no videos to get.'];
	}


	// Get an array of the behavior abbreviations.
	$behavior_abbreviations = [];
	foreach ($CACHE['BEHAVIORS'] as $key => $value) {
		if ($key !== $value['abbreviation']) continue;
		$behavior_abbreviations[] = $key;
	}

	// Parse the parameters and set default values.
	// The parameters should not be modified after this block.
	{
		// "uid" is just a string so it doesn't need to be parsed here.

		// A $seed of 0 means we need to generate a seed.
		$seed = isset($params['seed']) ? intval($params['seed'],10) : 0;
		if ($seed === 0) {
			$seed = getRandomSeed();
		}

		$seed_b = isset($params['seed_b']) ? intval($params['seed_b'],10) : $seed;

		// Remove the prefix from the indexes and create a new mapping that has
		// all of the behaviors, in the same order they were defined, and all
		// using their abbreviation.
		$indexes = array_fill_keys($behavior_abbreviations,0);
		foreach ($params as $key => $value) {
			if (strncasecmp($key,PREFIX_INDEX,PREFIX_INDEX_LEN) === 0) {
				$skey = substr($key,PREFIX_INDEX_LEN);
				if (isset($CACHE['BEHAVIORS'][$skey])) {
					$behavior = $CACHE['BEHAVIORS'][$skey];
					$indexes[$behavior['abbreviation']] = intval($value,10);
				}
			}
		}

		// Remove the prefix from the last seen behaviors and create a new
		// mapping that has all of the behaviors, in the same order they were
		// defined, and all using their abbreviation.
		$behaviors_last_seen = array_fill_keys($behavior_abbreviations,0);
		foreach ($params as $key => $value) {
			if (strncasecmp($key,PREFIX_SEEN_LAST,PREFIX_SEEN_LAST_LEN) === 0) {
				$skey = substr($key,PREFIX_SEEN_LAST_LEN);
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
			if (strncasecmp($key,PREFIX_SKIP,PREFIX_SKIP_LEN) === 0 && getQueryFlag($value)) {
				$skey = substr($key,PREFIX_SKIP_LEN);
				if (isset($CACHE['TYPES'][$skey])) {
					$type = $CACHE['TYPES'][$skey];
					$types_to_skip[$type['name']] = true;
					$types_to_skip[$type['abbreviation']] = true;
				}
			}
		}

		$strict = getQueryFlag($params['strict']);


		// Check if all types are set to be skipped.
		if (count(array_diff_key($CACHE['TYPES'],$types_to_skip)) === 0) {
			// If all types are skipped and we are in strict mode it will not
			// be possible to get a video, so just return here.
			if ($strict) {
				return ['comment' => 'All video types are being skipped.'];
			}
			// If we are not in strict mode, all types being skipped is the same as no
			// types being skipped, but slower, so we'll just unset all of those.
			$types_to_skip = [];
		}
	}

	// Get the chance of each behavior in an array, with each successive
	// value including the sum of the previous values. This way we can get
	// a random number between 0 and $total_behavior_chance, and just check
	// at each behavior if its value is less than the random value. Behaviors
	// with a chance of 0 are skipped since they won't be randomly chosen.
	$behavior_chances = [];
	$total_behavior_chance = 0;
	foreach ($CACHE['BEHAVIORS'] as $key => $value) {
		$chance = $value['chance'];
		if ($chance === 0 || $key !== $value['abbreviation']) {
			continue;
		}
		$behavior_chances[$key] = $total_behavior_chance + $chance;
		$total_behavior_chance += $chance;
	}


	$data = null;
	$has_next = false;
	$index_of_video = -1;
	$behavior_selected = '';
	$behavior_seed = $seed_b;

	if (isset($params['uid'])) {
		$uid = $params['uid'];
		$FILENAME_AS_BACKUP_UID = $CACHE['FILENAME_AS_BACKUP_UID'];
		$video_found = false;

		// Try to find the video by ID.
		$c = new Collator('');
		foreach ($GROUPED_DATA as $behavior => $group_data) {
			foreach ($group_data as $source) {
				foreach ($source['videos'] as $video) {
					if (
						isset($video['uid'])
						? ($c->compare($video['uid'],$uid) === 0 || ($FILENAME_AS_BACKUP_UID && $c->compare($video['file'],$uid) === 0))
						: ($c->compare($video['file'],$uid) === 0)
					) {
						$video_found = true;
						if (!$strict || !isset($types_to_skip[$video['type']])) {
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

		// If we didn't find a video for the given UID and we're not in strict
		// mode, return the video data for the video with the UID most similar
		// to what was given.
		if (!$video_found && !$strict) {
			$best_percent = 0.0;
			$best_ident = '';
			foreach ($GROUPED_DATA as $behavior => $group_data) {
				foreach ($group_data as $source) {
					foreach ($source['videos'] as $video) {
						$ident = isset($video['uid']) ? $video['uid'] : $video['file'];
						similar_text($uid, $ident, $percent);
						if ($percent > $best_percent) {
							$best_percent = $percent;
							$best_ident = $ident;
						}
						if ($FILENAME_AS_BACKUP_UID && isset($video['uid'])) {
							similar_text($uid, $video['file'], $percent);
							if ($percent > $best_percent) {
								$best_percent = $percent;
								$best_ident = $ident;
							}
						}
					}
				}
			}
			$params['uid'] = $best_ident;
			return getVideoData($params);
		}

		// Try to get an index for this video.
		$selected_behavior = $CACHE['BEHAVIORS'][$behavior_selected];
		$selected_behavior_chance = $selected_behavior['chance'];
		if ($data === null) {
			// If we didn't find a video we obviously can't get an index for it.
			$index_of_video = -1;
		} else if ($selected_behavior_chance === 0 && $selected_behavior['interval'] === 0) {
			// If both the chance and interval for this video's behavior are 0
			// then there is no index that could be used to reach it.
			$index_of_video = -1;
		} else if ($selected_behavior_chance !== 0 && $selected_behavior_chance !== $total_behavior_chance && $selected_behavior['interval'] === 0) {
			// If the chance of this video's behavior is not 0 and there is
			// another behavior with a non-zero chance then it is theoretically
			// possible for this behavior to never be selected when this
			// behavior is not chosen on an interval.
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
				// If they both have a UID set and the UID's match,
				// or they both don't have a UID set and their file names match.
				if (!(isset($data['uid']) xor isset($source_videos[$v]['uid'])) && (
					(isset($data['uid']) && $data['uid'] === $source_videos[$v]['uid'])
					|| ($data['file'] === $source_videos[$v]['file'])
				)) {
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

			// Calculate the behavior seed to return by "incrementing" the seed
			// until the behavior of the found video has been selected enough
			// times for this video to have been chosen. We won't update the
			// other behavior indexes or the $behaviors_last_seen here because
			// we have no way to know what videos have previously been seen
			// other than trusting the input values we've been given.
			$behavior_seed = $seed;
			$this_behavior_selected = 0;
			while ($this_behavior_selected < $index_of_video) {
				list($behavior_seed,$num) = getRandomNumber($behavior_seed,0,$total_behavior_chance);
				foreach ($behavior_chances as $behavior => $chance) {
					if ($num < $chance) {
						if ($behavior === $behavior_selected) {
							++$this_behavior_selected;
						}
						break;
					}
				}
			}
		}
	} else {
		// Get the behavior to use.
		list($behavior_seed,$num) = getRandomNumber($behavior_seed,0,$total_behavior_chance);
		foreach ($behavior_chances as $behavior => $chance) {
			if ($num < $chance) {
				$behavior_selected = $behavior;
				break;
			}
		}

		// Check if a behavior with a set interval must be chosen. This overrides
		// the previous value, but it's easier to do it in this order.
		foreach ($behaviors_last_seen as $behavior => $last_seen) {
			if ($last_seen > 0 && $CACHE['BEHAVIORS'][$behavior]['interval'] <= $last_seen) {
				$behavior_selected = $behavior;
				break;
			}
		}


		$selected_behavior = $CACHE['BEHAVIORS'][$behavior_selected];
		$max_source_size_for_behavior = $selected_behavior['max_source_size'];
		$selected_behavior_sources = $GROUPED_DATA[$behavior_selected];
		$num_sources_for_behavior = count($selected_behavior_sources);
		$index_of_video = $indexes[$behavior_selected];
		$first_source_index = $index_of_video % $num_sources_for_behavior;


		// Loop through the series enough times to see every video in this behavior.
		$sources_seed = $seed;
		$video_seed = 0;
		$video_index_in_source = 0;
		for ($loop = 0; $loop <= $max_source_size_for_behavior; ++$loop) {
			for ($source_index = 0; $source_index < $num_sources_for_behavior; ++$source_index) {
				// On the first loop we need to shuffle the sources as we go.
				if ($loop === 0) {
					list($sources_seed,$n) = getRandomNumber($sources_seed,$source_index,$num_sources_for_behavior);
					swap($selected_behavior_sources,$n,$source_index);
					// If we haven't reached our starting source index we can stop here and continue to the next source.
					if ($source_index < $first_source_index) {
						continue;
					}
				}

				$source_videos =& $selected_behavior_sources[$source_index]['videos'];
				$num_videos_for_source = count($source_videos);

				// Once we've looked at every video in a source we can skip it,
				// making sure to still increment the video index.
				if ($loop > $num_videos_for_source) {
					++$index_of_video;
					continue;
				}

				// On the last loop we only need to go up to our starting point.
				if ($loop === $max_source_size_for_behavior && $source_index === $first_source_index) {
					// At this point we've circled back around to our original video,
					// so we'll just return that unless we're in strict mode.
					if (!$strict) {
						$index_of_video = $indexes[$behavior_selected];
						$video_index_in_source = intval($index_of_video / $num_sources_for_behavior) % $num_videos_for_source;
						$data = $source_videos[$video_index_in_source];
						$data['source'] = $selected_behavior_sources[$source_index]['source'];
					} else {
						$index_of_video = -1;
					}
					break 2;
				}

				$video_index_in_source = intval($index_of_video / $num_sources_for_behavior) % $num_videos_for_source;

				// The videos are shuffled during the second part of the first loop and the first part of the second loop.
				$videos_shuffled = $loop > 1 || ($loop === 1 && $source_index < $first_source_index);

				if (!$videos_shuffled) {
					// Partially shuffle the videos in the source we want up to the video we want.
					$video_seed = $seed;
					for ($v = 0; $v <= $video_index_in_source; ++$v) {
						list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
						swap($source_videos,$video_index,$v);
					}
				}

				// Get the video at the current index and check if we can return it.
				$video = $source_videos[$video_index_in_source];
				if (!isset($types_to_skip[$video['type']])) {
					$video['source'] = $selected_behavior_sources[$source_index]['source'];
					$data = $video;
					break 2;
				}

				// We didn't find a matching video, so increment our index for the next loop.
				++$index_of_video;

				if (!$videos_shuffled) {
					// Shuffle the rest of the videos in this source.
					for ($v = $video_index_in_source + 1; $v < $num_videos_for_source; ++$v) {
						list($video_seed,$video_index) = getRandomNumber($video_seed,$v,$num_videos_for_source);
						swap($source_videos,$video_index,$v);
					}
				}
			}
		}
	}


	$to_return = [];

	if ($data !== null) {
		$data['path'] = $CACHE['BEHAVIORS'][$behavior_selected]['src_dir'];
		$to_return['data'] = $data;
	}

	if ($index_of_video !== -1) {
		$next = [];
		$next['seed'] = $seed;
		$next['seed_b'] = $behavior_seed;

		// Copy the indexes.
		$indexes[$behavior_selected] = $index_of_video + 1;
		foreach ($indexes as $behavior => $index) {
			if ($index > 0) {
				$next[PREFIX_INDEX.$behavior] = $index;
			}
		}

		// Copy last seen values for behaviors that have an interval, incrementing them by one.
		$behaviors_last_seen[$behavior_selected] = -1;
		foreach ($behaviors_last_seen as $behavior => $last_seen) {
			if ($CACHE['BEHAVIORS'][$behavior]['interval'] > 0) {
				$next[PREFIX_SEEN_LAST.$behavior] = $last_seen + 1;
			}
		}

		// Copy the abbreviations of the types to skip.
		foreach ($CACHE['TYPES'] as $name => $type) {
			if ($name !== $type['abbreviation']) continue;
			$abbr = $type['abbreviation'];
			if (isset($types_to_skip[$abbr])) {
				$next[PREFIX_SKIP.$abbr] = true;
			}
		}

		if ($strict) $next['strict'] = true;

		$to_return['next'] = $next;
	}

	return $to_return;
}
