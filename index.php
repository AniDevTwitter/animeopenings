<?php

// Praise StackOverflow
function isMobile() {
    return preg_match("/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i", $_SERVER["HTTP_USER_AGENT"]);
}

//Check if a specific video has been requested
if(isset($_GET["video"])){

  //Include names.php for the array
  include_once('names.php');

  //Assign variables because too lazy to rewrite code below
  $video = "video/" . $_GET["video"];
  $filename = $_GET["video"];
}
else { //Else, pick a random video

  //Include names.php for the array
  include_once('names.php');

  //lol
  $videos = glob('video/*.webm');

  //Just do it *trademark*
  shuffle($videos);
  $video = $videos[0];

  //Get pure filename
  $filename = explode("/", $video);
  $filename = $filename[1];
}

?>
<!DOCTYPE html>
<html><head>

    <meta charset="utf-8">
    <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="style.css">
    <title>Anime openings</title>
    <script type="text/javascript" async="" defer="" src="//piwik.quad.moe/piwik.js"></script><script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>

  </head><style></style>

  <body>

    <script src="js/main.js"></script>
    <script src="js/progressbar.js"></script>

    <video autoplay="" loop="" id="bgvid" onended="onend();" class="ko">
      <source src="video/Opening2-SwordArtOnline.webm" type="video/webm">
      lol, lern 2 webm faggot
    </video>

    <div class="controls">
      <i onclick="skip(-10)" class="fa fa-arrow-left quadbutton ko"><font face="Comic Sans MS" size="2">GO BACK 10 SECONDS</font></i>
      <i onclick="skip(10)" class="fa fa-arrow-right quadbutton ko"><font face="Comic Sans MS" size="2">GO FORWARD 10 SECONDS</font></i>
      <i id="pause-button" onclick="playPause()" class="fa fa-play quadbutton ko"><font face="Comic Sans MS" size="300">PAUSE/PLAY</font></i>
    </div>

    <div class="controls2">
      <i class="fa fa-refresh quadbutton ko" onclick="newvideo()" onmouseover="showTooltip('Get a new video')" onmouseout="hideTooltip()"><font face="Comic Sans MS" size="5">THIS<br> BUTTON<br> SKIPS<br> TO<br> THE<br> NEXT<br> VIDEO</font></i>
      <br><br><i id="autonext" class="fa fa-toggle-off dautonext ko" onclick="toggleAutonext()" onmouseover="showTooltip('Change videos instead of looping')" onmouseout="hideTooltip()"><font face="Comic Sans MS" size="5">THIS IS AN AUTOPLAY BUTTON</font></i><br>
    </div>

    <div id="tooltip" class="is-hidden">Get a new video</div>

    <i id="menubutton" onclick="showMenu()" class="fa fa-bars quadbutton ko"><font face="Comic Sans MS" size="300">THIS BUTTON IS THE MAIN MENU.<br>IT WILL OPEN THE MAIN MENU.</font></i>

    <div id="site-menu" class="is-hidden ko">

      <i id="closemenubutton" onclick="hideMenu()" class="fa fa-times quadbutton"></i>

      <p id="title">Opening 2</p>
      <p id="source">From Sword Art Online</p>

      <ul id="linkarea">
        <li class="directlink link">
          <a href="http://openings.moe/?video=Opening2-SwordArtOnline.webm" id="videolink">Link to this video</a>
        </li>
        <li class="link">
          <a href="/list" id="videolink">Video list</a>
        </li><li class="link">
          <a href="/hub" id="videolink">Hub</a>
        </li>
      </ul>

      <p class="count">
        We currently have <b>119</b> Openings and endings
      </p>

      <p class="betanote">
        This site is in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.
      </p>

      <p class="keybindings">
        <b>Keyboard bindings</b>
        </p><ul class="keybinds-list">
          <li><span class="keycap"><i class="fa fa-arrow-left"></i>/<i class="fa fa-arrow-right"></i></span> Back/forward 10 seconds.<br></li>
          <li><span class="keycap">Space</span> Pause/Play. <br></li>
          <li><span class="keycap">N</span> New video. <br></li>
        </ul>
      <p></p>

    </div>

    
    <!-- Botnet code -->
<!-- Piwik -->
<script type="text/javascript">
  var _paq = _paq || [];
  _paq.push(['trackPageView']);
  _paq.push(['enableLinkTracking']);
  (function() {
    var u="//piwik.quad.moe/";
    _paq.push(['setTrackerUrl', u+'piwik.php']);
    _paq.push(['setSiteId', 5]);
    var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
    g.type='text/javascript'; g.async=true; g.defer=true; g.src=u+'piwik.js'; s.parentNode.insertBefore(g,s);
  })();
</script>
<noscript>&lt;p&gt;&lt;img src="//piwik.quad.moe/piwik.php?idsite=5" style="border:0;" alt="" /&gt;&lt;/p&gt;</noscript>
<!-- End Piwik Code -->



  


<div id="progressbar" style="position: fixed; top: 0; width: 100%; height: 2px"><div id="bufferprogress" style="position: absolute; top: 0px; left: 0px; width: 100.00000141697431%; height: 2px; background-color: rgb(204, 204, 204); transition: width 400ms linear; -webkit-transition: width 400ms linear; background-position: initial initial; background-repeat: initial initial;"></div><div id="timeprogress" style="position: absolute; top: 0px; left: 0px; width: 35.06271778544265%; height: 2px; background-color: rgb(230, 81, 0); transition: width 400ms linear; -webkit-transition: width 400ms linear; background-position: initial initial; background-repeat: initial initial;"></div></div></body></html>
