<?php
	include_once 'backend/includes/helpers.php';
	include_once 'names.php';

	// check if a specific video has been requested
	if (isset($_GET['video'])) {
		// this should be fine for most cases
		$video = identifierToFileData($_GET['video']);

		// but if it isn't we can try this too
		if ($video === false) {
			// get raw query so it doesn't try to parse the reserved characters (;/?:@&=+,$)
			// the `substr` call removes the "video=" from the start
			$identifier = substr($_SERVER['QUERY_STRING'],6);
			$video = identifierToFileData(rawurldecode($identifier));
		}

		if ($video === false) {
			header('HTTP/1.0 404 Not Found');
			include_once 'backend/pages/notfound.php';
			die();
		}

		$series = $video['series'];
		$title = $video['title'];
		$filename = $video['file'];
		$pagetitle = (isset($video['egg']) ? 'Secret~' : ($title . ' from ' . $series));
		$description = '';
	} else { // otherwise pick a random video
		$series = array_rand($names);
		$title = array_rand($names[$series]);
		$video = $names[$series][$title];
		$filename = $video['file'];
		$pagetitle = 'Anime Openings';
		$description = I18N::t('Anime openings from hundreds of series in high-quality');
	}

	$identifier = filenameToIdentifier($filename);
	$filename = rawurlencode($filename);

	$songKnown = array_key_exists('song', $video);
	if ($songKnown) {
		$songTitle = $video['song']['title'];
		$songArtist = $video['song']['artist'];
		if (empty($description)) {
			$description = I18N::t('Song: "{title}" by {artist}', ['{title}' => $songTitle, '{artist}' => $songArtist,]);
		}
	}

	$subtitlesAvailable = array_key_exists('subtitles', $video);
	$subtitleAttribution = $subtitlesAvailable ? ('[' . $video['subtitles'] . ']') : '';

	$isEgg = isset($video['egg']);

	$baseURL = 'https://' . $WEBSITE_URL . substr($_SERVER['REQUEST_URI'], 0, strrpos($_SERVER['REQUEST_URI'], '/') + 1);
	$oembedURL = $baseURL . 'api/oembed/?url=' . $baseURL . '?' . $_SERVER['QUERY_STRING'];
