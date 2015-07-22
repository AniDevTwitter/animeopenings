<?php
function keySearch($array1, $field, $value) {
   foreach($array1 as $key => $array2) {
      if ($array2[$field] === $value)
         return $key;
   }
   return false;
}

include_once("../names.php");
include_once("../eggs.php");

if (isset($_GET["eggs"])) $videos = $names + $eggs;
else $videos = $names;

$output = array();

if (isset($_GET["filenames"])) {
  foreach ($videos as $key => $opening) {
    $output[] = $key;
  }
} else {
  foreach ($videos as $key => $opening) {
    $output[] = array(
      "title" => $opening["title"],
      "source" => $opening["source"],
      "file" => $key
    );
  }
}

if (isset($_GET["shuffle"])) shuffle($output);

// move $_GET["first"] to the front of $output
if (isset($_GET["first"])) {
  if (isset($_GET["filenames"])) {
    $key = array_search($_GET["first"], $output);
    unset($output[$key]);
    array_unshift($output, $_GET["first"]);
  } else {
    $key = keySearch($output, "file", $_GET["first"]);
    $first = $output[$key];
    unset($output[$key]);
    array_unshift($output, $first);
  }
}

echo json_encode($output);
?>
