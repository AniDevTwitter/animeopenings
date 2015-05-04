<?php

// Shuffle key workaround
function shuffle_assoc($array){
	
    // Initialize
    $shuffled_array = array();

    // Get array's keys and shuffle them.
    $shuffled_keys = array_keys($array);
    shuffle($shuffled_keys);

    // Create same array, but in shuffled order.
    foreach ( $shuffled_keys AS $shuffled_key ) {
        $shuffled_array[  $shuffled_key  ] = $array[  $shuffled_key  ];
    }

    // Return
    return $shuffled_array;
}

// Function used to rearrange the metadata array
function rearrange($input) {

	// Create an empty array
	$output = array();

	// Loop through each enrty
	foreach ($input as $file => $metadata)  {
		// Assign data to new variables
		$series = $metadata["source"];
		$title = $metadata["title"];

		// Create an empty array for the series if it doesn't exist
		if(!isset($output[$series])) {
			$output[$series] = array();
		}

		// Add the data to the new array
		$output[$series][] = array(
			"filename" => $file,
			"title" => $title
		);
	}

	// Return the new array
	return $output;
}