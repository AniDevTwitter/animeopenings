<!DOCTYPE html>
<html>
	<head>
		<title>Chat</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	</head>
	<body>
		<header>
			<div>
				<h1>Chat</h1>
				<?php include "navbar"; ?>
			</div>
		</header>
		<main>
			<h3>Chat</h3>

			<p style="color:#555;font-size:65%;">This chat is pretty new so there might not be many users online at the moment</p>

			<iframe src="https://kiwiirc.com/client?settings=58bedb49a748db1de84a0412a3411757" style="border:none;width:100%; height:80vh;"></iframe>

			<p style="font-size:65%;line-height:1em;">The default channel is #openings.moe, try #aniop for contributors, details about our channels can be found <a href="ircdetails.php">here</a>. You can also <a href="https://kiwiirc.com/client?settings=58bedb49a748db1de84a0412a3411757">open the client in a new tab</a></p>

		</main>

		<?php
		include_once('../backend/includes/botnet.html');
		?>
	</body>
</html>
