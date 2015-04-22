<html>
<head>
  <title>Opening list</title>
  <link rel="stylesheet" type="text/css" href="markdown.css">
  <meta charset="UTF-8">
</head>
<body>

<a href="../hub"><< Back to the hub</a>

<h1>Messy Opening list</h1>

<p>Hint: ctrl+f</p>

<br />

<?php

include_once('../names.php');

foreach ($names as $key => $opening) {
  echo '<div class="opening"><p class="source">' . $opening["source"] . ' - </p><a href="../?video=' . $key . '"><p class="title">' . $opening["title"] . '</p></a></div>' . PHP_EOL;
}

include_once('../backend/includes/botnet.html');

?>

</body>
</html>
