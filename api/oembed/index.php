<?php
include_once '../../backend/includes/helpers.php';

// hed = header, echo, die
function hed($header, $text) {
	header($header);
	echo $text . PHP_EOL;
	die();
}

function oembed_xml_encode($data) {
	$xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><oembed><type>video</type><version>1.0</version>';
	foreach ($data as $key => $value)
		$xml .= '<' . $key . '>' . ($key == 'html' ? htmlspecialchars($value) : $value) . '</' . $key . '>';
	return $xml . '</oembed>';
}


// Check that a URL is given.
if (!isset($_GET['url']))
	hed('HTTP/1.0 400 Bad Request', 'URL not given');

// Check that the given url is valid.
$start = strpos($_GET['url'], '?video=');
if ($start === false)
	hed('HTTP/1.0 404 Not Found', 'URL not valid');

$video_identifier = substr($_GET['url'], $start + 7);
$video_data = identifierToFileData($video_identifier);
if ($video_data === false)
	hed('HTTP/1.0 404 Not Found', 'Video not found');


// Set values to return.
$width = isset($_GET['maxwidth']) ? $_GET['maxwidth'] : '1280';
$height = isset($_GET['maxheight']) ? $_GET['maxheight'] : '720';
$html = '<iframe width="' . $width . '" height="' . $height . '" src="' . $_GET['url'] . '" allow="fullscreen picture-in-picture" allowfullscreen="true" frameborder="0" style="border:none"></iframe>';

$data = [
	'type' => 'video',
	'version' => '1.0',
	'html' => $html,
	'width' => $width,
	'height' => $height,
	'provider_name' => 'openings.moe',
	'provider_url' => 'https://openings.moe',
	'thumbnail' => 'https://openings.moe/assets/logo/512px.png',
	'thumbnail_width' => '512',
	'thumbnail_height' => '512'
];


// Switch on format type.
if (!isset($_GET['format']) || $_GET['format'] === 'json')
	hed('Content-Type: application/json', json_encode($data));
else if ($_GET['format'] === 'xml')
	hed('Content-Type: text/xml', oembed_xml_encode($data));
else hed('HTTP/1.0 501 Not Implemented', 'Given format not supported');
?>
