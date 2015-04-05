<?php

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
    <title>Anime opening</title>
    <script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>

  </head>

  <body>

    <script src="main.js"></script>
    <script src="progressbar.js"></script>

    <video autoplay loop  id="bgvid" onended="onend();">
      <source src="<?php echo $video; ?>" type="video/webm">
      lol, lern 2 webm faggot
    </video>

    <div class="controls">
      <i id="autonext" onclick="toggleAutonext()" class="fa fa-toggle-off dautonext" title="Do you want to see other videos after this one?"></i>
      <i onclick="skip(-10)" class="fa fa-arrow-left quadbutton"></i>
      <i onclick="skip(10)" class="fa fa-arrow-right quadbutton"></i>
      <i id="pause-button" onclick="playPause()" class="fa fa-pause quadbutton"></i>
    </div>

    <i id="menubutton" onclick="showMenu()" class="fa fa-bars quadbutton"></i>

    <div id="site-menu" class="is-hidden">

      <i id="closemenubutton" onclick="hideMenu()" class="fa fa-times quadbutton"></i>

      <p id="title">
        <?php

        //If we have the data, echo it
        if (array_key_exists($filename, $names)) {
          echo $names[$filename]["title"];
        }
        else { // Give a generic reply otherwise
          echo 'No title available';
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
          echo 'No source available yet';
        }

        ?>
      </p>
      <p class="directlink">
        <a href="http://animeopenings.tk/?video=<?php echo $filename; ?>" id="videolink">Link to this video</a>
      </p>

      <p class="count">
        We currently have <b><?php echo count($names); ?></b> Openings and endings
      </p>

      <p class="betanote">
        This site is currently in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.
      </p>

    </div>

    <!-- Initiate botnet -->
    <!-- Piwik code goes here-->


  </body>

</html>
