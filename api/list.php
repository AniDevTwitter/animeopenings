<?php

include_once('../names.php');

$output = array();

if(isset($_GET["filenames"])){
  foreach ($names as $key => $opening) {
    $output[] = $key;
  }
}
else {

  foreach ($names as $key => $opening) {
    $output[] = array(
      "title" => $opening["title"],
      "source" => $opening["source"],
      "file" => $key
    );
  }
}

echo json_encode($output);

?>
