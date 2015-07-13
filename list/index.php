<html>
<head>
  <title>Video List</title>
  <link rel="stylesheet" type="text/css" href="markdown.css">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body onload="loadListIntoJavascript()" onpageshow="search()">

<a href="../hub"><< Back to the hub</a>
<h1>Video list</h1>

<?php
  //Load names.php and count video/series

  // Includes
  include_once('../names.php');
  include_once('../backend/includes/sort.php');

  $videosnumber = count($names);

  // Rearrange by series
  $series = rearrange($names);

  $seriesnumber = count($series);

  echo '<p>We currently serve <span style="color:#2ECC40">' . $videosnumber . '</span> videos from <span style="color:#2ECC40">' . $seriesnumber . '</span> series.</p>';
?>

<a onmousedown="document.getElementById('searchURL').href='?s='+document.getElementById('searchbox').value;" id="searchURL" href="">Search: </a>
<input id="searchbox" type="text" onkeyup="search()"><br /><br />

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
    <li><a href="../hub/encodes.php">submit an encode yourself</a>.</li>
  </ol>
</div>

<?php
  // Output list of videos
  foreach ($series as $key => $opening) {
    // Series
    echo '<div class="series">' . $key . '<ul>' . PHP_EOL;

    // List
    foreach ($opening as $video) {
      echo  '  <a class="title" href="../?video=' . $video["filename"] . '">- '
          . $video["title"] . '</a>' . PHP_EOL . '  <br />' . PHP_EOL;
    }

    echo '</ul></div>' . PHP_EOL;
  }

  include_once('../backend/includes/botnet.html');
?>

<!-- Searchbox Code -->
<script type="text/javascript">
function loadListIntoJavascript()
{
  $('#???').remove(); // Remove Easter Eggs

  list = document.getElementsByClassName('series');

  for ( i = 0; i < list.length; ++i )
    list[i].id = list[i].textContent.substring(0,list[i].textContent.indexOf('\n')).toUpperCase();

  if ( location.search.indexOf('=') > -1 )
    document.getElementById('searchbox').value = decodeURIComponent(location.search.substring(location.search.indexOf('=')+1));
}

function search()
{
  var toFind = document.getElementById('searchbox').value.toUpperCase().split(' ');

  var anyResults = false;

  for ( i = 0; i < list.length; ++i )
  {
    for ( j = 0; j < toFind.length; ++j )
    {
      if ( list[i].id.indexOf(toFind[j]) !== -1 )
      {
        list[i].removeAttribute('hidden','');

        anyResults = true;
      }

      else
      {
        list[i].setAttribute('hidden','');

        break;
      }
    }
  }

  if ( anyResults ) document.getElementById('NoResultsMessage').setAttribute('hidden','');
  else document.getElementById('NoResultsMessage').removeAttribute('hidden','');
}
</script>
</body>
</html>
