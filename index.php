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
    <script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>

  </head>

  <body>

    <!-- Play/pause -->
    <script>
    function playPause() {
      if ($('video')[0].paused) {
        $('video')[0].play();
        $('#pause-button').attr('class', 'fa fa-pause pause-btn');
      } else {
        $('video')[0].pause();
        $('#pause-button').attr('class', 'fa fa-play play-btn');
      }
    }
    
    var autonext = false;
    var toggleAutonext = function() {
      autonext = !autonext;
      if (autonext) {
        $('#autonext').attr('class', 'fa fa-toggle-on autonext');
        $('video').removeAttr('loop');
      } else {
        $('#autonext').attr('class', 'fa fa-toggle-off dautonext');
        $('video').attr('loop', '');
      }
    }

    var onend = function() {
      if (autonext) {
        $.getJSON('nextvideo.php', function(data) {
          console.log(data);
          var videourl = data['videourl'];
          $('source').attr('src', videourl);
          $('video')[0].load();
          $('#source').html(data['videoname']);
          $('#videolink').attr('href', 'http://animeopenings.tk/?video=' + data['videofname']);
        });
      }
    };
    </script>

    <video autoplay loop id="bgvid" onended="onend();">
      <source src="<?php echo $video; ?>" type="video/webm">
      lol, lern 2 webm faggot
    </video>
    <div id="overlay">
      <p id="source">
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
        <a href="http://animeopenings.tk/?video=<?php echo $filename; ?>" id="videolink">Link to this video</a>
      </p>
    </div>

    <i id="pause-button" onclick="playPause()" class="fa fa-pause pause-btn"></i>
    <i id="autonext" onclick="toggleAutonext()" class="fa fa-toggle-off dautonext" title="Do you want to see other videos after this one?"></i>

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
