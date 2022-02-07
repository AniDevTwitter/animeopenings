<?php
	// We only need this so we can show the prefix constants on this page.
	require '../../backend/includes/helpers.php';
?>
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

			<section>
				<h2 id="list-api">List API - <code>/api/list.php</code></h2>

				<h4>Query string parameters</h4>

				<p><code>shuffle</code> - Shuffle the results.</p>

				<h4>Sample reply</h4>

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
			</section>

			<hr>

			<section>
				<h2 id="details-api">Details API - <code>/api/details.php</code></h2>

				<p>
					This API will try to return the metadata for the requested video, or a random video if one isn't specified.
					The main parameters to use are <code>uid</code> for getting a specific video,
					<code><?= PREFIX_SKIP ?>{type}</code> for skipping certain video types,
					and <code>strict</code> for if you only want to get an exact match.
					The other parameters are more for internal use if you want to get the next video in the sequence,
					and they will be returned by this API for you to use.
				</p>

				<h4>Query string parameters</h4>

				<p><code>uid</code> - The unique ID of the video to get.</p>

				<p><code>seed</code> - The main seed to be used by the random number generator. If a seed is not given, a random one will be generated.</p>

				<p><code>seed_b</code> - A second seed to be used by the random number generator. This one exists for performance reasons.</p>

				<p><code><?= PREFIX_INDEX ?>{behavior}</code> - The index of the random video of a random behavior to get.</p>

				<p><code><?= PREFIX_SEEN_LAST ?>{behavior}</code> - The number of videos previously returned of the specified behavior. Used to determine whether or not to show a video that is set to be shown on an interval.</p>

				<p><code><?= PREFIX_SKIP ?>{type}</code> - The video types to skip. True for '', '1', 'true', 'on', or 'yes'.</p>

				<p><code>strict</code> - Whether or not to find an exact match. True for '', '1', 'true', 'on', or 'yes'.</p>

				<p>The parameters with a {behavior}/{type} can appear multiple times, with each appearance corresponding to one behavior/type. These parameters are case-sensitive.</p>

				<h4>Full possible reply</h4>

				<p>This is all of the possible values that can be returned. However, none of them are guaranteed to be returned.</p>

				<code class="block">
					<pre>{</pre>
					<pre>    "data": {</pre>
					<pre>        "title": "< the title of the video >",</pre>
					<pre>        "file": "< the video's file name, not including the extension >",</pre>
					<pre>        "mime": [< a list of the available encodings of this video, as mime types, sorted from smallest to largest by file size >],</pre>
					<pre>        "type": "< this video's type >",</pre>
					<pre>        "uid": "< the unique identifier for this video >",</pre>
					<pre>        "song": {</pre>
					<pre>            "title": "< the title of this video's song >",</pre>
					<pre>            "artist": "< the artist of this video's song >"</pre>
					<pre>        },</pre>
					<pre>        "subtitles": "< the name of the group that made the subtitles for this video >",</pre>
					<pre>        "source": "< the ip/series that this video is from >",</pre>
					<pre>        "path": "< the path to get to this video's files >",</pre>
					<pre>        "hidden": true // if this video is hidden</pre>
					<pre>    },</pre>
					<pre>    "next": {</pre>
					<pre>        "seed": ..., // An integer greater than 0.</pre>
					<pre>        "seed_b": ..., // An integer greater than 0.</pre>
					<pre>        "<?= PREFIX_INDEX ?>{behavior}": ..., // An integer greater than 0.</pre>
					<pre>        "<?= PREFIX_SEEN_LAST ?>{behavior}": ..., // An integer greater than 0.</pre>
					<pre>        "<?= PREFIX_SKIP ?>{type}": true, // if this video type was skipped</pre>
					<pre>        "strict": true // if strict mode was used</pre>
					<pre>    },</pre>
					<pre>    "comment": "< a comment or error message >"</pre>
					<pre>}</pre>
				</code>

				<h4>Sample reply</h4>

				<p>To get the details of <a href="../../?name=Opening1-Nekomonogatari(Kuro):TsubasaFamily">this video</a> you would use <code><a href="../../api/details.php?uid=Opening1-Nekomonogatari(Kuro):TsubasaFamily">/api/details.php?name=Opening1-Nekomonogatari(Kuro):TsubasaFamily</a></code></p>

				<code class="block">
					<pre>{</pre>
					<pre>    "data": {</pre>
					<pre>        "title": "Opening 1",</pre>
					<pre>        "file": "Nekomonogatari(Kuro)-OP01-NCBD",</pre>
					<pre>        "mime": ["video/mp4","video/webm;codecs=\"vp9,opus\""],</pre>
					<pre>        "type": "OP",</pre>
					<pre>        "uid": "Opening1-Nekomonogatari(Kuro):TsubasaFamily",</pre>
					<pre>        "song": {</pre>
					<pre>            "title": "perfect slumbers",</pre>
					<pre>            "artist": "Yui Horie"</pre>
					<pre>        },</pre>
					<pre>        "subtitles": "Commie",</pre>
					<pre>        "source": "Nekomonogatari (Kuro): Tsubasa Family",</pre>
					<pre>        "path": "video"</pre>
					<pre>    }</pre>
					<pre>}</pre>
				</code>
			</section>

			<?php include_once '../../backend/includes/botnet.html'; ?>
		</main>
	</body>
</html>
