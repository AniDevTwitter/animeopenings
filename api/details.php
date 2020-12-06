<?php
require '../backend/includes/helpers.php';

header('Content-Type: application/json');

$data = getVideoData($_GET);
if ($data === null) {
	echo json_encode([
		'success' => false,
		'comment' => 'A video could not be found matching those parameters'
	]);
} else {
	$data['success'] = true;
	$data['comment'] = 'No errors';
	echo json_encode($data);
}
