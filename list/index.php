<!DOCTYPE html>
<html>
  <head>
    <title>Video List</title>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="../font-awesome-4.4.0/css/font-awesome.min.css">
    <link rel="stylesheet" type="text/css" href="list.css">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <script src="list.js"></script>
  </head>
  <body>
    <div id="playlist" hidden>
      <p class="playlistTop">0 Videos in Playlist</p>
      <p class="playlistBot"><span>Edit Playlist</span><span></span><span>Start Playlist</span></p>
    </div>

    <a href="../hub">&lt;&lt; Back to the hub</a>

    <h1>Video list</h1>

    <?php
    // Load names.php and count videos/series

    // Includes
    include_once("../names.php");
    include_once("../backend/includes/sort.php");

    $videosnumber = count($names);

    // Rearrange by series
    $series = rearrange($names);

    $seriesnumber = count($series);

    echo '<p>We currently serve <span style="color:#2ECC40">' . $videosnumber . '</span> videos from <span style="color:#2ECC40">' . $seriesnumber . '</span> series.</p>';
    ?>

    <a id="searchURL" href="">Search: </a>
    <input id="searchbox" type="text"><br /><br />

    <div id="NoResultsMessage" hidden>
      <p>We could not find any shows matching your search query.</p>
      <ol>
        <li>Is it spelled correctly?</li>
        <li>Have you tried using the Japanese title?</li>
        <li>Have you tried using the English title?</li>
      </ol>
      <p>If you still can't find the video you are looking for, we probably don't have it yet. In this case, you have two options:</p>
      <ol>
        <li>Mentioning Quad on <a href="https://twitter.com/QuadPiece/">Twitter</a>, or</li>
        <li><a href="../hub/encodes.php">submitting an encode yourself</a>.</li>
      </ol>
    </div>

    <?php
    // Output list of videos
    foreach ($series as $key => $name) {
      // Series
      echo '<div class="series">' . $key . "<div>" . PHP_EOL;

      // List
      foreach ($name as $video) {
        echo  '  <i class="fa fa-plus" song=' . json_encode($video["song"]) . '></i>' . PHP_EOL .
              '  <a href="../?video=' . $video["filename"] . '">' . $video["title"] . "</a>" . PHP_EOL .
              "  <br />" . PHP_EOL;
      }

      echo "</div></div>" . PHP_EOL;
    }

    include_once("../backend/includes/botnet.html");
    ?>
  </body>
</html>
