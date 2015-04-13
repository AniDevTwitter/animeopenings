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
<html>
  <head>

    <meta charset="utf-8">
    <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="style.css">
    <title>Anime openings</title>
    <script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>

  </head>

  <body>

    <script src="js/main.js"></script>
    <script src="js/progressbar.js"></script>

    <video autoplay loop id="bgvid" onended="onend();" class="ko">
      <source src="<?php echo $video; ?>" type="video/webm">
      lol, lern 2 webm faggot
    </video>

    <div class="controls">
      <i onclick="skip(-10)" class="fa fa-arrow-left quadbutton ko"></i>
      <i onclick="skip(10)" class="fa fa-arrow-right quadbutton ko"></i>
      <i id="pause-button" onclick="playPause()" class="fa fa-pause quadbutton ko"></i>
    </div>

    <div class="controls2">
      <i class="fa fa-refresh quadbutton ko" onclick="newvideo()" onmouseover="showTooltip('Get a new video')" onmouseout="hideTooltip()"></i>
      <i id="autonext" class="fa fa-toggle-off dautonext ko" onclick="toggleAutonext()" onmouseover="showTooltip('Change videos instead of looping')" onmouseout="hideTooltip()"></i>
    </div>

    <div id="tooltip" class="is-hidden">
      Test tooltip
    </div>

    <i id="menubutton" onclick="showMenu()" class="fa fa-bars quadbutton ko"></i>

    <div id="site-menu" class="is-hidden ko">

      <i id="closemenubutton" onclick="hideMenu()" class="fa fa-times quadbutton"></i>

      <p id="title">
        <?php

        //If we have the data, echo it
        if (array_key_exists($filename, $names)) {
          echo $names[$filename]["title"];
        }
        else { // Give a generic reply otherwise
          echo '???';
        }

        ?>
      </p>
      <p id="source">
        <?php

        //If we have the data, echo it
        if (array_key_exists($filename, $names)) {
          echo "From " . $names[$filename]["source"];
        }
        else { // Give a generic reply otherwise
          echo 'From ???';
        }

        ?>
      </p>

      <ul id="linkarea">
        <li class="directlink link">
          <a href="http://openings.moe/?video=<?php echo $filename; ?>" id="videolink">Link to this video</a>
        </li>
        <li class="link">
          <a href="/list" id="videolink">Video list</a>
        </li><li class="link">
          <a href="/hub" id="videolink">Hub</a>
        </li>
      </ul>

      <p class="count">
        We currently have <b><?php echo count($names); ?></b> Openings and endings
      </p>

      <p class="betanote">
        This site is in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.
      </p>

      <p class="keybindings">
        <b>Keyboard bindings</b>
        <ul class="keybinds-list">
          <li><span class="keycap"><i class="fa fa-arrow-left"></i>/<i class="fa fa-arrow-right"></i></span> Back/forward 10 seconds.<br /></li>
          <li><span class="keycap">Space</span> Pause/Play. <br /></li>
          <li><span class="keycap">N</span> New video. <br /></li>
        </ul>
      </p>

    </div>

    <?php
    // For the poor mobile users
	if(isMobile()) {
		// Echo message for mobilefags
		echo '<div style="position:fixed;top:10px;right:10px;background-color:#fff;padding:10px;font-size: 18pt;max-width:25%;min-width:230px;box-shadow:0px 0px 4px #111;">You appear to be visiting using a mobile device. This site does not work properly on phones, sorry about that</div>';
	}

    ?>

    <!-- Initiate botnet -->
    <!-- Piwik code goes here -->



  </body>

</html>
