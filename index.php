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
    <style type="text/css"></style>

  </head>

  <body>

    <!-- Play/pause -->
    <script>
    function playPause() {
        var mediaPlayer = document.getElementById('bgvid');
        if (mediaPlayer.paused) {
            mediaPlayer.play();
            document.getElementById("pause-button").className = "";
            document.getElementById("pause-button").className = "fa fa-pause pause-btn";
        } else {
            mediaPlayer.pause();
            document.getElementById("pause-button").className = "";
            document.getElementById("pause-button").className = "fa fa-play play-btn";
        }
    }
    </script>

    <video autoplay="" loop=""  id="bgvid">
      <source src="<?php echo $video; ?>" type="video/webm">
      lol, lern 2 webm faggot
    </video>

    <div id="overlay">
      <p class="source">
        <?php

        //Echo name if it exists
        if (array_key_exists($filename, $names)) {
          echo $names[$filename];
        } //Else give generic message
        else {
          echo 'No source yet';
        }

        ?>
      </p>
      <p id="info">
        <a href="./?video=<?php echo $filename; ?>">Link to this video</a>
      </p>
    </div>

    <i id="pause-button" onclick="playPause()" class="fa fa-pause pause-btn"></i>

    <p class="betanote">
      This site is currently in beta.<br />
      Request openings/endings<br />
      and report errors by mentioning<br />
      @QuadPiece on Twitter.
    </p>

    <!-- Initiate botnet -->
    <!-- Piwik code would go here -->


  </body>

</html>
