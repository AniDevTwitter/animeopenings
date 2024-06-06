<?php
	// Custom ETag Handling
	$etag = '"' . md5_file(__FILE__) . (isset($_GET['frame']) ? 'F"' : '"');
	if (trim($_SERVER['HTTP_IF_NONE_MATCH']) == $etag) {
		header('HTTP/1.1 304 Not Modified');
		die();
	}
	header('ETag: ' . $etag);

	require_once '../backend/includes/cache.php';
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Video List</title>
		<meta charset="UTF-8">
		<base target="_parent">
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<link rel="stylesheet" type="text/css" href="../CSS/list.css">
<?php if(isset($_GET['frame'])) echo '		<link rel="stylesheet" type="text/css" href="../CSS/frame.css">'; ?>
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<script src="../JS/list.js"></script>
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

			<?php echo '<p>We currently serve <span class="count">' . $CACHE['NUM_VIDEOS'] . '</span> videos from <span class="count">' . $CACHE['NUM_SOURCES'] . '</span> series.</p>'; ?>

			<label>
				<a id="searchURL" href="">Search:</a>
				<input id="searchbox" type="text" placeholder="Source name..." autofocus>
			</label>
			<br>
			<p id="regex"><span>(press tab while typing to enable RegEx in search)</span></p>
			<br>

			<div id="NoResultsMessage" hidden>
				<p>We could not find any shows matching your search query.</p>
				<ol>
					<li>Is it spelled correctly?</li>
					<li>Have you tried using the Japanese title?</li>
					<li>Have you tried using the English title?</li>
				</ol>
				<p>If you still can't find the video you are looking for, we probably don't have it yet.</p>
			</div>

			<?php
			// Output list of videos
			foreach ($LIST_DATA as $source_name => $source_videos) {
				$html = '';
				foreach ($source_videos as $video_title => $data) {
					// Skip hidden videos
					if (isset($data['hidden']) && $data['hidden']) continue;

					// Generate HTML for each video
					$html .= '	<li>' . "\n";
					$html .= '		<i class="fa fa-plus"></i>' . "\n";
					$html .= '		<a href="../?video=' . rawurlencode($data['uid']) . '">' . htmlspecialchars($video_title) . '</a>' . "\n";
					if (isset($data['song'])) $html .= '		<i class="fa fa-music" title="&quot;' . htmlspecialchars($data['song']['title']) . '&quot; by ' . htmlspecialchars($data['song']['artist']) . '"></i>' . "\n";
					if (isset($data['subtitles'])) $html .= '		<i class="fa fa-cc" title="[' . htmlspecialchars($data['subtitles']) . '] subtitles are available for this video"></i>' . "\n";
					$html .= '	</li>' . "\n";
				}

				// If any video data HTML was generated, output the source name and the HTML
				if ($html) {
					echo '<div class="source"><h2>' . htmlspecialchars($source_name) . '</h2><ul>' . "\n";
					echo $html;
					echo '</ul></div>' . "\n";
				}
			}
			?>
		</main>

		<?php include_once '../backend/includes/botnet.html'; ?>
	</body>
</html>
