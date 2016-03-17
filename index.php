<?php
	include_once "names.php";
	include_once "eggs.php";
	$videos = $names + $eggs;

	// Check if a specific video has been requested
	if (isset($_GET["video"])) {
		$filename = $_GET["video"];

		foreach ($videos as $S => $video_array) {
			foreach ($video_array as $T => $data) {
				if ($data["file"] == $filename) {
					$series = $S;
					$title = $T;

					// I can break out of two loops at once!
					// I wish I could do this in C++...
					break 2;
				}
			}
		}
	} else { // Otherwise pick a random video
		$series = array_rand($videos);
		$title = array_rand($videos[$series]);

		$filename = $videos[$series][$title]["file"];
	}

	// Error handling, QuadStyle™
	if (!file_exists("video/" . $filename) || strpos($filename, '/') !== false) {
		header("HTTP/1.0 404 Not Found");
		echo file_get_contents("backend/pages/notfound.html");
		die;
	}

	$songKnown = array_key_exists("song", $videos[$series][$title]);
	if ($songKnown) {
		$songTitle = $videos[$series][$title]["song"]["title"];
		$songArtist = $videos[$series][$title]["song"]["artist"];
	}

	$subtitlesAvailable = array_key_exists("subtitles", $videos[$series][$title]);
	$subtitleAttribution = $subtitlesAvailable ? ("[" . $videos[$series][$title]["subtitles"] . "]") : "";
