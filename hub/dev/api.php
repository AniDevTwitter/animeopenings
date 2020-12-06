<!DOCTYPE html>
<html>
	<head>
		<title>API Documentation</title>
		<meta charset="UTF-8">
		<link rel="stylesheet" type="text/css" href="../../CSS/page.css">
		<meta name="viewport" content="width=device-width,initial-scale=1">
	</head>
	<body>
		<main>
			<a href=".">&lt;&lt; Back to the developer hub</a>

			<h1>API Documentation</h1>

			<hr>

			<h2 id="list-api">List API - <code>/api/list.php</code></h2>

			<h4>Query string parameters</h4>

			<p><code>shuffle</code> - Shuffle the results.</p>

			<h4 id="sample-reply">Sample reply</h4>

			<code class="block">
				<pre>[</pre>
				<pre>    {</pre>
				<pre>        "uid": "Opening1-11eyes",</pre>
				<pre>        "song": {</pre>
				<pre>            "title": "Sequentia",</pre>
				<pre>            "artist": "Asriel"</pre>
				<pre>        },</pre>
				<pre>        "source": "11eyes"</pre>
				<pre>    }, {</pre>
				<pre>        "uid": "Ending1-11eyes",</pre>
				<pre>        "song": {</pre>
				<pre>            "title": "Arrival of Tears",</pre>
				<pre>            "artist": "Ayane"</pre>
				<pre>        },</pre>
				<pre>        "source": "11eyes"</pre>
				<pre>    }, And so on...</pre>
				<pre>]</pre>
			</code>

			<hr>

			<h2 id="details-api">Details API - <code>/api/details.php</code></h2>

			<p>The API will return the metadata for the file specified. It will also return a comment for both successful and failed API calls.</p>

			<h4>Query string parameters</h4>

			<p><code>name</code> - The UID or filename (without file extension) of the video to get.</p>

			<p><code>index</code> - When getting a random video, generate this many random videos before generating the random video to return.</p>

			<p><code>seed</code> - The seed to be used by the random number generator. If a seed is not given, a random one will be generated.</p>

			<p><code>seen_{behavior}</code> - The number of videos previously returned of the specified behavior. Used to determine whether or not to show a video that is set to be shown on an interval.</p>

			<p><code>skip_{type}</code> - The video types to skip. True for '', '1', 'true', 'on', or 'yes'.</p>

			<p>None of these parameters are required if you want to get a random video. If both <code>name</code> and <code>index</code> are given, <code>index</code> will be ignored. If a specific video is requested using the <code>name</code> parameter and it cannot be found, an error message will be returned. If a video is requested by <code>index</code> but it matches one of the types to skip then a random video with an acceptable type and an index greater than the given index will be returned (if every video matches a type to skip the types to skip will be ignored). The last two parameters can appear multiple times, with each appearance corresponding to one behavior/type.</p>

			<h4 id="sample-reply">Sample reply</h4>

			<p>To get the details of <a href="../../?video=Opening1-Nekomonogatari(Kuro):TsubasaFamily">this video</a> you would use <code><a href="../../api/details.php?name=Opening1-Nekomonogatari(Kuro):TsubasaFamily">/api/details.php?name=Opening1-Nekomonogatari(Kuro):TsubasaFamily</a></code></p>

			<code class="block">
				<pre>{</pre>
				<pre>    "title": "Opening 1",</pre>
				<pre>    "file": "Nekomonogatari(Kuro)-OP01-NCBD",</pre>
				<pre>    "mime": ["video/mp4","video/webm;codecs=\"vp9,opus\""],</pre>
				<pre>    "type": "OP",</pre>
				<pre>    "uid": "Opening1-Nekomonogatari(Kuro):TsubasaFamily",</pre>
				<pre>    "song": {</pre>
				<pre>        "title": "perfect slumbers",</pre>
				<pre>        "artist": "Yui Horie"</pre>
				<pre>    },</pre>
				<pre>    "subtitles": "Commie",</pre>
				<pre>    "source": "Nekomonogatari (Kuro): Tsubasa Family",</pre>
				<pre>    "path": "video",</pre>
				<pre>    "index": 0,</pre>
				<pre>    "seed": 8596592039400759000,</pre>
				<pre>    "seen": [],</pre>
				<pre>    "skip": [],</pre>
				<pre>    "success": true,</pre>
				<pre>    "comment": "No errors"</pre>
				<pre>}</pre>
			</code>

			<?php include_once '../../backend/includes/botnet.html'; ?>
		</main>
	</body>
</html>
