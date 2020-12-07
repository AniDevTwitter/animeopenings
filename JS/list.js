let list, playlist = [];
let playlistBot;
let RegExEnabled = false;

// polyfill for noncompliant browsers
if (!(HTMLCollection.prototype[Symbol.iterator])) HTMLCollection.prototype[Symbol.iterator] = Array.prototype[Symbol.iterator];

addEventListener("load", setup);
addEventListener("pageshow", search);

function setup() {
	// get list of source elements and set their id
	list = document.getElementsByClassName("source");
	for (let source of list)
		source.id = source.childNodes[0].nodeValue.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

	// set search box toggle RegEx event
	document.getElementById("searchbox").addEventListener("keydown", toggleRegEx);

	// set search box search event
	document.getElementById("searchbox").addEventListener("keyup", search);

	// get search string from url
	if (location.search.indexOf("=") > -1)
		document.getElementById("searchbox").value = decodeURIComponent(location.search.substring(location.search.indexOf("=")+1));

	// add onclick(addVideoToPlaylist) to fa-plus elements
	const addVideoButtons = document.getElementsByClassName("fa-plus");
	for (let addVideoButton of addVideoButtons) {
		addVideoButton.title = "Click to add this video to your playlist";
		addVideoButton.addEventListener("click", playlistAdd);
		addVideoButton.nextElementSibling.className = "video";
	}

	// add click events to playlist "menu"
	playlistBot = document.getElementById("playlist").children[1];
	playlistBot.children[0].addEventListener("click", editPlaylist);
	playlistBot.children[2].addEventListener("click", startPlaylist);

	// set history state
	history.replaceState("list", document.title);
}

function toggleRegEx(event) {
	if (event.keyCode == 9) {
		RegExEnabled = !RegExEnabled;
		document.getElementById("regex").children[0].innerHTML = "(press tab while typing to " + (RegExEnabled ? "disable" : "enable") + " RegEx in search)";
		if (event.preventDefault) event.preventDefault();
		return false;
	}
}

function search() {
	let sVal = document.getElementById("searchbox").value.trim();
	const query = (sVal == "" ? location.pathname : "?s=" + sVal);
	sVal = sVal.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
	document.getElementById("searchURL").href = query;
	history.replaceState("list", document.title, query);

	let UseRegEx = RegExEnabled, toFind;

	if (UseRegEx) {
		try { toFind = new RegExp(sVal, "i");
		} catch (e) { UseRegEx = false; }
	}

	if (!UseRegEx)
		toFind = new RegExp("^(?=.*" + sVal.split(" ").map(str => str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")).join(")(?=.*") + ").*$", "i");

	let anyResults = false;

	for (let source of list) {
		if (toFind.test(source.id)) {
			source.removeAttribute("hidden");
			anyResults = true;
		} else source.setAttribute("hidden", "");
	}

	if (anyResults) document.getElementById("NoResultsMessage").setAttribute("hidden","");
	else document.getElementById("NoResultsMessage").removeAttribute("hidden");
}

function playlistAdd() {
	let videoID = this.nextElementSibling.href.split("video=")[1];
	let videoTitle = this.nextElementSibling.text;
	let videoSource = this.parentElement.parentElement.childNodes[0].nodeValue;

	playlist.push(videoID);

	this.removeEventListener("click", playlistAdd);
	this.classList.remove("fa-plus");
	this.classList.add("fa-check");
	this.title = "This video is in your playlist";

	let XNode = document.createElement("i");
		XNode.classList.add("fa", "fa-remove");
		XNode.addEventListener("click", playlistRemove);
		XNode.source = this;
	let TNode = document.createElement("span");
		TNode.innerHTML = '<span>' + videoTitle + " from " + videoSource + "</span>";
	let BNode = document.createElement("br");
	playlistBot.parentNode.insertBefore(XNode, playlistBot);
	playlistBot.parentNode.insertBefore(TNode, playlistBot);
	playlistBot.parentNode.insertBefore(BNode, playlistBot);

	document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
	document.getElementById("playlist").removeAttribute("hidden");
}

function playlistRemove() {
	for (let i = 0; i < playlist.length; ++i) {
		if (playlist[i] === this.source.nextElementSibling.href.split("video=")[1]) {
			playlist.splice(i,1);
			break;
		}
	}

	this.title = "Click to add this video to your playlist";
	this.source.classList.remove("fa-check");
	this.source.classList.add("fa-plus");
	this.source.addEventListener("click", playlistAdd);

	this.nextSibling.remove();
	this.nextSibling.remove();
	this.remove();

	document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
}

function editPlaylist() {
	let box = document.createElement("div");
		box.id = "box";
		box.innerHTML = "<p><span>Cancel</span><span>Save</span></p><textarea></textarea>";
		box.children[0].children[0].addEventListener("click", cancelEdit);
		box.children[0].children[1].addEventListener("click", loadPlaylist);
		box.children[1].value = playlist.join("\n");
	document.body.appendChild(box);
}

function cancelEdit() {
	document.getElementById("box").remove();
}

function loadPlaylist() {
	let X = playlistBot.parentElement.getElementsByClassName("fa-remove");
	while (X.length) X[0].click();

	for (let source of document.getElementById("box").children[1].value.split("\n")) {
		source = source.trim();
		if (!source) continue;

		let j = 0;
		let videos = document.getElementsByClassName("video");
		while (j < videos.length) {
			if (videos[j].getAttribute("href") == "../?video=" + source) {
				videos[j].previousElementSibling.click();
				break;
			}

			++j;
		}

		if (j == videos.length) {
			let notFound = document.createElement("p");
				notFound.innerHTML = '<i class="fa fa-remove" style="padding-left:0"></i>"' + source + '" could not be found.';
				notFound.children[0].addEventListener("click", function(){this.parentNode.remove();});
			playlistBot.parentElement.appendChild(notFound);
		}
	}

	document.getElementById("box").remove();
}

function startPlaylist() {
	parent.history.pushState(
		{
			video: {seed:0,hidden:true,load_video:true},
			list: playlist,
			index: -1
		},
		"Custom Playlist",
		((getComputedStyle(document.querySelector("header")).display == "none") ? "" : "../") + "?video=" + playlist[0]
	);
	parent.history.go();
}
