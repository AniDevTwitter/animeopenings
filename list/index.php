<html>
<head>
  <title>Opening list</title>
  <link rel="stylesheet" type="text/css" href="markdown.css">
  <meta charset="UTF-8">
  <meta name=viewport content="width=device-width, initial-scale=1">
</head>
<body>

<a href="../hub"><< Back to the hub</a>

<h1>Messy Opening list</h1>

<p>Hint: ctrl+f</p>

<br />

<?php

// Includes
include_once('../names.php');
include_once('../backend/includes/sort.php');

// Rearrange by series
$series = rearrange($names);

foreach ($series as $key => $opening) {
	// Series
	echo '<div class="series">' . $key;

	// List
	echo '<ul>' . PHP_EOL . PHP_EOL;
	foreach ($opening as $video) { //Hey, I heard you like new lines
		echo '  <a href="../?video=' . $video["filename"] . '">' . PHP_EOL
		. '    <div class="title">' . PHP_EOL
		. '      - ' . $video["title"] . PHP_EOL
		. '    </div>' . PHP_EOL
		. '  </a>' . PHP_EOL . PHP_EOL
		. '  <br />' . PHP_EOL
		. PHP_EOL;
	}

	echo '</ul>' . PHP_EOL . '</div>' . PHP_EOL . PHP_EOL;

  //echo '<div class="opening"><p class="source">' . $opening["source"] . ' - </p><a href="../?video=' . $key . '"><p class="title">' . $opening["title"] . '</p></a></div>' . PHP_EOL;
}

include_once('../backend/includes/botnet.html');

?>

</body>
</html>
