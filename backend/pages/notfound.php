<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<title>Video Not Found</title>
		<meta name="viewport" content="width=device-width,initial-scale=1">
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
			<p class="error">We couldn't find that video. It may have been deleted or renamed.</p><?php
			if (isset($_GET['video']) && $_GET['video'] != '') {
				$identifier = $_GET['video'];

				require_once __DIR__ . '/../includes/cache.php';

				// Store the results worst first.
				$result_source = ['','',''];
				$result_values = [0.0,0.0,0.0];

				foreach ($LIST_DATA as $source => $video_array) {
					$source_best_percent = 0.0;
					foreach ($video_array as $title => $data) {
						similar_text($identifier, $data['uid'], $percent);
						if ($percent > $source_best_percent) {
							$source_best_percent = $percent;
						}
					}

					// Bubble the new value up the array.
					if ($source_best_percent > $result_values[0]) {
						$result_source[0] = $source;
						$result_values[0] = $source_best_percent;

						if ($source_best_percent > $result_values[1]) {
							list($result_source[1],$result_source[0]) = [$result_source[0],$result_source[1]];
							list($result_values[1],$result_values[0]) = [$result_values[0],$result_values[1]];

							if ($source_best_percent > $result_values[2]) {
								list($result_source[2],$result_source[1]) = [$result_source[1],$result_source[2]];
								list($result_values[2],$result_values[1]) = [$result_values[1],$result_values[2]];
							}
						}
					}
				}

				echo "\n\t\t\t";
				echo '<p>Perhaps you were looking for one of these?' . "\n";
				echo '				<ol>' . "\n";
				echo '					<li><a href="list/?s=' . rawurlencode($result_source[2]) . '">' . $result_source[2] . '</a></li>' . "\n";
				echo '					<li><a href="list/?s=' . rawurlencode($result_source[1]) . '">' . $result_source[1] . '</a></li>' . "\n";
				echo '					<li><a href="list/?s=' . rawurlencode($result_source[0]) . '">' . $result_source[0] . '</a></li>' . "\n";
				echo '				</ol>' . "\n";
				echo '			</p>' . "\n";
			} else echo "\t\t\t\t";
			?>
			<p class="error">If you wish, you can <a href=".">get a random video</a> or <a href="list/">view the list</a>.</p>
			<p class="subtle">If you were looking for an easter egg, these sadly get replaced by new ones from time to time. Have fun looking for a new one!</p>
			<p class="subtle">This means 404 in case you didn't guess.</p>
		</div>
	</body>
</html>
