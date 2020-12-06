<?php
	header('Cache-Control: no-cache');
	header('ETag: "' . time() . '"');
	header('Expires: Tue, 01 Jan 1980 1:00:00 GMT');

	require 'includes/helpers.php';

	function arrayToCodeBlock($base_indent,$array) {
		return '<code class="block hideable">' . "\n" .
			$base_indent . "\t<pre>" . str_replace(PHP_EOL, "</pre>\n" . $base_indent . "\t<pre>", trim(print_r($array,true))) . "</pre>\n" .
			$base_indent . "</code>\n";
	}
?>
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>Test Page</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width,initial-scale=1">
		<style>
			.hideable_container p {display:inline}
			.hideable_container input[type="checkbox"]:not(:checked) ~ .hideable {display:none}
			#test_iframes_checkbox ~ code > a {
				display: block;
				width: 100%;
			}
			#test_iframes_checkbox ~ code > iframe {
				background: white;
				box-sizing: border-box;
				display: block;
				height: 500px;
				margin: 0.5em;
				width: calc(100% - 1em);
			}
		</style>
	</head>
	<body>
		<header>
			<div>
				<h1>Test Page</h1>
				<?php include '../hub/navbar'; ?>
			</div>
		</header>
		<main>
			<p>Server Time: <code><?php echo date('Y-m-d H:i:s') ?></code></p>

			<div class="hideable_container">
				<p><label for="opcache_checkbox">OPcache Info:</label></p><input type="checkbox" id="opcache_checkbox">
				<?php echo arrayToCodeBlock("\t\t\t\t",opcache_get_status()); ?>
			</div>

			<p>Video Types:</p>
			<table>
				<tr>
					<th>Abbreviation</th>
					<th>Name</th>
					<th>Count</th>
				</tr><?php
				$type_abbreviations = [];
				foreach ($CACHE['TYPES'] as $key => $info) {
					if ($key === $info['abbreviation']) {
						$type_abbreviations[] = $key;
						echo "\n\t\t\t\t<tr><td>" . $key . '</td><td>' . $info['name'] . '</td><td>' . $info['count'] . '</td></tr>';
					}
				}
				echo "\n\t\t\t";
			?></table>

			<div class="hideable_container">
				<p><label for="test_1_checkbox">Get Random Video:</label></p><input type="checkbox" id="test_1_checkbox">
				<?php
					$first_video_info = getVideoData([]);
					echo arrayToCodeBlock("\t\t\t\t",$first_video_info);
					$seed = $first_video_info['seed'];
				?>
				<sup style="display:block">(the same seed will be used from here on)</sup>
			</div>

			<div class="hideable_container">
				<p><label for="test_2_checkbox">Get Same Video by Name:</label></p><input type="checkbox" id="test_2_checkbox">
				<?php echo arrayToCodeBlock("\t\t\t\t",getVideoData(['seed' => $seed, 'name' => $first_video_info['uid']])); ?>
			</div>

			<div class="hideable_container">
				<p><label for="test_3_checkbox">Get Same Video "Skipping" All Video Types:</label></p><input type="checkbox" id="test_3_checkbox">
				<?php
					$params = ['seed'=>$seed];
					foreach ($type_abbreviations as $type) {
						$params[] = 'skip_' . $type;
					}
					echo arrayToCodeBlock("\t\t\t\t",getVideoData($params));
				?>
			</div>

			<div class="hideable_container"><?php
					$index = (int)($CACHE['NUM_VIDEOS'] * 2.95);
					echo "\n";
				?>
				<p><label for="test_4_checkbox">Get Video at Index (<?php echo $index; ?>) Greater than the Total Number of Videos (<?php echo $CACHE['NUM_VIDEOS']; ?>):</label></p>
				<input type="checkbox" id="test_4_checkbox">
				<?php echo arrayToCodeBlock("\t\t\t\t",getVideoData(['seed' => $seed, 'index' => $index])); ?>
			</div>

			<div class="hideable_container">
				<p><label for="test_iframes_checkbox">All Pages:</label></p>
				<input type="checkbox" id="test_iframes_checkbox">
				<code class="block hideable"><?php
					$dirname = pathinfo($_SERVER['REQUEST_URI'],PATHINFO_DIRNAME);
					$root = substr($dirname,0,strrpos($dirname,'/')+1);
					$full_root = 'https://' .  $CACHE['WEBSITE_URL'] . substr($root, 0, strrpos($root,'/',-1) + 1);
					$pages = [
						'',
						'api/details.php',
						'api/list.php',
						'api/oembed/?format=json&name=' . rawurlencode($first_video_info['uid']) . '&url=' . rawurlencode($full_root . '?video=' . $first_video_info['uid']),
						'backend/pages/notfound.php',
						'hub/',
						'hub/chat.php',
						'hub/donate.php',
						'hub/faq.php',
						'hub/ircdetails.php',
						'hub/submit.php',
						'hub/dev/',
						'hub/dev/api.php',
						'list/'
					];
					echo "\n";
					foreach ($pages as $page) {
						$url = $root . $page;
						echo "\t\t\t\t\t<a href=\"" . $url . "\">" . $url . "</a>\n";
						echo "\t\t\t\t\t<iframe src=\"" . $url . "\"></iframe>\n";
					}
				?>
				</code>
			</div>
		</main>
	</body>
</html>
