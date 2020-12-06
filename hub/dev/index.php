<!DOCTYPE html>
<html>
	<head>
		<title>Developer hub</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../../CSS/page.css">
		<meta name="viewport" content="width=device-width,initial-scale=1">
	</head>
	<body>
		<header>
			<div>
				<h1>For developers</h1>
				<?php include '../navbar'; ?>
			</div>
		</header>
		<main>
			<p>This page contains fun stuff for developers and curious individuals who want to learn or mess with the site.</p>
			<ul>
				<li><a href="https://github.com/AniDevTwitter/animeopenings">GitHub</a></li>
				<li><a href="api.php">API</a></li>
			</ul>

			<h2>Server map</h2>
			<img src="map.svg" width="100%" alt="Network Diagram"></img>
		</main>

		<?php include_once '../../backend/includes/botnet.html'; ?>
	</body>
</html>
