<?php
include "../backend/includes/helpers.php";

// Make an empty array
$response = array();

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

$filename = identifierToFilename($_GET["file"]);
$len = strlen($filename);

// Include the metadata list
include_once "../names.php";
if (file_exists("../eggs.php")) {
	include_once "../eggs.php";
	addEggs($names, $eggs);
}

// Check if the file is in the array
$found = false;
foreach ($names as $S => $video_array) {
	foreach ($video_array as $T => $data) {
		if (substr($data["file"], 0, $len) === $filename) {
			$found = true;
			$series = $S;
			$title = $T;
			$filename = $data["file"];
			$mime = $data["mime"];
			$song = existsOrDefault("song", $data);
			$subtitles = existsOrDefault("subtitles", $data);
			$egg = existsOrDefault("egg", $data);
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
$response["filename"] = $filename;
$response["title"] = $title;
$response["mime"] = $mime;
$response["source"] = $series;
if (!is_null($song)) $response["song"] = $song;
if (!is_null($subtitles)) $response["subtitles"] = $subtitles;
if (!is_null($egg)) $response["egg"] = $egg;

// Finish reply
header("Content-Type: application/json");
output($response);
?>
