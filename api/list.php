<?php
function keySearch($array1, $field, $value) {
	foreach($array1 as $key => $array2) {
		if ($array2[$field] === $value)
			return $key;
	}
	return false;
}

include "../names.php";
$videos = $names;

if (isset($_GET["eggs"]) && file_exists("../eggs.php")) {
	include "../eggs.php";
	$videos += $eggs;
}

$output = array();

if (isset($_GET["filenames"])) {
	foreach ($videos as $series => $video_array) {
		foreach ($video_array as $title => $data) {
			$output[] = $data["file"];
		}
	}

	if (isset($_GET["shuffle"])) shuffle($output);

	if (isset($_GET["first"])) {
		$key = array_search($_GET["first"], $output);
		unset($output[$key]);
		array_unshift($output, $_GET["first"]);
	}
} else {
	if (isset($_GET["shuffle"])) {
		while (!empty($videos)) {
			$series = array_rand($videos);
			$title = array_rand($videos[$series]);

			$data = &$videos[$series][$title];
			$output[] = [
				"title" => $title,
				"source" => $series,
				"song" => (array_key_exists("song", $data) ? $data["song"] : 0),
				"subtitles" => (array_key_exists("subtitles", $data) ? $data["subtitles"] : 0),
				"file" => $data["file"]
			];

			end($output);
			$last = &$output[key($output)];
			if ($last["song"] == 0) unset($last["song"]);
			if ($last["subtitles"] == 0) unset($last["subtitles"]);

			unset($videos[$series][$title]);
			if (empty($videos[$series])) unset($videos[$series]);
		}
	} else {
		foreach ($videos as $series => $video_array) {
			foreach ($video_array as $title => $data) {
				$output[] = [
					"title" => $title,
					"source" => $series,
					"song" => (array_key_exists("song", $data) ? $data["song"] : 0),
					"subtitles" => (array_key_exists("subtitles", $data) ? $data["subtitles"] : 0),
					"file" => $data["file"]
				];

				end($output);
				$last = &$output[key($output)];
				if ($last["song"] == 0) unset($last["song"]);
				if ($last["subtitles"] == 0) unset($last["subtitles"]);
			}
		}
	}

	if (isset($_GET["first"])) {
		$key = keySearch($output, "file", $_GET["first"]);
		$first = $output[$key];
		unset($output[$key]);
		array_unshift($output, $first);
	}
}

header('Content-Type: application/json');
echo json_encode($output);
?>
