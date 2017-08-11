<?php
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
	$parts = explode('-', $filename);

	// [N]C{BD,DVD,PC,...}
	array_pop($parts);

	// {OP,ED}{0,1,2,...}[{a,b,c,...}]
	$subident = array_pop($parts);
	// {OP,ED}{1,2,...}[{a,b,c,...}]
	$subident = preg_replace('/(\D+)0*(.+)/', '$1$2', $subident);

	$one = 1; // because PHP is stupid
	return str_replace(['OP','ED'], ['Opening','Ending'], $subident, $one) . '-' . implode('-', $parts);
}
function identifierToFilename($ident) {
	// [{Opening,Ending}{1,2,...}[{a,b,c,...}], ...filename parts]
	$parts = explode('-', $ident);

	$one = 1; // because PHP is stupid
	$subident = array_shift($parts);
	$index = str_replace(['Opening','Ending'], '', $subident, $one);
	$oped = str_replace(['Opening','Ending'], ['OP','ED'], str_replace($index, '', $subident, $one), $one);
	$name = implode('-', $parts);

	return $name . '-' . $oped . (preg_match('/^\d\D*$/', $index) ? '0' : '') . $index . '-';
}
?>
