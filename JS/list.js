let list;
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
		addVideoButton.addEventListener("click", playlist.add);
	}

	// add click events to playlist "menu"
	playlistBot = document.getElementById("playlist").children[1];
	playlistBot.children[0].addEventListener("click", playlist.edit);
	playlistBot.children[2].addEventListener("click", playlist.start);

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


let playlist = {
	list: [],
	updateCount: function() {
		document.getElementById("playlist").children[0].innerHTML = playlist.list.length + " Video" + (playlist.list.length != 1 ? "s" : "") + " in Playlist";
	},
	add: function() {
		let videoID = this.nextElementSibling.href.split("video=")[1];
		let videoTitle = this.nextElementSibling.text;
		let videoSource = this.parentElement.parentElement.childNodes[0].nodeValue;

		playlist.list.push(videoID);

		this.removeEventListener("click", playlist.add);
		this.classList.remove("fa-plus");
		this.classList.add("fa-check");
		this.title = "This video is in your playlist";

		let XNode = document.createElement("i");
			XNode.classList.add("fa", "fa-remove");
			XNode.addEventListener("click", playlist.remove);
			XNode.source = this;
		let TNode = document.createElement("span");
			TNode.innerHTML = '<span>' + videoTitle + " from " + videoSource + "</span>";
		let BNode = document.createElement("br");
		playlistBot.parentNode.insertBefore(XNode, playlistBot);
		playlistBot.parentNode.insertBefore(TNode, playlistBot);
		playlistBot.parentNode.insertBefore(BNode, playlistBot);

		playlist.updateCount();
		document.getElementById("playlist").removeAttribute("hidden");
	},
	remove: function() {
		for (let i = 0; i < playlist.list.length; ++i) {
			if (playlist.list[i] === this.source.nextElementSibling.href.split("video=")[1]) {
				playlist.list.splice(i,1);
				break;
			}
		}

		this.title = "Click to add this video to your playlist";
		this.source.classList.remove("fa-check");
		this.source.classList.add("fa-plus");
		this.source.addEventListener("click", playlist.add);

		this.nextSibling.remove();
		this.nextSibling.remove();
		this.remove();

		playlist.updateCount();
	},
	edit: function() {
		let box = document.createElement("div");
			box.id = "box";
			box.innerHTML = "<p><span>Cancel</span><span>Save</span></p><textarea></textarea>";
			box.children[0].children[0].addEventListener("click", playlist.cancelEdit);
			box.children[0].children[1].addEventListener("click", playlist.load);
			box.children[1].value = playlist.list.join("\n");
		document.body.appendChild(box);
	},
	cancelEdit: function() {
		document.getElementById("box").remove();
	},
	load: function() {
		let X = playlistBot.parentElement.getElementsByClassName("fa-remove");
		while (X.length) X[0].click();

		for (let source of document.getElementById("box").children[1].value.split("\n")) {
			source = source.trim();
			if (!source) continue;

			let link = document.querySelector("a[href$=\"video=" + source + "\"]");
			if (link) {
				link.previousElementSibling.click();
			} else {
				let notFound = document.createElement("p");
					notFound.innerHTML = '<i class="fa fa-remove" style="padding-left:0"></i>"' + source + '" could not be found.';
					notFound.children[0].addEventListener("click", function(){this.parentNode.remove();});
				playlistBot.parentElement.appendChild(notFound);
			}
		}

		document.getElementById("box").remove();
	},
	start: function() {
		parent.history.pushState(
			{
				video: {seed:0,hidden:true,load_video:true},
				list: playlist.list,
				index: -1
			},
			"Custom Playlist",
			((getComputedStyle(document.querySelector("header")).display == "none") ? "" : "../") + "?video=" + playlist.list[0]
		);
		parent.history.go();
	}
};
