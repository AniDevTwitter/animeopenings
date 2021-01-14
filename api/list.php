<?php
require '../backend/includes/helpers.php';
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');
echo json_encode(getVideoList($_GET));
