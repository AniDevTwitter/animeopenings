var list, playlist = [];
var listLength;
var playlistBot;
var RegExEnabled = false;

function setup() {
	// get list of series elements and set their id
	list = document.getElementsByClassName("series");
	listLength = list.length;
	for (var i = 0; i < listLength; ++i)
		list[i].id = list[i].childNodes[0].nodeValue;

	// set search box toggle RegEx event
	document.getElementById("searchbox").addEventListener("keydown", toggleRegEx);

	// set search box search event
	document.getElementById("searchbox").addEventListener("keyup", search);

	// get search string from url
	if (location.search.indexOf("=") > -1)
		document.getElementById("searchbox").value = decodeURIComponent(location.search.substring(location.search.indexOf("=")+1));

	// add onclick(addVideoToPlaylist) to fa-plus elements
	for (var i = 0, addVideoButtons = document.getElementsByClassName("fa-plus"); i < addVideoButtons.length; ++i) {
		addVideoButtons[i].addEventListener("click", playlistAdd);
		addVideoButtons[i].nextElementSibling.className = "video";
		
		// Add 'cc' icon after videos that have subtitles.
		if (addVideoButtons[i].hasAttribute("subtitles")) {
			var newNode = document.createElement("i");
				newNode.className = "fa fa-cc";
			addVideoButtons[i].parentNode.insertBefore(newNode, addVideoButtons[i].nextElementSibling.nextElementSibling);
		}
	}

	// add click events to playlist "menu"
	playlistBot = document.getElementById("playlist").children[1];
	playlistBot.children[0].addEventListener("click", editPlaylist);
	playlistBot.children[2].addEventListener("click", startPlaylist);

	// set history state
	history.replaceState("list", document.title);
}

function toggleRegEx(event) {
	if (event.keyCode == 9)
	{
		RegExEnabled = !RegExEnabled;
		
		if (RegExEnabled)
			document.getElementById("regex").children[0].innerHTML = "(press tab while typing to disable RegEx in search)";
		else
			document.getElementById("regex").children[0].innerHTML = "(press tab while typing to enable RegEx in search)";
		
		if (event.preventDefault) event.preventDefault();
		return false;
	}
}

function search() {
	const sVal = document.getElementById("searchbox").value;
	const query = ( sVal == "" ? location.pathname : "?s=" + sVal );
	document.getElementById("searchURL").href = query;
	history.replaceState("list", document.title, query);
	
	var UseRegEx = RegExEnabled;
	var toFind, toFindLength;

	if ( UseRegEx ) {
		try {
			const temp = new RegExp(sVal, "i");
			toFind = [temp];
			toFindLength = 1;
		} catch (e) { UseRegEx = false; }
	}
	
	if ( !UseRegEx ) {
		toFind = sVal.split(" ");
		if (toFind.indexOf("") > -1) toFind.splice(toFind.indexOf(""), 1);
		toFindLength = toFind.length;
		
		for (var i = 0; i < toFindLength; ++i)
			toFind[i] = new RegExp(toFind[i].replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
	}

	var anyResults = false;

	for (var i = 0, j; i < listLength; ++i) {
		for (j = 0; j < toFindLength; ++j) {
			// If the RegExp doesn't match
			if (!toFind[j].test(list[i].id)) {
				list[i].setAttribute("hidden", "");
				break;
			}
		}

		// If all RegExp's passed
		if (j == toFindLength) {
			list[i].removeAttribute("hidden");
			anyResults = true;
		}
	}

	if (anyResults) document.getElementById("NoResultsMessage").setAttribute("hidden","");
	else document.getElementById("NoResultsMessage").removeAttribute("hidden");
}

function playlistAdd() {
	var video = {title: this.nextElementSibling.text,
				 source: this.parentElement.parentElement.childNodes[0].nodeValue,
				 file: this.nextElementSibling.href.substring(this.nextElementSibling.href.indexOf("=")+1)};
	if (this.hasAttribute("songTitle")) video.song = { title: this.getAttribute("songTitle"), artist: this.getAttribute("songArtist") };
	if (this.hasAttribute("subtitles")) video.subtitles = this.getAttribute("subtitles");

	playlist.push(video);

	this.removeEventListener("click", playlistAdd);
	this.classList.remove("fa-plus");
	this.classList.add("fa-check");

	var XNode = document.createElement("i");
		XNode.classList.add("fa", "fa-remove");
		XNode.addEventListener("click", playlistRemove);
		XNode.source = this;
	var TNode = document.createElement("span");
		TNode.innerHTML = '<span>' + video.title + " from " + video.source + "</span>";
	var BNode = document.createElement("br");
	playlistBot.parentNode.insertBefore(XNode, playlistBot);
	playlistBot.parentNode.insertBefore(TNode, playlistBot);
	playlistBot.parentNode.insertBefore(BNode, playlistBot);

	document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
	document.getElementById("playlist").removeAttribute("hidden");
}

function playlistRemove() {
	for (var i = 0; i < playlist.length; ++i) {
		if (playlist[i].file == this.source.nextElementSibling.href.substring(this.source.nextElementSibling.href.indexOf("=")+1)) {
			playlist.splice(i, 1);
			break;
		}
	}

	this.source.classList.remove("fa-check");
	this.source.classList.add("fa-plus");
	this.source.addEventListener("click", playlistAdd);

	this.parentNode.removeChild(this.nextSibling);
	this.parentNode.removeChild(this.nextSibling);
	this.parentNode.removeChild(this);

	document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
}

function editPlaylist() {
	var box = document.createElement("div");
		box.id = "box";
		box.innerHTML = "<p><span>Cancel</span><span>Save</span></p><textarea></textarea>";
		box.children[0].children[0].addEventListener("click", cancelEdit);
		box.children[0].children[1].addEventListener("click", loadPlaylist);

	if (playlist.length) box.children[1].value = playlist[0].file;
	for (var i = 1; i < playlist.length; ++i)
		box.children[1].value += "\n" + playlist[i].file;

	document.body.appendChild(box);
}

function cancelEdit() {
	document.body.removeChild(document.getElementById("box"));
}

function loadPlaylist() {
	var X = playlistBot.parentElement.getElementsByClassName("fa-remove");
	while (X.length) X[0].click();

	var sources = document.getElementById("box").children[1].value.split("\n");
	for (var i = 0; i < sources.length; ++i)
		sources[i] = sources[i].trim();

	for (var i = 0; i < sources.length; ++i) {
		for (var j = 0, videos = document.getElementsByClassName("video"); j < videos.length; ++j) {
			if (videos[j].getAttribute("href") == "../?video=" + sources[i] ) {
				videos[j].previousElementSibling.click();
				break;
			}
		}

		if (j == videos.length) {
			var notFound = document.createElement("p");
				notFound.innerHTML = '<i class="fa fa-remove" style="padding-left: 0;"></i>"' + sources[i] + '" could not be found.';
				notFound.children[0].addEventListener("click", function(){this.parentNode.parentNode.removeChild(this.parentNode);});
			playlistBot.parentElement.appendChild(notFound);
		}
	}

	document.body.removeChild(document.getElementById("box"));
}

function startPlaylist() {
	history.pushState({list: playlist, video: 0}, "Custom Playlist", "/");
	history.go();
}
