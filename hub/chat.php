<!DOCTYPE html>
<html>
	<head>
		<title>Chat</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
		iframe {
			border: none;
			width:100%;
			height:80vh;
		}
		p {
			font-size:65%;
			line-height:1em;
		}
		</style>
	</head>
	<body>
		<header>
			<div>
				<h1>Chat</h1>
				<?php include "navbar"; ?>
			</div>
		</header>
		<main>
			<iframe src="https://kiwiirc.com/client?settings=58bedb49a748db1de84a0412a3411757"></iframe>

			<p>The default channel is #openings.moe; try #aniop for contributors. Details about our channels can be found <a href="ircdetails.php">here</a>. You can also <a href="https://kiwiirc.com/client?settings=58bedb49a748db1de84a0412a3411757">open the client in a new tab</a>.</p>
		</main>

		<?php
		include_once "../backend/includes/botnet.html";
		?>
	</body>
</html>
