<html>
	<head>
		<meta charset="utf-8">
		<title>Video Not Found</title>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
			@import url(https://fonts.googleapis.com/css?family=Lato:400,700);

			body {
				background-color: #2D2D2D;
				font-family: 'Lato', sans-serif;
				color: #FFF;
			}

			.container {
				width: 820px;
				padding: 25px;
				max-width: 100%;
				margin-left: auto;
				margin-right: auto;
			}

			.error {font-size: 24pt}

			ol {list-style: none}

			a {
				text-decoration: none;
				color: #e65100;
			}

			.subtle {
				font-size: 16pt;
				opacity: 0.5;
			}
		</style>
	</head>
	<body>
		<div class="container">
			<p class="error">We couldn't find that video. It may have been deleted or renamed.</p>
			<?php
			if (isset($_GET['video']) && $_GET['video'] != '') {
				$file = $_GET['video'];

				// Remove 'OpeningX-', 'InsertX-', or 'EndingX-' from the start if it's there.
				$start = substr($file, 0, 6);
				if ($start == 'Openin' || $start == 'Insert' || $start == 'Ending')
					$file = explode('-', $file, 2)[1];

				include_once __DIR__ . '../../names.php';
				$map = [];
				foreach ($names as $series => $video_array) {
					foreach ($video_array as $title => $data) {
						similar_text($file, $data['file'], $percent);
						$map[$series] = min((@$map[$series] ?: 999), $percent);
					}
				}

				arsort($map);
				$keys = array_keys($map);

				echo '<p>Perhaps you were looking for one of these?' . PHP_EOL;
				echo '	<ol>' . PHP_EOL;
				echo '		<li><a href="list/?s=' . rawurlencode($keys[0]) . '">' . $keys[0] . '</a></li>' . PHP_EOL;
				echo '		<li><a href="list/?s=' . rawurlencode($keys[1]) . '">' . $keys[1] . '</a></li>' . PHP_EOL;
				echo '		<li><a href="list/?s=' . rawurlencode($keys[2]) . '">' . $keys[2] . '</a></li>' . PHP_EOL;
				echo '	</ol>' . PHP_EOL;
				echo '</p>' . PHP_EOL;
			}
			?>
			<p class="error">If you wish, you can <a href=".">get a random video</a> or <a href="list/">view the list</a>.</p>
			<p class="subtle">If you were looking for an easter egg, these sadly get replaced by new ones from time to time. Have fun looking for a new one!</p>
			<p class="subtle">This means 404 in case you didn't guess.</p>
		</div>
	</body>
</html>
