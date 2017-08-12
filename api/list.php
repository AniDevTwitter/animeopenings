<?php
function keySearch($array1, $field, $value) {
	foreach($array1 as $key => $array2) {
		if ($array2[$field] === $value)
			return $key;
	}
	return false;
}

include_once '../backend/includes/helpers.php';
include_once '../names.php';
$videos = $names;

if (isset($_GET['eggs']) && file_exists('../eggs.php')) {
	include_once '../eggs.php';
	addEggs($videos, $eggs);
}

$output = array();

if (isset($_GET['filenames'])) {
	foreach ($videos as $series => $video_array) {
		foreach ($video_array as $title => $data) {
			foreach ($data['mime'] as $mime) {
				$output[] = $data['file'] . mimeToExt($mime);
			}
		}
	}

	if (isset($_GET['shuffle'])) shuffle($output);

	if (isset($_GET['first'])) {
		$key = array_search($_GET['first'], $output);
		unset($output[$key]);
		array_unshift($output, $_GET['first']);
	}
} else {
	if (isset($_GET['shuffle'])) {
		while (!empty($videos)) {
			$series = array_rand($videos);
			$title = array_rand($videos[$series]);

			$data = &$videos[$series][$title];
			$output[] = [
				'title' => $title,
				'source' => $series,
				'file' => $data['file'],
				'mime' => $data['mime'],
				'song' => existsOrDefault('song', $data),
				'subtitles' => existsOrDefault('subtitles', $data),
				'egg' => existsOrDefault('egg', $data)
			];

			end($output);
			$last = &$output[key($output)];
			if (!isset($last['song'])) unset($last['song']);
			if (!isset($last['subtitles'])) unset($last['subtitles']);
			if (!isset($last['egg'])) unset($last['egg']);

			unset($videos[$series][$title]);
			if (empty($videos[$series])) unset($videos[$series]);
		}
	} else {
		foreach ($videos as $series => $video_array) {
			foreach ($video_array as $title => $data) {
				$output[] = [
					'title' => $title,
					'source' => $series,
					'file' => $data['file'],
					'mime' => $data['mime'],
					'song' => existsOrDefault('song', $data),
					'subtitles' => existsOrDefault('subtitles', $data),
					'egg' => existsOrDefault('egg', $data)
				];

				end($output);
				$last = &$output[key($output)];
				if (!isset($last['song'])) unset($last['song']);
				if (!isset($last['subtitles'])) unset($last['subtitles']);
				if (!isset($last['egg'])) unset($last['egg']);
			}
		}
	}

	if (isset($_GET['first'])) {
		$key = keySearch($output, 'file', $_GET['first']);
		$first = $output[$key];
		unset($output[$key]);
		array_unshift($output, $first);
	}
}

header('Content-Type: application/json');
echo json_encode($output);
?>
