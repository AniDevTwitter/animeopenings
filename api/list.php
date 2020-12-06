<?php
require '../backend/includes/helpers.php';
header('Content-Type: application/json');
echo json_encode(getVideoList($_GET));
