<?php
include '../backend/includes/helpers.php';

// Make an empty array
$response = array();

// Output JSON and kill script
function output($output) {
	header('Content-Type: application/json');
	echo json_encode($output);
	die();
}

// Check if file is set
if (!isset($_GET['file'])) {
	$response['success'] = false;
	$response['comment'] = 'You did not specify a video file';
	output($response);
}

// Create a list of possible names
$test_names = [
	$_GET['file'], // the given name
	preg_replace('/\.\w+$/', '', $_GET['file']), // the given name without its file extension
	identifierToPartialFilename($_GET['file']), // the assumed identifier converted to a partial filename
];

// Include the metadata list
include_once '../names.php';

// Check if the file is in the array
$found = false;
foreach ($test_names as $name) {
	$len = strlen($name);
	foreach ($names as $S => $video_array) {
		foreach ($video_array as $T => $data) {
			if (substr($data['file'], 0, $len) === $name) {
				$found = true;
				$series = $S;
				$title = $T;
				$filename = $data['file'];
				$mime = $data['mime'];
				$song = existsOrDefault('song', $data);
				$subtitles = existsOrDefault('subtitles', $data);
				$egg = existsOrDefault('egg', $data);
				break 2;
			}
		}
	}
}

if (!$found) {
	$response['success'] = false;
	$response['comment'] = 'We do not have any metadata for that file';
	output($response);
}

// Set response
$response['success'] = true;
$response['comment'] = 'No errors';
$response['filename'] = $filename;
$response['title'] = $title;
$response['mime'] = $mime;
$response['source'] = $series;
if (!is_null($song)) $response['song'] = $song;
if (!is_null($subtitles)) $response['subtitles'] = $subtitles;
if (!is_null($egg)) $response['egg'] = $egg;

// Finish reply
output($response);
?>
