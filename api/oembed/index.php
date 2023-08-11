<?php
require '../../backend/includes/helpers.php';

// hed = header, echo, die
function hed($header, $text, $param = null) {
	header('Access-Control-Allow-Origin: *');
	header($header);
	echo $text . ($param !== null ? (': "' . $param . '"') : '') . "\n";
	die();
}

function oembed_xml_encode($data) {
	$xml = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><oembed>';
	foreach ($data as $key => $value)
		$xml .= '<' . $key . '>' . ($key == 'html' ? htmlspecialchars($value) : $value) . '</' . $key . '>';
	return $xml . '</oembed>';
}


// Check that a URL is given.
if (!isset($_GET['url']))
	hed('HTTP/1.0 400 Bad Request', 'URL not given', $_SERVER['REQUEST_URI']);

// Parse the URL.
$query = parse_url($_GET['url'], PHP_URL_QUERY);

// Check that the URL has a query string.
if ($query === null)
	hed('HTTP/1.0 404 Not Found', 'URL not valid - no query string', $_GET['url']);

// Parse the query string into the $query_get array.
parse_str($query, $query_get);

// Check that the query string has the parameter we need.
if (!isset($query_get['video']))
	hed('HTTP/1.0 404 Not Found', 'URL not valid - video name not in query string', $query);

// Get the video data.
$video_data = getVideoData(['uid'=>$query_get['video'],'strict'=>true]);
if (!isset($video_data['data'])) {
	$message = isset($video_data['comment']) ? $video_data['comment'] : 'Video not found';
	hed('HTTP/1.0 404 Not Found', $message, $query_get['video']);
}


// Set values to return.
// The width and height are the minimum sizes required to display the embed, not the size of the video.
// But first, we'll get sizes to use for the video embed.
// We don't currently have a way to get the dimensions of a video, so we'll just use 1280x720, unless a maxwidth and/or maxheight were given for us to fit within.
$width = isset($_GET['maxwidth']) ? $_GET['maxwidth'] : '1280';
$height = isset($_GET['maxheight']) ? $_GET['maxheight'] : '720';
$html = '<iframe width="' . $width . '" height="' . $height . '" src="' . $_GET['url'] . '" allow="fullscreen picture-in-picture" allowfullscreen="true" scrolling="auto" frameborder="0" style="border:none"></iframe>';
// 280x120 is currently about the smallest we can get without any buttons overlapping.
$width = '280';
$height = '120';

$parsed_url = parse_url($_GET['url']);
$data = [
	'type' => 'video',
	'version' => '1.0',
	'html' => $html,
	'width' => $width,
	'height' => $height,
	'provider_name' => $parsed_url['host'],
	'provider_url' => 'https://' . $parsed_url['host'] . $parsed_url['path'],
	'thumbnail' => 'https://' . $parsed_url['host'] . $parsed_url['path'] . 'assets/logo/512px.png',
	'thumbnail_width' => '512',
	'thumbnail_height' => '512'
];


// Switch on format type.
if (!isset($_GET['format']) || $_GET['format'] === 'json')
	hed('Content-Type: application/json', json_encode($data));
else if ($_GET['format'] === 'xml')
	hed('Content-Type: text/xml', oembed_xml_encode($data));
else hed('HTTP/1.0 501 Not Implemented', 'Given format not supported', $_GET['format']);
