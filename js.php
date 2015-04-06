<?php
require_once "JShrink.php";
use \JShrink;
echo "//original files: main.js - progressbar.js\n";
echo \JShrink\Minifier::minify(file_get_contents("main.js") . "\n" . file_get_contents("progressbar.js"));