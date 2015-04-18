<!DOCTYPE html>
<html>
	<head>
		<title>API docs</title>
		<link rel="stylesheet" type="text/css" href="../CSS/markdown.css">
		<meta charset="UTF-8">
	</head>
	<body>

		<h1 id="api">API</h1>

	<p>There’s not much here yet. But more might arrive in the future</p>

	<h2 id="list-api">List API</h2>

	<p>Visit <code>http://openings.moe/api/list.php</code>, from there it should be obvious for anyone capable of recognizing JSON.</p>

	<h2 id="details-api">Details API</h2>



	<h3 id="using-the-details-api">Using the details API</h3>

	<p>Simply use <code>http://openings.moe/api/list.php?file=&lt;YOURFILE&gt;</code></p>

	<p>The API will return the metadata for the file specified. It will also return a comment for both successful and failed API calls.</p>

	<h3 id="samples">Samples</h3>



	<h4 id="requests">Requests</h4>

	<p>So to get the details of <a href="http://openings.moe/?video=Opening1-NoGameNoLife.webm">this video</a>. <br>
	We would simply use <code>http://openings.moe/api/list.php?file=Opening1-NoGameNoLife.webm</code></p>

	<h4 id="sample-reply">Sample reply</h4>

	<p>The sample used above would return:</p>



	<pre class="prettyprint"><code class=" hljs json">{"<span class="hljs-attribute">success</span>":<span class="hljs-value"><span class="hljs-literal">true</span></span>,"<span class="hljs-attribute">comment</span>":<span class="hljs-value"><span class="hljs-string">"No errors"</span></span>,"<span class="hljs-attribute">filename</span>":<span class="hljs-value"><span class="hljs-string">"Opening1-NoGameNoLife.webm"</span></span>,"<span class="hljs-attribute">title</span>":<span class="hljs-value"><span class="hljs-string">"Opening 1"</span></span>,"<span class="hljs-attribute">source</span>":<span class="hljs-value"><span class="hljs-string">"No Game No Life"</span></span>}</code></pre>

	<p>The API will output a string like that. But here’s a “prettyfied” response you can use as a reference:</p>

	<pre class="prettyprint"><code class=" hljs json">{
	    "<span class="hljs-attribute">success</span>":<span class="hljs-value"><span class="hljs-literal">true</span></span>,
	    "<span class="hljs-attribute">comment</span>":<span class="hljs-value"><span class="hljs-string">"No errors"</span></span>,
	    "<span class="hljs-attribute">title</span>":<span class="hljs-value"><span class="hljs-string">"Opening 1"</span></span>,
	    "<span class="hljs-attribute">source</span>":<span class="hljs-value"><span class="hljs-string">"No Game No Life"</span>
	</span>
	}</code></pre>

		<?php
		include_once('../../backend/includes/botnet.html');
		?>

	</body>
</html>
