<?php

include_once('../names.php');

$output = array();

foreach ($names as $key => $opening) {
  $output[] = array(
    "title" => $opening["title"],
    "source" => $opening["source"],
    "file" => $key
  );
}

echo json_encode($output);

?>
