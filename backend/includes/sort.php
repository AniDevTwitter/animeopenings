<?php
// Shuffle key workaround
function shuffle_assoc($array) {
	// Initialize
	$shuffled_array = array();

	// Get array's keys and shuffle them.
	$shuffled_keys = array_keys($array);
	shuffle($shuffled_keys);

	// Create same array, but in shuffled order.
	foreach ($shuffled_keys as $shuffled_key)
		$shuffled_array[$shuffled_key] = $array[$shuffled_key];

	// Return
	return $shuffled_array;
}

// Function used to rearrange the metadata array
function rearrange(&$input) {
	// Create an empty array
	$output = array();

	// Loop through each entry
	foreach ($input as $file => $metadata) {
		// Get series name and then remove it from the metadata
		$series = $metadata["source"];
		unset($metadata["source"]);

		// Create an empty array for the series if it doesn't exist
		if (!isset($output[$series])) $output[$series] = array();
		
		// Add filename to metadata
		$metadata["filename"] = $file;

		// Add the data to the new array
		$output[$series][] = $metadata;
	}

	// Return the new array
	return $output;
}
