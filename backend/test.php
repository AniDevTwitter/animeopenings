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

	function mark($check) {
		return $check ? '✅ ' : '❌ ';
	}
	function markUID($a,$b) {
		return mark($a['uid'] === $b['uid']);
	}
	function markNUID($a,$b) {
		return mark($a['uid'] !== $b['uid']);
	}

	// To generate the test checkbox ID's.
	function checkboxID() {
		static $testID = 0;
		static $gotten = 0;
		if ($gotten % 2 === 0) {
			++$testID;
		}
		++$gotten;
		return "test_{$testID}_checkbox";
	}

	// Standard indent for code blocks.
	$indent = "\t\t\t\t";
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
			<p>Server Time: <code><?=date('Y-m-d H:i:s')?></code></p>

			<div class="hideable_container">
				<label for="opcache_checkbox">OPcache Info:</label><input type="checkbox" id="opcache_checkbox">
				<?=arrayToCodeBlock($indent,opcache_get_status())?>
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
				<label for="<?=checkboxID()?>"><?=mark(true)?>Get Random Video:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?php
					$first_video_data = getVideoData([]);
					echo arrayToCodeBlock($indent,$first_video_data);
					$seed = $first_video_data['seed'];
				?>
				<sup style="display:block">(the same seed will be used from here on)</sup>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed, 'name' => $first_video_data['uid']];
					$data = getVideoData($params);
					echo markUID($first_video_data,$data);
				?>Get Same Video by Name:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed];
					foreach ($type_abbreviations as $type) {
						$params[PREFIX_SKIP.$type] = '';
					}
					$data = getVideoData($params);
					echo markUID($first_video_data,$data);
				?>Get Same Video "Skipping" All Video Types:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed, PREFIX_SKIP.$first_video_data['type'] => ''];
					$data = getVideoData($params);
					echo markNUID($first_video_data,$data);
				?>Get Random Video "Skipping" First Video Type:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed, 'index' => 3];
					$third_video_data = getVideoData($params);
					echo mark(true);
				?>Get Third Video:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$third_video_data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed, 'index' => 3];
					foreach ($type_abbreviations as $type) {
						$params[PREFIX_SKIP.$type] = '';
					}
					$data = getVideoData($params);
					echo markUID($third_video_data,$data);
				?>Get Third Video "Skipping" All Video Types:</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$params = ['seed' => $seed, 'index' => 3];
					foreach ($type_abbreviations as $type) {
						if ($type !== $third_video_data['type']) {
							$params[PREFIX_SKIP.$type] = '';
						}
					}
					$data = getVideoData($params);
					echo markUID($third_video_data,$data);
				?>Get Third Video "Skipping" All Video Types Except '<?=$third_video_data['type']?>':</label><input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="<?=checkboxID()?>"><?php
					$index = (int)($CACHE['NUM_VIDEOS'] * 2.95);
					$params = ['seed' => $seed, 'index' => $index];
					$data = getVideoData($params);
					echo mark(true);
				?>Get Video at Index (<?=$index?>) Greater than the Total Number of Videos (<?=$CACHE['NUM_VIDEOS']?>):</label>
				<input type="checkbox" id="<?=checkboxID()?>">
				<?=arrayToCodeBlock($indent,$params).$indent.arrayToCodeBlock($indent,$data)?>
			</div>

			<div class="hideable_container">
				<label for="test_iframes_checkbox">All Pages:</label>
				<input type="checkbox" id="test_iframes_checkbox">
				<code class="block hideable"><?php
					$dirname = pathinfo($_SERVER['REQUEST_URI'],PATHINFO_DIRNAME);
					$root = substr($dirname,0,strrpos($dirname,'/')+1);
					$full_root = 'https://' .  $CACHE['WEBSITE_URL'] . substr($root, 0, strrpos($root,'/',-1) + 1);
					$pages = [
						'',
						'api/details.php',
						'api/list.php',
						'api/oembed/?format=json&name=' . rawurlencode($first_video_data['uid']) . '&url=' . rawurlencode($full_root . '?video=' . $first_video_data['uid']),
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
