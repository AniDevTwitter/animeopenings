<?php
// Make an empty array
$response = array();

// Wrapper to check if a key in an array exists, or give a default value
function existsOrDefault($key, $array, $default = 0) {
  if (array_key_exists($key, $array)) return $array[$key];
  else return $default;
}
// Output JSON and kill script
function output($output) {
  echo json_encode($output);
  die;
}

// Check if file is set
if (!isset($_GET["file"])) {
  $response["success"] = false;
  $response["comment"] = "You did not specify a video file";
  output($response);
}

// Set variables
$video = $_GET["file"];
$videolocation = "../video/" . $video;

// Check if file exists
if (!file_exists($videolocation)) {
  $response["success"] = false;
  $response["comment"] = "File does not exist";
  output($response);
}

// Include the metadata list
include_once "../names.php";

// Check if the file is in the array
$found = false;
foreach ($names as $S => $video_array) {
	foreach ($video_array as $T => $data) {
		if ($data["file"] == $video) {
			$found = true;
			$series = $S;
			$title = $T;
			$song = existsOrDefault("song", $data);
			$subtitles = existsOrDefault("subtitles", $data);
			break 2;
		}
	}
}

if (!$found) {
  $response["success"] = false;
  $response["comment"] = "We do not have any metadata for this file";
  output($response);
}

// Set response
$response["success"] = true;
$response["comment"] = "No errors";
$response["filename"] = $video;
$response["title"] = $title;
$response["source"] = $series;
$response["song"] = $song;
$response["subtitles"] = $subtitles;

// Finish reply
header('Content-Type: application/json');
output($response);
?>
