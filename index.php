<?php

// Praise StackOverflow
function isMobile() {
    return preg_match("/(android|avantgo|blackberry|bolt|boost|cricket|docomo|fone|hiptop|mini|mobi|palm|phone|pie|tablet|up\.browser|up\.link|webos|wos)/i", $_SERVER["HTTP_USER_AGENT"]);
}

// Set variable to avoid running regex more than needed
$mobiledevice = isMobile();

//Check if a specific video has been requested
if(isset($_GET["video"])){

  //Include names.php for the array
  include_once('names.php');

  //Assign variables because too lazy to rewrite code below
  $video = "video/" . strip_tags($_GET["video"]);
  $filename = strip_tags($_GET["video"]);

  // Error handling, QuadStyle™
  if(!file_exists($video)) {
    header("HTTP/1.0 404 Not Found");
    echo file_get_contents('backend/pages/notfound.html');
    die;
  }
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
    <meta name=viewport content="width=device-width, initial-scale=1">

    <!-- CSS and JS external resources block -->
    <link rel="stylesheet" href="//maxcdn.bootstrapcdn.com/font-awesome/4.3.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="style.css">

    <script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
    <script src="main.js"></script>
    <title><?php
     if(isset($_GET["video"])){ //Echo data if using a direct link
       echo $names[$filename]["title"] . ' from ' . $names[$filename]["source"];
    } else{ // Generic title otherwise
    echo 'Anime Openings';
    }

    ?></title>
    <!-- Meta tags for web app usage -->
    <meta content='#e65100' name='theme-color'>
    <meta content='yes' name='mobile-web-app-capable'>
    <meta content='yes' name='apple-mobile-web-app-capable'>
    <meta content='black-translucent' name='apple-mobile-web-app-status-bar-style'>

    <!-- Logo links -->
    <link href='/assets/logo/152px.png' rel='apple-touch-icon'>
    <link href='/assets/logo/16px.png' rel='icon' sizes='16x16'>
    <link href='/assets/logo/32px.png' rel='icon' sizes='32x32'>
    <link href='/assets/logo/64px.png' rel='icon' sizes='64x64'>
    <link href='/assets/logo/152px.png' rel='icon' sizes='152x152'>
    <!-- oversized because lol -->
    <link href='/assets/logo/512px.png' rel='icon' sizes='512x512'>

  </head>

  <body>

    <script type="text/javascript">
      var openingToAvoidNext = "<?php echo $filename; ?>";
      // Set site title AFTER loading, because search engines
      $(document).ready(function() {
        document.title = '<?php echo addslashes($names[$filename]["title"]) . ' from ' . addslashes($names[$filename]["source"])  ?>';
      });
    </script>

    <video <?php if(!$mobiledevice){echo 'autoplay';} ?> loop id="bgvid" onended="onend();">
      <source src="<?php echo $video; ?>" type="video/webm">
      lol, lern 2 webm faggot
    </video>

    <div id="progressbar" class="progressbar">
      <div class="progress">
        <div id="bufferprogress" class="progress" style="background: #ccc"></div>
        <div id="timeprogress" class="progress" style="background: #e65100"></div>
      </div>
    </div>

    <span id="menubutton" class="fa fa-bars quadbutton" onclick="showMenu()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>

    <div id="site-menu" hidden>
      <span id="closemenubutton" onclick="hideMenu()" class="fa fa-times quadbutton"></span>

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
        <li class="link">
          <a href="/?video=<?php echo $filename; ?>" id="videolink">Link to this video</a>
        </li>
        <li class="link">
          <a href="/video/<?php echo $filename; ?>" id="videolink" download>Download this video</a>
        </li>
        <li class="link">
          <a href="/list">Video list</a>
        </li><li class="link">
          <a href="/hub">Hub</a>
        </li>
      </ul>

      <p class="count">
        We currently have <b><?php echo count($names); ?></b> openings and endings.
      </p>

      <p class="betanote">
        This site is in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.
      </p>

      <p class="keybindings">
        <b>Keyboard bindings</b>
        <ul class="keybinds-list">
          <li><span class="keycap"><span class="fa fa-arrow-left"></span>/<span class="fa fa-arrow-right"></span></span> Back/Forward 10 seconds<br /></li>
          <li><span class="keycap">Space</span> Pause/Play<br /></li>
          <li><span class="keycap">N</span> New video<br /></li>
          <li><span class="keycap">Page Up/Down or Scroll Wheel</span> Volume<br /></li>
        </ul>
      </p>
    </div>

    <div class="displayTopRight"></div>

    <div id="tooltip" class="is-hidden"></div>

    <div class="controlsleft">
      <span id="getnewvideo" class="fa fa-refresh quadbutton" onclick="retrieveNewVideo()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>
      <span id="autonext" class="fa fa-toggle-off autonext" onclick="toggleAutonext()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>
    </div>

    <div class="controlsright">
      <span id="skip-left" class="fa fa-arrow-left quadbutton" onclick="skip(-10)" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>
      <span id="skip-right" class="fa fa-arrow-right quadbutton" onclick="skip(10)" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>
      <?php
      // Echo pause button unless the device is mobile
      if(!$mobiledevice) {
        echo '<span id="pause-button" class="fa fa-pause quadbutton" onclick="playPause()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>';
      }
      else {
        echo '<span id="pause-button" class="fa fa-play quadbutton" onclick="playPause()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>';
      }
      ?>
    </div>

    <?php
    // Legacy code left just in case

    /*// For the poor mobile users
      if($mobiledevice) {
          // Echo message for mobilefags
          echo '<div style="position:fixed;top:10px;right:10px;background-color:#fff;padding:10px;font-size: 18pt;max-width:25%;min-width:230px;box-shadow:0px 0px 4px #111;">You appear to be visiting using a mobile device. This site does not work properly on phones, sorry about that</div>';
      }*/
    ?>

    <?php
    include_once('backend/includes/botnet.html');
    ?>

  </body>
</html>
