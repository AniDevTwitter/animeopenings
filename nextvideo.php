<?php
// Howl's very lazy json thing to reproduce multiple videos in sequence
try {
    require_once "names.php";
    $videos = glob("video/*.webm");
    // do-while because we must do this at least once.
    // this loop basically ensures that we aren't playing the same video twice in a row
    do {
        $video = $videos[rand(0, count($videos) - 1)];
        $out = new stdClass();
        $out->success = true;
        $out->videourl = $video;
        $a = explode("/", $video);
        $a = $a[1];
    } while (isset($_GET["avoid"]) && $a == $_GET["avoid"]);
    if (isset($names[$a])) {
        $out->videoname = $names[$a];
    }
    else {
        $out->videoname->title = '???';
        $out->videoname->source = '???';
    }
    $out->videofname  = $a;
    echo json_encode($out);
}
catch (Exception $e) {
    echo "{\"success\": false}";
}