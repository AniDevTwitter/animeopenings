<!DOCTYPE html>
<html>
	<head>
		<title>Gibe money plz</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
			.button {
				background-color: #E54B00;
				color: white;
				display: inline-block;
				padding: 5px;
				text-align: center;
				transition: all 0.325s;
				width: 320px;
			}

			.button:hover {
				background-color: #E58B00;
				box-shadow: 0px 2px 0px #111;
			}

			.small { font-size: 10pt; }
		</style>
	</head>

	<body>
		<header>
			<div>
				<h1>Donate</h1>
				<?php include "navbar"; ?>
			</div>
		</header>
		<main>
			<p>Let's get this out of the way first:</p>

			<a href="https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=WGJ33B4E7YV9N&lc=US&item_name=Openings%2emoe&item_number=1337&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donate_LG%2egif%3aNonHosted">
				<div class="button">PayPal</div>
			</a>

			<p>Running this site isn't all fun and dandy. It requires time, effort and money. There are various things I need to run this, so here's a list of what your donation is paying for:</p>

			<h2>Monthly</h2>

			<ul>
				<li>The main server: <b>$10 per month</b></li>
				<li>Netherlands server: <b>$10 per month</b></li>
				<li>US server: <b>$4 per month</b> (For the first 2TB, then $4 per additional TB)</li>
				<li>DNS: <b>~€3 per month (varies)</b></li>
			</ul>

			<h2>Yearly</h2>
			<ul>
				<li>The domain: <b>$20 per year</b></li>
				<li>Domain privacy: <b>$5 per year</b></li>
				<li>Backup server: <b>$15 per year</b></li>
			</ul>

			<h2>Things I want money for</h2>

			<ul>
				<li>Asian server: <b>$5 per month</b></li>
			</ul>

			<h2>Far fetched goals</h2>

			<ul>
				<li>Dedicated multi-core encoding server: <b>$70-ish per month</b></li>
			</ul>

			<i class="small">* A dollar or two of your donation might get spent on coffee to power late night encoding sessions.</i>
		</main>

		<?php
		include_once "../backend/includes/botnet.html";
		?>
	</body>
</html>
