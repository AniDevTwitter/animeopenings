<!DOCTYPE html>
<html>
	<head>
		<title>Submitting encodes</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<style>
		#submission_response {
			border: 2px solid;
			border-radius: 4px;
			padding: 0 16px;
		}
		#submission_response.none {display: none}
		#submission_response.valid {border-color: green}
		#submission_response.invalid {border-color: red}

		form {padding-right: 20%}
		.tag {
			display: inline-block;
			min-width: 5.2em;
			padding-right: 0.5em;
		}
		.comment {
			font-size: 75%;
			line-height: 1em;
			margin: 0 0 0 7.8em;
		}
		form label {
			display: flex;
			align-items: center;
		}
		form label input {flex: 1}
		</style>
	</head>
	<body>
		<header>
			<div>
				<h1>Submitting video encodes</h1>
				<?php include 'navbar'; ?>
			</div>
		</header>

		<?php if (!$SUBMISSION_EMAIL_TO) echo '<p>Submissions are not enabled on this site.</p>'; ?>

		<main<?php if (!$SUBMISSION_EMAIL_TO) echo 'style="display:none"'; ?>>
			<p>We encode all videos from source ourselves so that they will be of consistent quality and audio volume. However, it can take some time to find a good source, determine if and when it needs to be trimmed, and compile other relevant information about the video. Gathering and submitting this information for us will speed up the process of getting it on the site.</p>

			<?php // Handle Submission
				include_once '../backend/includes/helpers.php';

				$submission_exists = !empty($_POST);
				$submission_valid = false;

				$source_blacklist = ['youtube.com','youtu.be'];
				$time_regex = '^(?:\d+)(?:(?::\d\d):\d\d)?(?:\.\d*[1-9])?$';

				if ($submission_exists) {
					// Required fields are null.
					$defaults = [
						'source' => null,
						'type' => null,
						'number' => null,
						'letter' => '',
						'ip' => null,
						'season' => null,
						'time_start' => '0',
						'time_end' => '0',
						'song_title' => '',
						'song_artist' => '',
						'email' => null,
						'notes' => ''
					];

					// Set defaults and check that required fields are set.
					$data = array_map('trim', array_merge($defaults,$_POST));
					$submission_valid = !in_array(null, $data, true);

					// Validate Fields
					$response_message = 'Submission Accepted';
					if ($submission_valid) {
						// Validate Source
						$s_lower = strtolower($data['source']);
						foreach ($source_blacklist as $url) {
							if (strpos($s_lower,$url) !== false) {
								$response_message = 'We do not accept encodes from "' . $url . '".';
								goto INVALID;
							}
						}
						$source_headers = get_headers($data['source'], 1);
						$index = 0;
						if ($source_headers) while (array_key_exists($index + 1, $source_headers)) $index += 1;
						if ($source_headers === false || intval(substr($source_headers[$index], 9, 3), 10) >= 400) {
							$response_message = 'The given source could not be validated.';
							goto INVALID;
						}

						// Validate Type
						if ($data['type'] != 'OP' && $data['type'] != 'IN' && $data['type'] != 'ED') {
							$response_message = 'The given video type is not valid.';
							goto INVALID;
						}

						// Validate Number
						if (!ctype_digit($data['number'])) {
							$response_message = 'The given number is not a positive integer.';
							goto INVALID;
						}
						$data['number'] = str_pad($data['number'], $VIDEO_INDEX_PADDING, '0', STR_PAD_LEFT);

						// Validate Letter
						if ($data['letter'] && !ctype_alpha($data['letter'])) {
							$response_message = 'The given letter contains things that are not a letter.';
							goto INVALID;
						}

						// "Sanitize" IP
						$data['ip'] = str_replace($HALFWIDTH_CHARS, $FULLWIDTH_CHARS, $data['ip']);

						// "Sanitize" Season
						$data['season'] = str_replace($HALFWIDTH_CHARS, $FULLWIDTH_CHARS, $data['season']);

						// Validate Times
						$time_regex_slash = '/' . $time_regex . '/';
						if (!preg_match($time_regex_slash, $data['time_start'])) {
							$response_message = 'The given start time is not valid.';
							goto INVALID;
						}
						if (!preg_match($time_regex_slash, $data['time_end'])) {
							$response_message = 'The given end time is not valid.';
							goto INVALID;
						}

						// Validate E-Mail
						if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
							$response_message = 'The given E-Mail could not be validated.';
							goto INVALID;
						}

						goto VALID;
						INVALID:
						$submission_valid = false;
						VALID:
					} else $response_message = 'Not all required fields were given.';

					// Send E-Mail
					if ($submission_valid) {
						// Create Bash Script
						$bash = "mkdir '/mnt/sdb/openings.moe/source/{$data['ip']}'\r\n" .
						"cd '/mnt/sdb/openings.moe/source/{$data['ip']}'\r\n\r\n" .

						"mkdir '{$data['season']}'\r\n" .
						"cd '{$data['season']}'\r\n" .
						"echo 1 > order\r\n" .
						"echo '' > display_name\r\n\r\n" .

						"mkdir {$data['type']}_{$data['number']}{$data['letter']}_NC_BD\r\n" .
						"cd {$data['type']}_{$data['number']}{$data['letter']}_NC_BD\r\n" .
						"echo '' > display_name\r\n" .
						($data['time_start'] ? "echo '{$data['time_start']}' > time_start\r\n" : '') .
						($data['time_end'] ? "echo '{$data['time_end']}' > time_end\r\n" : '') .
						($data['song_title'] ? "echo '{$data['song_title']}' > song_title\r\n" : '') .
						($data['song_artist'] ? "echo '{$data['song_artist']}' > song_artist\r\n" : '') .
						"echo 'approved' > status\r\n" .
						"echo '{$data['source']}' > source\r\n" .
						"echo '' > subtitles\r\n\r\n" .

						"cd ../..";

						$send_to = $SUBMISSION_EMAIL_TO;
						$subject = "{$WEBSITE_URL} submission - {$data['season']} {$data['type']} {$data['number']}{$data['letter']}";
						$message = "{$data['notes']}\r\n\r\n<pre>{$bash}</pre>";
						$headers = "Content-Type: text/html; charset=utf-8\r\n" .
								"From: submit@{$WEBSITE_URL}\r\n" .
								"Reply-To: {$data['email']}\r\n" .
								'X-Mailer: PHP/' . phpversion();

						// try using mail
						$mail_response = mail($SUBMISSION_EMAIL_TO, $subject, $message, $headers);
						if ($mail_response === false) {
							if ($MAILGUN_URL || $MAILGUN_EMAIL) {
								// try using https://www.mailgun.com/
								$url = $MAILGUN_URL;
								$data = [
									'h:Reply-To' => $data['email'],
									'from' => $MAILGUN_EMAIL,
									'to' => $SUBMISSION_EMAIL_TO,
									'subject' => $subject,
									'html' => $message
								];
								$options = [
										'http' => [
											'method'  => 'POST',
											'content' => http_build_query($data)
									]
								];

								$context = stream_context_create($options);
								$mail_response = file_get_contents($url, false, $context);
							}

							if ($mail_response === false) {
								$response_message = 'Failed to send e-mail.';
								$submission_valid = false;
							}
						}
					}
				}
			?>

			<div id="submission_response" class="<?php echo ($submission_exists ? ($submission_valid ? 'valid' : 'invalid') : 'none'); ?>">
				<p><?php echo ($submission_valid ? '' : 'Error: '), $response_message; ?></p>
			</div>

			<form method="post">
				<br>
				<label>
					<span class="tag">Link to source:</span>
					<input name="source" type="url" required>
				</label>
				<p class="comment">We want high-quality sources. YouTube will not be accepted.</p>

				<br>

				<label>
					<span class="tag">Type:</span>
					<select name="type">
						<option value="OP">Opening</option>
						<option value="IN">Insert</option>
						<option value="ED">Ending</option>
					</select>
				</label>
				<label>
					<span class="tag">Number:</span>
					<input name="number" type="number" min="0" max="99" value="1" style="width:3em;flex:0" required>
				</label>
				<label>
					<span class="tag">Letter:</span>
					<input name="letter" type="text" title="This must be one or two letters, or nothing." maxlength="2" pattern="[A-Za-z]{,2}" style="width:2em;flex:0">
				</label>
				<p class="comment">If any openings/endings have the same song or animation, use letters to differentiate them. Otherwise leave this input blank.</p>

				<br>

				<label>
					<span class="tag">IP/Series:</span>
					<input name="ip" type="text" placeholder="Dragon Ball" required>
				</label>
				<label>
					<span class="tag">Season:</span>
					<input name="season" type="text" placeholder="Dragon Ball Z" required>
				</label>
				<p class="comment">If the series only has one season, you can use the same name for both.</p>

				<br>

				<label>
					<span class="tag">Start time:</span>
					<input name="time_start" type="text" value="0" minlength="1" pattern="<?php echo $time_regex; ?>" style="width:7em;flex:0" required>
				</label>
				<label>
					<span class="tag">End time:</span>
					<input name="time_end" type="text" value="0" minlength="1" pattern="<?php echo $time_regex; ?>" style="width:7em;flex:0" required>
				</label>
				<p class="comment">Times can be in the format "SSS.mmm", "MMM:SS.mmm", or "HHH:MM:SS.mmm". We try to be frame-accurate with our times. The video should start/end on the first non-black frame, unless it's a fade. If the video fades in/out, there should be exactly one full black frame before/after the fade. An end time of "0" means "until the end of the source video".</p>

				<br>

				<label>
					<span class="tag">Song title:</span>
					<input name="song_title" type="text" placeholder="Never Gonna Give You Up">
				</label>
				<label>
					<span class="tag">Song artist:</span>
					<input name="song_artist" type="text" placeholder="Rick Astley">
				</label>
				<p class="comment">Song information is not required, but we would like to have it.</p>

				<br>

				<label>
					<span class="tag">E-mail:</span>
					<input name="email" type="email" autocomplete="email" required>
				</label>
				<p class="comment">So that we can contact you about your submission.</p>
				<label>
					<span class="tag">Notes:</span>
					<input name="notes" type="text">
				</label>
				<p class="comment">If there is anything we should know about this video (ex. "TV version" or "from season 3 episode 5").</p>

				<br>

				<input type="submit" value="Submit">
			</form>
		</main>

		<?php include_once '../backend/includes/botnet.html'; ?>
	</body>
</html>
