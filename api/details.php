<?php
include '../backend/includes/helpers.php';

// Make an empty array
$response = array();

// Check if file is set
if (!isset($_GET['file'])) {
	$response['success'] = false;
	$response['comment'] = 'You did not specify a video file';
} else {
	// Try to find file
	$data = identifierToFileData($_GET['file']);

	// Set response
	if ($data === false) {
		$response['success'] = false;
		$response['comment'] = 'We do not have any metadata for that file';
	} else {
		$response['success'] = true;
		$response['comment'] = 'No errors';
		$response['filename'] = $data['file'];
		$response['title'] = $data['title'];
		$response['mime'] = $data['mime'];
		$response['source'] = $data['series'];
		if (isset($data['song'])) $response['song'] = $data['song'];
		if (isset($data['subtitles'])) $response['subtitles'] = $data['subtitles'];
		if (isset($data['egg'])) $response['egg'] = $data['egg'];
	}
}

// Finish reply
header('Content-Type: application/json');
echo json_encode($response);
?>
