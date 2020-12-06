<?php
require '../../backend/includes/helpers.php';

// hed = header, echo, die
function hed($header, $text, $param = null) {
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
if (getVideoData(['name'=>$query_get['video']]) === null)
	hed('HTTP/1.0 404 Not Found', 'Video not found', $query_get['video']);


// Set values to return.
$width = isset($_GET['maxwidth']) ? $_GET['maxwidth'] : '1280';
$height = isset($_GET['maxheight']) ? $_GET['maxheight'] : '720';
$html = '<iframe width="' . $width . '" height="' . $height . '" src="' . $_GET['url'] . '" allow="fullscreen picture-in-picture" allowfullscreen="true" scrolling="auto" frameborder="0" style="border:none"></iframe>';

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