?>
<!DOCTYPE html>
<html prefix="og: http://ogp.me/ns#">
	<head>
		<!-- Basic Page Stuff -->
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title><?php echo $pagetitle; ?></title>
		<meta name="description" content="<?php echo htmlspecialchars($description); ?>">

		<!-- oEmbed Discovery -->
		<link rel="alternate" type="application/json+oembed" href="<?php echo $oembedURL; ?>&format=json" title="<?php echo $pagetitle; ?>">
		<link rel="alternate" type="text/xml+oembed" href="<?php echo $oembedURL; ?>&format=xml" title="<?php echo $pagetitle; ?>">

		<!-- Open Graph Tags -->
		<meta property="og:type" content="video.other">
		<meta property="og:url" content="<?php echo $baseURL . '?video=' . $identifier; ?>">
		<meta property="og:site_name" content="<?php echo $WEBSITE_URL; ?>">
		<meta property="og:title" content="<?php echo $pagetitle; ?>">
		<meta property="og:description" content="<?php echo htmlspecialchars($description); ?>">
		<meta property="og:image" content="<?php echo $baseURL; ?>assets/logo/512px.png"><?php
			foreach ($video['mime'] as $mime) {
				$ext = mimeToExt($mime);
				$content = ' content="' . $baseURL . 'video/' . $filename . $ext . '"';
				echo "\n\t\t" . '<meta property="og:video"' . $content . '>';
				echo "\n\t\t" . '<meta property="og:video:url"' . $content . '>';
				echo "\n\t\t" . '<meta property="og:video:secure_url"' . $content . '>';
				echo "\n\t\t" . '<meta property="og:video:type" content="' . htmlspecialchars($mime) . '">';
			}
			echo PHP_EOL;
		?>

		<!-- Facebook App Link -->
		<meta property="al:web:url" content="<?php echo $baseURL . '?video=' . $identifier; ?>">

		<!-- CSS and JS Resources -->
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<link rel="stylesheet" type="text/css" href="CSS/main.css">
		<link rel="stylesheet" type="text/css" href="CSS/fonts.css">
		<link rel="stylesheet" type="text/css" href="CSS/subtitles.css">
		<script type="text/javascript">
			// Set config values from PHP into JavaScript.
			window.config = {
				VIDEO_INDEX_PADDING: <?php echo $VIDEO_INDEX_PADDING; ?>,
				USE_FILENAME_AS_IDENTIFIER: <?php echo ($USE_FILENAME_AS_IDENTIFIER ? 'true' : 'false') . PHP_EOL; ?>
			};
		</script>
        <script src="JS/lang.js"></script>
		<script src="JS/main.js"></script>
		<script defer src="JS/subtitles.js"></script>

		<!-- Web App Tags -->
		<meta name="theme-color" content="#E58B00">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

		<!-- Logo Links -->
		<link href="/assets/logo/152px.png" rel="apple-touch-icon">
		<link href="/assets/logo/16px.png" rel="icon" sizes="16x16">
		<link href="/assets/logo/32px.png" rel="icon" sizes="32x32">
		<link href="/assets/logo/64px.png" rel="icon" sizes="64x64">
		<link href="/assets/logo/152px.png" rel="icon" sizes="152x152">
		<link href="/assets/logo/512px.png" rel="icon" sizes="512x512">
	</head>
	<body>
		<div id="wrapper">
			<video id="bgvid" loop preload="none"><?php
					foreach ($video['mime'] as $mime) {
						$ext = mimeToExt($mime);
						echo "\n\t\t\t\t" . '<source src="video/' . $filename . $ext . '" type="' . htmlspecialchars($mime) . '">';
					}
					echo PHP_EOL;
				?>
			</video>
		</div>

		<i id="giant-play-button" class="overlay fa fa-play quadbutton quadNotMobile"></i>

		<div id="progressbar" class="progressbar">
			<div class="progress">
				<div id="bufferprogress" class="progress"></div>
				<div id="timeprogress" class="progress"></div>
			</div>
		</div>

		<div class="displayTopRight"></div>

		<a id="menubutton" href="/hub/faq.php" class="quadbutton fa fa-bars"></a>
		<a id="searchbutton" href="/list/" class="quadbutton fa fa-search"></a>

		<div class="controlsleft">
			<span id="videoTypeToggle" class="quadbutton fa fa-circle"></span>
			<span id="getnewvideo" class="quadbutton fa fa-refresh"></span>
			<span id="autonext" class="quadbutton fa fa-toggle-off"></span>
		</div>

		<div class="controlsright">
			<span id="subtitles-button" class="quadbutton fa fa-commenting-o"<?php if (!$subtitlesAvailable) echo ' style="display:none"'; ?>></span>
			<span id="skip-left" class="quadbutton fa fa-arrow-left"></span>
			<span id="skip-right" class="quadbutton fa fa-arrow-right"></span>
			<span id="pause-button" class="quadbutton fa fa-play"></span>
			<span id="fullscreen-button" class="quadbutton fa fa-expand"></span>
		</div>

		<div id="site-menu" hidden>
			<span id="closemenubutton" class="quadbutton fa fa-times"></span>

			<p id="title"><?php echo $title; ?> </p>
            <p id="source"><?php echo I18N::t('From {series}', ['{series}' => '<span id="sourcepayload">'.$series.'</span>']); ?></p>
			<span id="song"><?php // If we have the data, echo it
				if ($songKnown)
					echo I18N::t("Song: \"{title}\" by {artist}", ['{title}' => '<span id="titlepayload">'.$songTitle.'</span>', '{artist}' => '<span id="authorpayload">'.$songArtist.'</span>']);
				else { // Otherwise, let's just pretend it never existed... or troll the user.
					if ($isEgg || mt_rand(0,100) == 1)
						echo I18N::t("Song: \"{title}\" by {artist}", ['{title}' => '<span id="titlepayload">Sandstorm</span>', '{artist}' => '<span id="authorpayload">Darude</span>']);
				} ?></span>
			<p id="subs"<?php if (!$subtitlesAvailable) echo ' style="display:none"'; ?>><?php echo I18N::t('Subtitles by {attribution}', ['{attribution}' => '<span id="subtitle-attribution">'.$subtitleAttribution.'</span>']); ?></p>

			<ul id="linkarea">
				<li class="link"<?php if ($isEgg) echo ' hidden'; ?>><a href="?video=<?php if (!$isEgg) echo $identifier; ?>" id="videolink"><?php echo I18N::t('Link to this video'); ?></a></li><?php
					foreach ($video['mime'] as $mime) {
						$ext = mimeToExt($mime);
						echo "\n\t\t\t\t" . '<li class="link videodownload"' . ($isEgg ? ' hidden' : '') . '><a href="video/' . (!$isEgg ? $filename . $ext : '') . '" download>' . I18N::t('Download this video as {format}', ['{format}' => substr($ext,1)]) . '</a></li>';
					}
					echo PHP_EOL;
				?>
				<li class="link"><a id="listlink" href="/list/"><?php echo I18N::t('Video list') ?></a></li>
				<li class="link"><a href="/hub/"><?php echo I18N::t('Hub') ?></a></li>
			</ul>

			<div class="accordion">
				<input type="checkbox" id="settings-checkbox">
				<label for="settings-checkbox">
					<i class="fa fa-chevron-right"></i>
					<i class="fa fa-chevron-down"></i>
					<?php echo I18N::t('Saved settings') ?>
				</label>
				<form id="settings-form">
					<fieldset>
						<legend><?php echo I18N::t('Show Video Title') ?></legend>
						<input id="show-title-checkbox" type="checkbox" checked><label for="show-title-checkbox"><?php echo I18N::t('Yes') ?></label>
						<label id="show-title-delay"><?php echo I18N::t('after {input} seconds', ['{input}' => '<input type="number" min="0" value="0" step="1">']) ?></label>
					</fieldset>
					<fieldset>
						<legend><?php echo I18N::t('Play'); ?></legend>
						<label><input checked name="videoType" type="radio" value="all"><?php echo I18N::t('All'); ?></label>
						<label><input name="videoType" type="radio" value="op"><?php echo I18N::t('Openings Only'); ?></label>
						<label><input name="videoType" type="radio" value="ed"><?php echo I18N::t('Endings Only'); ?></label>
					</fieldset>
					<fieldset>
						<legend><?php echo I18N::t('On End') ?></legend>
						<label><input name="autonext" type="radio" value="false"><?php echo I18N::t('Repeat Video') ?></label>
						<label><input checked name="autonext" type="radio" value="true"><?php echo I18N::t('Get a New Video') ?></label>
					</fieldset>
					<fieldset>
						<legend><?php echo I18N::t('Subtitles') ?></legend>
						<label><input checked id="subtitle-checkbox" type="checkbox"><?php echo I18N::t('Yes') ?></label>
					</fieldset>
					<fieldset>
						<legend><?php echo I18N::t('Volume') ?></legend>
						<input id="volume-slider" type="range" min="0" max="100" value="100" step="1">
						<label for="volume-slider" id="volume-amount">100%</label>
					</fieldset>
				</form>
			</div>

			<div class="accordion">
				<input type="checkbox" id="keybindings-checkbox">
				<label for="keybindings-checkbox">
					<i class="fa fa-chevron-right"></i>
					<i class="fa fa-chevron-down"></i>
                    <?php echo I18N::t('Keyboard bindings') ?>
				</label>
				<table id="keybindings-table">
					<tr><th><?php echo I18N::t('Key') ?></th><th><?php echo I18N::t('Action') ?></th></tr>
					<tr><td>M</td><td><?php echo I18N::t('Open/Close Menu') ?></td></tr>
					<tr><td>/</td><td><?php echo I18N::t('Open Search Pane') ?></td></tr>
					<tr><td>N</td><td><?php echo I18N::t('Get a new video') ?></td></tr>
					<tr><td>S</td><td><?php echo I18N::t('Toggle subtitles (if available)') ?></td></tr>
					<tr><td><span class="fa fa-arrow-left"></span>/<span class="fa fa-arrow-right"></span></td><td><?php echo I18N::t('Back/Forward 10 seconds') ?></td></tr>
					<tr><td><?php echo I18N::t('Space') ?></td><td><?php echo I18N::t('Pause/Play') ?></td></tr>
					<tr><td>F</td><td><?php echo I18N::t('Toggle fullscreen') ?></td></tr>
					<tr><td><?php echo I18N::t('Page Up/Down') ?></td><td><?php echo I18N::t('Volume') ?></td></tr>
					<tr><td><?php echo I18N::t('Scroll Wheel') ?></td><td><?php echo I18N::t('Volume') ?></td></tr>
				</table>
			</div>

            <div class="accordion">
                <input type="checkbox" id="language-checkbox">
                <label for="language-checkbox">
                    <i class="fa fa-chevron-right"></i>
                    <i class="fa fa-chevron-down"></i>
                    <?php echo I18N::t('Language') ?>
                </label>
                <table id="language-table">
                    <tbody>
                        <?php
                            foreach ($APPLANGS as $index => $lang) {
                                if ($index % 4 === 0) {
                                    echo '<tr><td class="link"><a href="https://' . $WEBSITE_URL .'/?lang='.$lang.'">' . locale_get_display_name($lang, $lang) . '</a></td>';
                                } elseif ($index %4 === 3) {
                                    echo '<td class="link"><a href="https://' . $WEBSITE_URL .'/?lang='.$lang.'">' . locale_get_display_name($lang, $lang) . '</a></td></tr>';
                                } else {
                                    echo '<td class="link"><a href="https://' . $WEBSITE_URL .'/?lang='.$lang.'">' . locale_get_display_name($lang, $lang) . '</a></td>';
                                }
                                // echo '<td>'.locale_get_display_name($lang, $lang).'</td>';
                            }
                        ?>
                    </tbody>
                </table>
            </div>
		</div>

		<div id="tooltip" class="is-hidden"></div>

		<span id="title-popup"></span>
		<div id="modal" class="overlay"><iframe name="_ifSearch"></iframe></div>

		<?php $jsctl = I18N::_('js')->dump();
		if(!empty($jsctl)) {
			echo '<template id="locale">'.json_encode($jsctl).'</template>';
		} ?>

		<?php include_once 'backend/includes/botnet.html'; ?>
	</body>
</html>
