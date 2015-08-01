<?php
// Make an empty array
$response = array();

// Wrapper to check if a key in an array exists, or give a default value
function existsOrDefault($key, $array, $default = "???") {
  if (isset($array[$key])) {
    return $array[$key];
  }
  else {
    return $default;
  }
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
include_once("../names.php");

// Check if the file is in the array
if (!array_key_exists($video, $names)) {
  $response["success"] = false;
  $response["comment"] = "We do not have any metadata for this file";
  output($response);
}

// If all test passed, Reply with information
$data = $names[$video];

// Set response
$response["success"] = true;
$response["comment"] = "No errors";
$response["filename"] = $video;
$response["title"] = existsOrDefault("title", $data);
$response["source"] = existsOrDefault("source", $data);
if (isset($data["metadata"]))
  $response["metadata"] = $data["metadata"];

// Finish reply
output($response);
?>
