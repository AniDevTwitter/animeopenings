<!DOCTYPE html>
<html>
	<head>
		<title>API Documentation</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../../CSS/page.css">
		<meta name="viewport" content="width=device-width, initial-scale=1">
	</head>
	<body>
		<main>
			<a href="../dev/">&lt;&lt; Back to the developer hub</a>

			<h1>API Documentation</h1>

			<h2 id="list-api">List API</h2>

			<p>Visit <code>/api/list.php</code>, from there it should be obvious for anyone capable of recognizing JSON.</p>

			<h4 id="sample-reply">Sample reply</h4>

			<code class="block">
				<pre>{</pre>
				<pre>    "title": "Opening 1",</pre>
				<pre>    "source": "Accel World",</pre>
				<pre>    "file": "AccelWorld-OP01-NCBD",</pre>
				<pre>    "mime": ["video/mp4","video/webm;codecs=\"vp9,opus\""]</pre>
				<pre>},</pre>
				<pre>{</pre>
				<pre>    "title": "Opening 2",</pre>
				<pre>    "source": "Accel World",</pre>
				<pre>    "file": "AccelWorld-OP02-NCBD",</pre>
				<pre>    "mime": ["video/mp4","video/webm;codecs=\"vp9,opus\""]</pre>
				<pre>},</pre>
				<pre>And so on...</pre>
			</code>

			<h4>Valid query string options</h4>

			<p><code>?filenames</code> - Get an array of just the file names</p>

			<p><code>?shuffle</code> - Shuffle the results</p>

			<p><code>?first=&lt;FILENAME&gt;</code> - Move the chosen file to the front of the results</p>

			<hr>

			<h2 id="details-api">Details API</h2>

			<h3 id="using-the-details-api">Using the details API</h3>

			<p>Simply use <code>/api/details.php?file=&lt;FILENAME&gt;</code></p>

			<p>The API will return the metadata for the file specified. It will also return a comment for both successful and failed API calls.</p>

			<h3 id="samples">Samples</h3>

			<h4 id="requests">Requests</h4>

			<p>So to get the details of <a href="/?video=Opening1-NekomonogatariKuro">this video</a>.</p>
			<p>We would simply use <code>/api/details.php?file=Opening1-NekomonogatariKuro</code></p>

			<h4 id="sample-reply">Sample reply</h4>

			<p>The sample used above would return a string like</p>

			<code class="block">{"success":true,"comment":"No errors","filename":"NekomonogatariKuro-OP01-NCBD","title":"Opening 1","mime":["video/mp4","video/webm;codecs=\"vp9,opus\""],"source":"Nekomonogatari (Kuro): Tsubasa Family","song":{"title":"perfect slumbers","artist":"Yui Horie"},"subtitles":"Commie"}</code>

			<p>but here's a "prettyfied" response you can use as a reference:</p>

			<code class="block">
				<pre>{</pre>
				<pre>    "success": true,</pre>
				<pre>    "comment": "No errors",</pre>
				<pre>    "filename": "NekomonogatariKuro-OP01-NCBD",</pre>
				<pre>    "title": "Opening 1",</pre>
				<pre>    "mime": ["video/mp4","video/webm;codecs=\"vp9,opus\""],</pre>
				<pre>    "source": "Nekomonogatari (Kuro): Tsubasa Family",</pre>
				<pre>    "song":</pre>
				<pre>    {</pre>
				<pre>        "title": "perfect slumbers",</pre>
				<pre>        "artist":"Yui Horie"</pre>
				<pre>    },</pre>
				<pre>    "subtitles": "Commie"</pre>
				<pre>}</pre>
			</code>

			<p>Note that the MIME types are actually ordered by file size from smallest to largest.</p>

			<?php include_once "../../backend/includes/botnet.html"; ?>
		</main>
	</body>
</html>
