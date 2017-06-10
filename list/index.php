<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Video List</title>
		<meta charset="UTF-8">
		<base target="_parent">
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<link rel="stylesheet" type="text/css" href="list.css">
		<?php if(isset($_GET['frame'])) echo '<link rel="stylesheet" type="text/css" href="frame.css">'; ?>
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script src="list.js"></script>
	</head>
	<body>
		<header>
			<div>
				<h1>Video List</h1>
				<?php include '../hub/navbar'; ?>
			</div>
		</header>
		<main>
			<div id="playlist" hidden>
				<p class="playlistTop">0 Videos in Playlist</p>
				<p class="playlistBot"><span>Edit Playlist</span><span></span><span>Start Playlist</span></p>
			</div>

			<?php
			// Load names.php and count videos/series

			include_once '../names.php';

			$videosnumber = 0;
			foreach ($names as $videos) $videosnumber += count($videos);
			$seriesnumber = count($names);

			echo '<p>We currently serve <span class="count">' . $videosnumber . '</span> videos from <span class="count">' . $seriesnumber . '</span> series.</p>';
			?>

			<label>
				<a id="searchURL" href="">Search:</a>
				<input id="searchbox" type="text" placeholder="Series name..." autofocus>
			</label>
			<br />
			<p id="regex"><span>(press tab while typing to enable RegEx in search)</span></p>
			<br />

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
			foreach ($names as $series => $video_array) {
				echo '<div class="series">' . $series . '<div>' . PHP_EOL;

				foreach ($video_array as $title => $data) {
					$noext = preg_replace('/\.\w+$/', '', $data['file']);
					echo '	<i class="fa fa-plus" fext="' . str_replace($noext, '', $data['file']) . '"';
						if (array_key_exists('song', $data)) echo ' songTitle="' . $data['song']['title'] . '" songArtist="' . $data['song']['artist'] . '"';
						if (array_key_exists('subtitles', $data)) echo ' subtitles="' . $data['subtitles'] . '"';
					echo '></i>' . PHP_EOL;
					echo '	<a href="../?video=' . $noext . '">' . $title . '</a>' . PHP_EOL;
					echo '	<br />' . PHP_EOL;
				}

				echo '</div></div>' . PHP_EOL;
			}
			?>
		</main>

		<?php include '../backend/includes/botnet.html'; ?>
	</body>
</html>
