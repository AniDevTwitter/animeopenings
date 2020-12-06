<!DOCTYPE html>
<html>
	<head>
		<title>F.A.Q.</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
		<style>
			.keycap {
				border: 1px solid rgba(0, 0, 0, 0.2);
				background-color: rgba(0, 0, 0, 0.05);
				padding: 2px;
			}
		</style>
	</head>
	<body>
		<header>
			<div>
				<h1>Frequently Asked Questions</h1>
				<?php include 'navbar'; ?>
			</div>
		</header>
		<main>
			<h3 id="there-are-endings-too">Why do you lie to me? You're named openings.moe but you also have endings!</h3>

			<p>Well excuse me, but "openingsandendings.moe" was a bit too long for my taste. There is a section in the menu to only show openings.</p>

			<h3 id="please-add-x">I requested the opening from X, why isn't it on the site yet?</h3>

			<p>Openings will come. When you suggest something it's added to a list. Openings on this list are completed in a random order so someday your opening/ending will arrive. If it will take 30 minutes or 5 weeks however is something I can't tell you.</p>

			<h3 id="why-wont-the-videos-play">Why won't the videos play?</h3>

			<p>If you're using a new version of Chrome, you will need to click the page first to make it start. Chrome has decided to block autoplaying videos to stop spam, which unfortunately also breaks our site.</p>

			<p>If you believe another issue is causing this, contact <a href="https://twitter.com/Kuwaddo/">Quad on Twitter</a> or alternatively by mail (<a href="mailto:contact@quad.moe">contact@quad.moe</a>) and we can try to work out a solution.</p>

			<h3 id="why-do-none-of-the-buttons-work">Why do none of the buttons work?</h3>

			<p>You have disabled JavaScript. Don't do that.</p>

			<h3 id="i-got-this-really-weird-video">I got this really weird video, what does that mean?</h3>

			<p>There are Easter Eggs hidden on the site. Congratulations, you found one!</p>

			<h3 id="keybindings">Can I use my keyboard to interact with the site?</h3>

			<p>Yes. These are the current keybindings on the home page:</p>

			<p><span class="keycap">M</span> Open/Close menu</p>
			<p><span class="keycap">/</span> Open search pane</p>
			<p><span class="keycap">N</span> New video</p>
			<p><span class="keycap">S</span> Toggle subtitles (if available)</p>
			<p><span class="keycap"><span class="fa fa-arrow-left"></span>/<span class="fa fa-arrow-right"></span></span> Back/Forward 10 seconds</p>
			<p><span class="keycap">Space</span> Pause/Play</p>
			<p><span class="keycap">F</span> Toggle fullscreen</p>
			<p><span class="keycap">Page Up/Down or Scroll Wheel</span> Volume</p>
		</main>

		<?php include_once '../backend/includes/botnet.html'; ?>
	</body>
</html>