?>
<!DOCTYPE html>
<html>
	<head>
		<!-- Basic Page Stuff -->
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title><?php // Echo data if using a direct link, else use a generic title.
			if(isset($_GET["video"])) {
				if ($series == "???") echo "Secret~";
				else echo $title . " from " . $series;
			} else echo "Anime Openings"; ?></title>
		<meta name="description" content="<?php // Echo data if using a direct link, else use a generic description.
			if(isset($_GET["video"])) {
				if ($series == "???") echo "Secret~";
				else echo $title . " from " . $series;
			} else echo "Anime openings from hundreds of series in high-quality"; ?>">

		<!-- Open Graph Tags -->
		<meta property="og:type" content="video.other" />
		<meta property="og:url" content="https://openings.moe/?video=<?php echo $filename; ?>" />
		<meta property="og:video:url" content="https://openings.moe/video/<?php echo $filename; ?>" />
		<meta property="og:video:secure_url" content="https://openings.moe/video/<?php echo $filename; ?>" />
		<meta property="og:video:type" content="video/webm" />
		<meta property="og:video:width" content="720" />
		<meta property="og:video:height" content="480" />
		<meta property="og:image" content="https://openings.moe/Yay295/test/assets/logo/og.png" />
		<meta property="og:image:width" content="480" />
		<meta property="og:image:height" content="270" />
		<meta property="og:site_name" content="openings.moe" />
		<meta property="og:title" content="<?php
			if(isset($_GET["video"])) {
				if ($series == "???") echo "Secret~";
				else echo $title . " from " . $series;
			} else echo "Anime Openings"; ?>" />
		<meta property="og:description" content="Visit openings.moe for hundreds of high-quality anime openings" />
		<meta property="al:web:url" content="https://openings.moe/?video=<?php echo $filename; ?>" />

		<!-- Open Graph Tags: Twitter Style -->
		<meta name="twitter:card" content="player" /> <!-- summary or player -->
		<meta name="twitter:site" content="@QuadPiece" />
		<meta name="twitter:title" content="<?php
			if(isset($_GET["video"])) {
				if ($series == "???") echo "Secret~";
				else echo $title . " from " . $series;
			} else echo "Anime Openings"; ?>" />
		<meta name="twitter:description" content="Visit openings.moe for hundreds of high-quality anime openings" />
		<meta name="twitter:image" content="https://openings.moe/Yay295/test/assets/logo/og.png" />
		<meta name="twitter:player" content="https://openings.moe/?video=<?php echo $filename; ?>" />
		<meta name="twitter:player:width" content="1280" />
		<meta name="twitter:player:height" content="720" />

		<!-- CSS and JS external resources block -->
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<link rel="stylesheet" type="text/css" href="CSS/main.css">
		<link rel="stylesheet" type="text/css" href="CSS/fonts.css">
		<link rel="stylesheet" type="text/css" href="CSS/captions.css">

		<script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
		<script src="main.js"></script>
		<script async src="subtitles/code/math.min.js"></script>
		<script async src="subtitles/code/fitCurves.js"></script>
		<script async src="subtitles/code/captions.js"></script>

		<!-- Meta tags for web app usage -->
		<meta name="theme-color" content="#E58B00">
		<meta name="mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-capable" content="yes">
		<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

		<!-- Logo links -->
		<link href="/assets/logo/152px.png" rel="apple-touch-icon">
		<link href="/assets/logo/16px.png" rel="icon" sizes="16x16">
		<link href="/assets/logo/32px.png" rel="icon" sizes="32x32">
		<link href="/assets/logo/64px.png" rel="icon" sizes="64x64">
		<link href="/assets/logo/152px.png" rel="icon" sizes="152x152">
		<link href="/assets/logo/512px.png" rel="icon" sizes="512x512">
	</head>

	<body>
		<div id="wrapper">
			<svg xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" id="caption_container"></svg>
			<video id="bgvid" loop preload="none" onended="onend()">
				<source src="video/<?php echo $filename; ?>" type="video/webm">
				Your web browser does not support WebM video.
			</video>
		</div>

		<div id="progressbar" class="progressbar">
			<div class="progress">
				<div id="bufferprogress" class="progress"></div>
				<div id="timeprogress" class="progress"></div>
			</div>
		</div>

		<a id="menubutton" href="/hub/faq.php" class="quadbutton fa fa-bars"></a>

		<div id="site-menu" hidden>
			<span id="closemenubutton" onclick="hideMenu()" class="quadbutton fa fa-times"></span>

			<p id="title"><?php echo $title; ?> </p>
			<p id="source"><?php echo "From " . $series; ?></p>
			<span id="song"><?php // If we have the data, echo it
				if ($songKnown)
					echo "Song: &quot;" . $songTitle . "&quot; by " . $songArtist;
				else { // Otherwise, let's just pretend it never existed... or troll the user.
					if ($series == "???" || mt_rand(0,100) == 1)
						echo "Song: &quot;Sandstorm&quot; by Darude";
					else
						echo "";
				} ?></span>
			<p id="subs"<?php if (!$subtitlesAvailable) echo ' style="display:none"'; ?>>Subtitles by <span id="subtitle-attribution"><?php echo $subtitleAttribution; ?></span></p>

			<ul id="linkarea">
				<li class="link"<?php if ($series == "???") echo " hidden"; ?>><a href="/?video=<?php if ($series != "???") echo $filename; ?>" id="videolink">Link to this video</a></li>
				<li class="link"<?php if ($series == "???") echo " hidden"; ?>><a href="video/<?php if ($series != "???") echo $filename; ?>" id="videodownload" download>Download this video</a></li>
				<li class="link"><a href="/list/">Video list</a></li>
				<li class="link"><a href="/hub/">Hub</a></li>
				<li class="link"><a href="/hub/faq.php#keybindings">Keyboard bindings</a></li>
			</ul>

			<p class="betanote">
				This site is in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.
			</p>
		</div>

		<div class="displayTopRight"></div>

		<div id="tooltip" class="is-hidden"></div>

		<div class="controlsleft">
			<span id="openingsonly" class="quadbutton fa fa-circle" onclick="toggleOpeningsOnly()"></span>
			<span id="getnewvideo" class="quadbutton fa fa-refresh" onclick="retrieveNewVideo()"></span>
			<span id="autonext" class="quadbutton fa fa-toggle-off" onclick="toggleAutonext()"></span>
		</div>

		<div class="controlsright">
			<span id="subtitles-button" class="quadbutton fa fa-commenting-o" onclick="toggleSubs()" <?php if (!$subtitlesAvailable) echo 'style="display:none"'; ?>></span>
			<span id="skip-left" class="quadbutton fa fa-arrow-left" onclick="skip(-10)"></span>
			<span id="skip-right" class="quadbutton fa fa-arrow-right" onclick="skip(10)"></span>
			<span id="pause-button" class="quadbutton fa fa-play" onclick="playPause()"></span>
			<span id="fullscreen-button" class="quadbutton fa fa-expand" onclick="toggleFullscreen()"></span>
		</div>

		<?php
		include_once "backend/includes/botnet.html";
		?>
	</body>
</html>
