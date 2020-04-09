<?php
	include_once '../backend/includes/helpers.php';
	include_once '../names.php';
	// Custom ETag Handling
	$etag = '"' . md5_file(__FILE__) . (isset($_GET['frame']) ? 'F"' : '"');
	if (array_key_exists('HTTP_IF_NONE_MATCH', $_SERVER) && trim($_SERVER['HTTP_IF_NONE_MATCH']) == $etag) {
		header('HTTP/1.1 304 Not Modified');
		die();
	}
	header('ETag: ' . $etag);
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
		<meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="../JS/lang.js"></script>
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
				<p class="playlistTop"><?php echo I18N::t('{number} Videos in Playlist', ['{number}' => 0]) ?></p>
				<p class="playlistBot"><span><?php echo I18N::t('Edit Playlist') ?></span><span></span><span><?php echo I18N::t('Start Playlist') ?></span></p>
			</div>

			<?php
			// Load names.php and count videos/series

			include_once '../names.php';

			$videosnumber = 0;
			foreach ($names as $videos) $videosnumber += count($videos);
			$seriesnumber = count($names);

            echo '<p>'.I18N::t('We currently serve {videos} videos from {series} series.', [
                    '{videos}' => '<span class="count">' . $videosnumber . '</span>',
                    '{series}' => '<span class="count">' . $seriesnumber . '</span>'])
                .'</p>';
            ?>

			<label>
                <a id="searchURL" href=""><?php echo I18N::t('Search:') ?></a>
				<input id="searchbox" type="text" placeholder="<?php echo I18N::t('Series name...') ?>" autofocus>
			</label>
			<br>
			<p id="regex"><span><?php echo I18N::t('press tab while typing to enable RegEx in search'); ?></span></p>
			<br>

			<div id="NoResultsMessage" hidden>
                <p><?php echo I18N::t('We could not find any shows matching your search query.') ?></p>
                <ol>
                    <li><?php echo I18N::t('Is it spelled correctly?') ?></li>
                    <li><?php echo I18N::t('Have you tried using the Japanese title?') ?></li>
                    <li><?php echo I18N::t('Have you tried using the English title?') ?></li>
                </ol>
                <p><?php echo I18N::t('If you still can\'t find the video you are looking for, we probably don\'t have it yet.') ?></p>
            </div>

			<?php
			include_once '../backend/includes/helpers.php';

			// Output list of videos
			foreach ($names as $series => $video_array) {

				$html = '';
				foreach ($video_array as $title => $data) {
					// Skip Easter Eggs
					if (isset($data['egg']) && $data['egg']) continue;

					// Generate HTML for each video
					$html .= '	<i class="fa fa-plus" data-file="' . htmlspecialchars($data['file']) . '" data-mime="' . htmlspecialchars(json_encode($data['mime'])) . '"';
					if (array_key_exists('song', $data)) $html .= ' data-songtitle="' . htmlspecialchars($data['song']['title']) . '" data-songartist="' . htmlspecialchars($data['song']['artist']) . '"';
					if (array_key_exists('subtitles', $data)) $html .= ' data-subtitles="' . htmlspecialchars($data['subtitles']) . '"';
					$html .= '></i>' . PHP_EOL;
					$html .= '	<a href="../?video=' . filenameToIdentifier($data['file']) . '">' . $title . '</a>' . PHP_EOL;
					$html .= '	<br>' . PHP_EOL;
				}

				// If any video data HTML was generated, output the series name and the HTML
				if ($html) {
					echo '<div class="series">' . $series . '<div>' . PHP_EOL;
					echo $html;
					echo '</div></div>' . PHP_EOL;
				}
			}
			?>
		</main>

        <?php $jsctl = I18N::_('js')->dump();
        if(!empty($jsctl)) {
            echo '<template id="locale">'.json_encode($jsctl).'</template>';
        } ?>
		<?php include_once '../backend/includes/botnet.html'; ?>
	</body>
</html>
