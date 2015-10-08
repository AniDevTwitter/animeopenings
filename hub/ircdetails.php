<!DOCTYPE html>
<html>
	<head>
		<title>IRC details</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	</head>
	<body>
		<header>
			<div>
				<h1>IRC details</h1>
				<?php include "navbar"; ?>
			</div>
		</header>
		<main>
			<h2>IRC details</h3>

			<p>We use two IRC channels for our chat. Here's the details for both of them:</p>
			
			<h3>#openings.moe</h3>
			<p>This is the default channel where most of the exciting stuff happens. This is probably where you want to be if you're planning to talk with other people. This channel is for regular discussions about anything.</p>
			
			<h3>#aniop</h3>
			<p>The contributor channel. This is where we discuss future changes to the site and accept encodes. If you're interested in the development of the site and want to know what we're currently doing or wish to help us. This is where you should be. <br /><span style="color: #555; font-size: 65%;">(Psst, this is a nice place to idle if you want to catch some statistics and stuff)</span>
			
			<h2>Connecting with your own client</h2>
			
			<p>Both our channels are on the rizon network, so using your own client is pretty simple. Open your client and connect to irc.rizon.net, then you can follow the guidelines to register your nickname if you want to. After that, just write /join followed by the channel you want to join.</p>
			
			<p>If you need a client, we recommend <a href="https://hexchat.github.io/">HexChat</a>. If you're a bit mroe hardcore, you might want to try <a href="https://weechat.org/">Weechat</a> for Linux or cygwin</p>
			
		</main>

		<?php
		include_once('../backend/includes/botnet.html');
		?>
	</body>
</html>
