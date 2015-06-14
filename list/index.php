<html>
<head>
  <title>Video List</title>
  <link rel="stylesheet" type="text/css" href="markdown.css">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body onload="loadListIntoJavascript()" onpageshow="search()">

<a href="../hub"><< Back to the hub</a>
<h1>Video List</h1>

<!-- Load names.php and Count Videos/Series -->
<?php
  // Includes
  include_once('../names.php');
  include_once('../backend/includes/sort.php');

  $videosnumber = count($names);

  // Rearrange by Series
  $series = rearrange($names);

  $seriesnumber = count($series);

  echo '<p>We currently serve <span style="color:#2ECC40">' . $videosnumber . '</span> videos from <span style="color:#2ECC40">' . $seriesnumber . '</span> series.</p>';
?>

<a onmousedown="document.getElementById('searchURL').href='?s='+document.getElementById('searchbox').value;" id="searchURL" href="">Search: </a>
<input id="searchbox" type="text" onkeyup="search()"><br /><br />

<!-- Output List of Videos -->
<?php
  foreach ($series as $key => $opening)
  {
    // Series
    echo '<div class="series">' . $key . '<ul>' . PHP_EOL;

    // List
    foreach ($opening as $video)
    {
      echo  '  <a href="../?video=' . $video["filename"] . '">' . PHP_EOL
          . '    <div class="title">' . PHP_EOL
          . '      - ' . $video["title"] . PHP_EOL
          . '    </div>' . PHP_EOL
          . '  </a>' . PHP_EOL
          . '  <br />' . PHP_EOL;
    }

    echo '</ul></div>' . PHP_EOL;
  }

  include_once('../backend/includes/botnet.html');
?>

<!-- Searchbox Code -->
<script type="text/javascript">
function loadListIntoJavascript()
{
  list = document.getElementsByClassName('series');

  if ( location.search.indexOf('=') > -1 )
    document.getElementById('searchbox').value = decodeURIComponent(location.search.substring(location.search.indexOf('=')+1));
}

function search()
{
  var toFind = document.getElementById('searchbox').value.toUpperCase().split(' ');

  for ( i = 0; i < list.length; ++i )
  {
    for ( j = 0; j < toFind.length; ++j )
    {
      if ( list[i].textContent.toUpperCase().substring(0,list[i].textContent.indexOf('\n')).indexOf(toFind[j]) !== -1 ) list[i].removeAttribute('hidden','');

      else
      {
        list[i].setAttribute('hidden','');

        break;
      }
    }
  }
}
</script>
</body>
</html>
