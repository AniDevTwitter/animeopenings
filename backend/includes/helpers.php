<?php
include_once __DIR__ . '/config_default.php';
$config_file = __DIR__ . '/config.php';
if (is_file(stream_resolve_include_path($config_file)))
    include_once $config_file;
if ($WEBSITE_URL == '') {
	header('HTTP/1.0 500 Internal Server Error');
	echo 'The config file was not properly initialized.';
	die();
}

include_once __DIR__ . '/../../names.php';

$FULLWIDTH_CHARS = ['＜','＞','：','＂','／','＼','｜','？','＊','．'];
$HALFWIDTH_CHARS = ['<','>',':','"','/','\\','|','?','*','.'];

// Wrapper to check if a key in an array exists, or give a default value
function existsOrDefault($key, $array, $default = null) {
	if (array_key_exists($key, $array)) return $array[$key];
	else return $default;
}

// a function is used because not all mime types
// are the same as their file extension
function mimeToExt($mime) {
	if (strpos($mime, 'mp4') !== false) return '.mp4';
	if (strpos($mime, 'webm') !== false) return '.webm';
	return '';
}

function filenameToIdentifier($filename) {
	global $USE_FILENAME_AS_IDENTIFIER;
	if ($USE_FILENAME_AS_IDENTIFIER)
		return rawurlencode($filename);

	$parts = explode('-', $filename);

	// [N]C{BD,DVD,PC,...}[.{webm,mp4,...}]
	array_pop($parts);

	// {OP,IN,ED}{0,1,2,...}[{a,b,c,...}]
	$subident = array_pop($parts);
	// {OP,IN,ED}{1,2,...}[{a,b,c,...}]
	$subident = preg_replace('/(\D+)0*(.+)/', '$1$2', $subident);

	// replace fullwidth characters with halfwidth equivalents
	global $FULLWIDTH_CHARS, $HALFWIDTH_CHARS;
	$name = str_replace($FULLWIDTH_CHARS, $HALFWIDTH_CHARS, implode('-', $parts));

	// combine the parts, and encode the string to be used in a URL
	$one = 1; // because PHP is stupid
	return rawurlencode(str_replace(['OP','IN','ED'], ['Opening','Insert','Ending'], $subident, $one) . '-' . $name);
}
function identifierToFileData($ident) {
	// decode the identifier, replacing percent-escapes with their actual characters
	$ident = rawurldecode($ident);

	global $USE_FILENAME_AS_IDENTIFIER;
	if ($USE_FILENAME_AS_IDENTIFIER)
		return $ident;

	// [{Opening,Insert,Ending}{1,2,...}[{a,b,c,...}], ...filename parts]
	$parts = explode('-', $ident);

	$one = 1; // because PHP is stupid
	preg_match('/(\D+)(\d.*)?/', array_shift($parts), $subident);
	$opined = str_replace(['Opening','Insert','Ending'], ['OP','IN','ED'], $subident[1], $one);
	$index = count($subident) == 3 ? $subident[2] : '';

	// replace halfwidth characters with fullwidth equivalents
	global $HALFWIDTH_CHARS, $FULLWIDTH_CHARS;
	$name = str_replace($HALFWIDTH_CHARS, $FULLWIDTH_CHARS, implode('-', $parts));

	// add padding to the index
	global $VIDEO_INDEX_PADDING;
	if ($VIDEO_INDEX_PADDING && preg_match('/^0*?[1-9]/', $index)) {
		$padded = str_repeat('0', $VIDEO_INDEX_PADDING - 1) . $index;
		$index = preg_replace('/^0*?(\d{' . $VIDEO_INDEX_PADDING . '}\D*)$/', '$1', $padded);
	}

	// combine the parts
	// the last part ([N]C{BD,DVD,PC,...}) is missing because it can't be determined from the identifier
	// the no_ext version is for the case where a file extension was at the end of the identifier
	// $ident is tested as well in case the given identifier was actually a filename, but $USE_FILENAME_AS_IDENTIFIER isn't set
	$partial_filename = $name . '-' . $opined . $index . '-';
	$partial_filename_no_ext = preg_replace('/\.\w+$/', '', $name) . '-' . $opined . $index . '-';
	$test_filenames = [$partial_filename,$partial_filename_no_ext,$ident];

	// try to find the file in names.php
	global $names;
	foreach ($test_filenames as $test_filename) {
		$len = strlen($test_filename);
		foreach ($names as $S => $video_array) {
			foreach ($video_array as $V => $data) {
				if (substr($data['file'], 0, $len) === $test_filename) {
					$data['series'] = $S;
					$data['title'] = $V;
					return $data;
				}
			}
		}
	}

	return false;
}
?>
