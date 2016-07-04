<?php
	include "names.php";
	$videos = $names;

	if (file_exists("eggs.php")) {
		include "eggs.php";
		$videos += $eggs;
	}

	$filename = "";

	// Check if a specific video has been requested
	if (isset($_GET["video"])) {
		$neglength = -strlen($_GET["video"]);

		foreach ($videos as $S => $video_array) {
			foreach ($video_array as $V => $data) {
				// $DFM == $data["file"] without its file extension
				$DFM = preg_replace("/\.\w+$/", "", $data["file"]);

				// if $_GET["video"] starts with $DFM
				if (strripos($_GET["video"], $DFM, $neglength) === 0) {
					// if $_GET["video"] is longer than $DFM
					if (-$neglength > strlen($DFM)) {
						// The only reason it should be longer is if it has a
						// file extension, so let's remove that.
						if (strlen(preg_replace("/\.\w+$/", "", $_GET["video"])) == strlen($DFM)) {
							$filename = $data["file"];
							$series = $S;
							$video = $V;
							break 2;
						}
					} else {
						$filename = $data["file"];
						$series = $S;
						$video = $V;
						break 2;
					}
				}
			}
		}

		$title = ($series == "???" ? "Secret~" : ($video . " from " . $series));
		$description = "";
	} else { // Otherwise pick a random video
		$series = array_rand($videos);
		$video = array_rand($videos[$series]);

		$filename = $videos[$series][$video]["file"];

		$title = "Anime Openings";
		$description = "Anime openings from hundreds of series in high-quality";
	}

	// Error handling, QuadStyle™ (feat. Yay295)
	if ($filename == "") {
		header("HTTP/1.0 404 Not Found");
		echo file_get_contents("backend/pages/notfound.html");
		die;
	}

	// $filename without the file extension
	$s_filename = preg_replace("/\.\w+$/", "", $filename);

	$songKnown = array_key_exists("song", $videos[$series][$video]);
	if ($songKnown) {
		$songTitle = $videos[$series][$video]["song"]["title"];
		$songArtist = $videos[$series][$video]["song"]["artist"];
	}

	$subtitlesAvailable = array_key_exists("subtitles", $videos[$series][$video]);
	$subtitleAttribution = $subtitlesAvailable ? ("[" . $videos[$series][$video]["subtitles"] . "]") : "";

	function videoMIMEsubtype() {
		global $s_filename;
		global $filename;

		switch (strtolower(str_replace($s_filename, "", $filename))) {
			case ".mp4":
			case ".m4v":
				return "mp4";
			case ".ogg":
			case ".ogm":
			case ".ogv":
				return "ogg";
			case ".webm":
				return "webm";
			default:
				return "*";
		}
	}
?>
<!DOCTYPE html>
<html prefix="og: http://ogp.me/ns#">
	<head>
		<!-- Basic Page Stuff -->
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title><?php echo $title; ?></title>
		<meta name="description" content="<?php echo $description; ?>">

		<!-- Open Graph Tags -->
		<meta property="og:type" content="article" /> <!-- article or video.other -->
		<meta property="og:url" content="https://openings.moe/?video=<?php echo $s_filename; ?>" />
		<meta property="og:site_name" content="openings.moe" />
		<meta property="og:title" content="<?php echo $title; ?>" />
		<meta property="og:description" content="<?php echo $description; ?>" />
		<meta property="al:web:url" content="https://openings.moe/?video=<?php echo $s_filename; ?>" />

		<!-- Google Stuff -->
		<meta name="google-site-verification" content="J8ZBk2wWSOvLneswCoGGHmrwRPBy9HbX7RHxAGFgz4E" />
		<script type="application/ld+json">
			{
				"@context" : "http://schema.org",
				"@type" : "WebSite",
				"url" : "https://openings.moe/",
				"potentialAction" : {
					"@type" : "SearchAction",
					"target" : "https://openings.moe/search/?s={search_term_string}",
					"query-input" : "required name=search_term_string"
				}
			}
		</script>


		<!-- CSS and JS external resources block -->
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<link rel="stylesheet" type="text/css" href="CSS/main.css">
		<link rel="stylesheet" type="text/css" href="CSS/fonts.css">
		<link rel="stylesheet" type="text/css" href="CSS/subtitles.css">

		<script src="https://code.jquery.com/jquery-2.1.3.min.js"></script>
		<script src="main.js"></script>
		<script async src="subtitles/code/math.min.js"></script>
		<script async src="subtitles/code/fitCurves.js"></script>
		<script async src="subtitles/code/subtitles.js"></script>

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
			<svg xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" class="subtitle_container"></svg>
			<video id="bgvid" loop preload="none" onended="onend()">
				<source src="video/<?php echo $filename; ?>" type="video/<?php echo videoMIMEsubtype(); ?>">
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

			<p id="title"><?php echo $video; ?> </p>
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
				<li class="link"<?php if ($series == "???") echo " hidden"; ?>><a href="/?video=<?php if ($series != "???") echo $s_filename; ?>" id="videolink">Link to this video</a></li>
				<li class="link"<?php if ($series == "???") echo " hidden"; ?>><a href="video/<?php if ($series != "???") echo $filename; ?>" id="videodownload" download>Download this video</a></li>
				<li class="link"><a href="/list/">Video list</a></li>
				<li class="link"><a href="/hub/">Hub</a></li>
				<li class="link"><a href="/hub/faq.php#keybindings">Keyboard bindings</a></li>
			</ul>

			<p class="betanote">This site is in beta. Request openings/endings and report errors by mentioning @QuadPiece on Twitter.</p>
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

		<?php include "backend/includes/botnet.html"; ?>
	</body>
</html>
