<html>
<head>
  <title>Video list</title>
  <link rel="stylesheet" type="text/css" href="markdown.css">
  <meta charset="UTF-8">
  <meta name=viewport content="width=device-width, initial-scale=1">
</head>
<body onload="loadListIntoJavascript()" onpageshow="search()">

<a href="../hub"><< Back to the hub</a>

<h1>Video list</h1>

<?php

// Includes
include_once('../names.php');
include_once('../backend/includes/sort.php');

$videosnumber = count($names);

// Rearrange by series
$series = rearrange($names);

$seriesnumber = count($series);

echo '<p>We currently serve <span style="color:#2ECC40">' . $videosnumber . '</span> videos from <span style="color:#2ECC40">' . $seriesnumber . '</span> series.</p>';

?>

<span>Search: </span><input id="searchbox" type="text" onkeyup="search()"><br><br>

<br />

<?php

foreach ($series as $key => $opening) {
        // Series
        echo '<div class="series">' . $key;

        // List
        echo '<ul>' . PHP_EOL . PHP_EOL;
        foreach ($opening as $video) { //Hey, I heard you like new lines
                echo '  <a href="../?video=' . $video["filename"] . '">' . PHP_EOL
                . '    <div class="title">' . PHP_EOL
                . '      - ' . $video["title"] . PHP_EOL
                . '    </div>' . PHP_EOL
                . '  </a>' . PHP_EOL . PHP_EOL
                . '  <br />' . PHP_EOL
                . PHP_EOL;
        }

        echo '</ul>' . PHP_EOL . '</div>' . PHP_EOL . PHP_EOL;

  //echo '<div class="opening"><p class="source">' . $opening["source"] . ' - </p><a href="../?video=' . $key . '"><p class="title">' . $opening["title"] . '</p></a></div>' . PHP_EOL;
}

include_once('../backend/includes/botnet.html');

?>

<!-- Searchbox Code -->
    <script type="text/javascript">
      function loadListIntoJavascript()
      {
        list = document.getElementsByClassName('series');

        if ( location.search.indexOf('=') > -1 )
          document.getElementById('searchbox').value = location.search.substring(location.search.indexOf('=')+1);
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
