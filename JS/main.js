/* Contributors:
   Howl - Video Autonext
   Yurifag_ ( https://twitter.com/Yurifag_/ ) - Video Progress Bar
   trac - Video Progress Bar Seeking
   Yay295 - Tooltip Function, Openings-Only Button, window.history, Mouse Idle, Subtitle Renderer, Konami Code, and Other Things
   givanse ( http://stackoverflow.com/a/23230280 ) - Mobile Swipe Detection
   maj160 - Fullscreen Functions, Subtitle Renderer
   aty2 - Menu toggle keyboard button
*/


// Global Variables
var isKonaming = false, konamiIndex = 0;
var Videos = {index: 0, list: []};
var autonext = false;
var videoType = "all"; // egg, op, ed, all
var xDown = null, yDown = null; // position of mobile swipe start location
var mouseIdle, changeOnMouseMove = null, lastMousePos = {x:0,y:0};
var VideoElement, Tooltip = {Element: null, Showing: ""};
var showVideoTitleTimeoutA = null, showVideoTitleTimeoutB = null;
var displayTopRightTimeout = null;


// Helper/Alias Functions
var filename = () => VideoElement.children[0].src.split("video/")[1].replace(/\.\w+$/, "");
function filenameToIdentifier(filename) {
	if (Videos.list[Videos.index].egg) return filename;

	// Array(...filename parts, {OP,ED}{0,1,2,...}[{a,b,c,...}], [N]C{BD,DVD,PC,...})
	var parts = filename.split("-");

	// [N]C{BD,DVD,PC,...}
	parts.pop();

	// {OP,ED}{0,1,2,...}[{a,b,c,...}]
	var subident = parts.pop();
	// {OP,ED}{1,2,...}[{a,b,c,...}]
	subident = subident.replace(/(\D+)0*(.+)/, "$1$2");
	// {Opening,Ending}{1,2,...}[{a,b,c,...}]
	subident = subident.replace("OP", "Opening");
	subident = subident.replace("ED", "Ending");

	return subident + "-" + parts.join("-");
}
function identifierToFilename(ident) {
	// Array({Opening,Ending}{1,2,...}[{a,b,c,...}], ...filename parts)
	var parts = ident.split("-");

	// {Opening,Ending}{1,2,...}[{a,b,c,...}]
	var subident = parts.shift();

	// {1,2,...}[{a,b,c,...}]
	var index = subident.replace(["Opening","Ending"], "");
	var oped = subident.replace(index, "").replace("Ending", "ED").replace("Opening", "OP");
	var name = parts.join("-");

	// {series name}-{OP,ED}{0,1,2,...}[{a,b,c,...}]-
	return name + "-" + oped + (/^\d\D*$/.test(index) ? "0" : "") + index + "-";
}
var DID = document.getElementById.bind(document);
var DQS = document.querySelector.bind(document);
var DQSA = document.querySelectorAll.bind(document);

window.onload = function() {
	VideoElement = DID("bgvid");
	Tooltip.Element = DID("tooltip");
	SubtitleManager.add(VideoElement);

	// Fix menu button. It is set in HTML to be a link to the FAQ page for anyone who has disabled JavaScript.
	DID("menubutton").outerHTML = '<span id="menubutton" class="quadbutton fa fa-bars"></span>';

	// Set/Get history state
	if (history.state == null) {
		var video = {file: filename(),
		             mime: [...VideoElement.children].map(src => src.type),
		           source: DID("source").textContent.trim().slice(5),
		            title: DID("title").textContent.trim()};
		if (DID("song").innerHTML) { // We know the song info
			var info = DID("song").innerHTML.replace("Song: \"","").split("\" by ");
			video.song = {title: info[0], artist: info[1]};
		}
		if (DID("subtitles-button").style.display == "") // Subtitles are available
			video.subtitles = subtitles.attribution().slice(1,-1);

		if (document.title == "Secret~") video.egg = true;
		else document.title = video.title + " from " + video.source; // The title may have been set to a generic title in PHP.

		Videos.list = [video];
		history.replaceState({video: video, index: 0, directLink: !!location.search}, document.title, location.origin + location.pathname + (video.egg ? "" : "?video=" + filenameToIdentifier(filename())));
	} else popHist();

	// Check LocalStorage
	if (!history.state.directLink && localStorage["autonext"] == "true") toggleAutonext();
	if (localStorage["videoType"]) changeVideoType(localStorage["videoType"]);
	if (localStorage[location.pathname+"volume"]) changeVolume(localStorage[location.pathname+"volume"]);
	if (localStorage["title-popup"]) {
		if (JSON.parse(localStorage["title-popup"])) {
			DID("show-title-checkbox").checked = true;
			DQS("#show-title-delay input").value = localStorage["title-popup-delay"];
			showVideoTitle(localStorage["title-popup-delay"]);
		}
	} else {
		localStorage["title-popup"] = "true";
		localStorage["title-popup-delay"] = "0";
		showVideoTitle(localStorage["title-popup-delay"]);
	}
	if (!localStorage["subtitles-enabled"]) localStorage["subtitles-enabled"] = true;
	if (subtitles.enabled() && subtitles.available()) subtitles.start();

	// autoplay
	if (VideoElement.paused) playPause();

	/* The 'ended' event does not fire if loop is set. We want it to fire, so we
	need to remove the loop attribute. We don't want to remove loop from the base
	html so that it does still loop for anyone who has disabled JavaScript. */
	VideoElement.removeAttribute("loop");

	addEventListeners();
};

window.onpopstate = popHist;
function popHist() {
	if (history.state == "list") history.go();

	Videos.index = history.state.index;
	Videos.list = sessionStorage["videos"] ? JSON.parse(sessionStorage["videos"]) : [history.state.video];

	VideoElement = DID("bgvid");
	Tooltip.Element = DID("tooltip");

	setVideoElements();
	subtitles.reset();
	playPause();
}

function addEventListeners() {
	// Function Shortcuts
	let VAEL = VideoElement.addEventListener.bind(VideoElement);
	let DAEL = document.addEventListener.bind(document);
	let DIDAEL = (ID,evt,fun) => DID(ID).addEventListener(evt,fun);


	// On Video End
	VAEL("ended", onend);

	// Pause/Play Video on Click
	VAEL("click", playPause);

	// Progress Bar
	VAEL("progress", updateprogress); // on video loading progress
	VAEL("timeupdate", updateprogress);
	VAEL("timeupdate", updateplaytime); // on time progress

	// Progress Bar Seeking
	DIDAEL("progressbar", "click", e => {
		const percentage = e.clientX / document.body.clientWidth;
		skip((VideoElement.duration * percentage) - VideoElement.currentTime);
	});

	// Mobile Swipe
	DAEL("touchstart", handleTouchStart);
	DAEL("touchmove", handleTouchMove);

	// Mouse Wheel
	DAEL("wheel", function(e) {
		if (e.deltaY > 0) // Scrolled down
			changeVolume(((20 * VideoElement.volume - 1) | 0) * 5);
		else if (e.deltaY < 0) // Scrolled up
			changeVolume(((20 * VideoElement.volume + 1) | 0) * 5);
	});
	DIDAEL("site-menu", "wheel", e => e.stopPropagation());
	DIDAEL("modal", "wheel", e => e.stopPropagation());

	// Mouse Move
	DAEL("mousemove", aniopMouseMove);

	// Tooltip
	for (let e of DQSA("#menubutton, .controlsleft > *, .controlsright > *")) {
		e.addEventListener("mouseenter", tooltip);
		e.addEventListener("mouseleave", tooltip);
	}

	// Key Down
	DAEL("keydown", keydown);


	// Menu Open/Close
	DIDAEL("menubutton", "click", showMenu);
	DIDAEL("closemenubutton", "click", hideMenu);

	// Title Popup Setting
	function storeTitlePopupSettings() {
		localStorage["title-popup"] = DID("show-title-checkbox").checked;
		localStorage["title-popup-delay"] = DQS("#show-title-delay input").value;
	}
	DIDAEL("show-title-checkbox", "change", storeTitlePopupSettings);
	DQS("#show-title-delay input").addEventListener("input", storeTitlePopupSettings);

	// Change Video Type
	for (let e of DQSA("input[name=videoType]")) e.addEventListener("change", changeVideoType);

	// Autonext Toggle
	for (let e of DQSA("input[name=autonext]")) e.addEventListener("change", toggleAutonext);

	// Toggle Subtitles
	DIDAEL("subtitle-checkbox", "change", subtitles.toggle);

	// Volume Slider
	DIDAEL("volume-slider", "input", e => changeVolume(e.target.value));


	// Left Controls
	DIDAEL("videoTypeToggle", "click", changeVideoType);
	DIDAEL("getnewvideo", "click", getNewVideo);
	DIDAEL("autonext", "click", toggleAutonext);

	// Right Controls
	DIDAEL("subtitles-button", "click", subtitles.toggle);
	DIDAEL("skip-left", "click", () => skip(-10));
	DIDAEL("skip-right", "click", () => skip(10));
	DIDAEL("pause-button", "click", playPause);
	DIDAEL("fullscreen-button", "click", toggleFullscreen);

	// Fullscreen Change
	DAEL("fullscreenchange", aniopFullscreenChange);
	DAEL("webkitfullscreenchange", aniopFullscreenChange);
	DAEL("mozfullscreenchange", aniopFullscreenChange);
	DAEL("MSFullscreenChange", aniopFullscreenChange);

	// List Modal
	DIDAEL("listlink", "click", listModal.open);
	DIDAEL("modal", "click", listModal.close);
}

// Hide mouse, progress bar, and controls if mouse has not moved for 3 seconds
// and the menu is not open. Will not hide the tooltip or a button that is
// being hovered over.
function aniopMouseMove(event) {
	// If it is not a mobile device.
	if (xDown === null) {
		if (changeOnMouseMove === null) {
			changeOnMouseMove = DQSA("#progressbar, #menubutton, .controlsleft > *, .controlsright > *");
			for (let b of DQSA(".quadbutton")) b.classList.add("quadNotMobile");
		}

		// If the mouse has actually moved.
		if (event.clientX != lastMousePos.x || event.clientY != lastMousePos.y) {
			clearTimeout(mouseIdle);

			document.documentElement.style.cursor = "";
			for (let e of changeOnMouseMove) e.classList.remove("mouse-idle");

			// If the menu is not open.
			if (DID("site-menu").hasAttribute("hidden")) {
				mouseIdle = setTimeout(function() {
					for (let e of changeOnMouseMove) e.classList.add("mouse-idle");
					document.documentElement.style.cursor = "none";
				}, 3000);
			}

			lastMousePos = {"x":event.clientX,"y":event.clientY};
		}
	}
}

// get shuffled list of videos with current video first
function getVideolist() {
	document.documentElement.style.pointerEvents = "none";
	tooltip("Loading...", "bottom: 50%; left: 50%; bottom: calc(50% - 16.5px); left: calc(50% - 46.5px); null");

	let r = new XMLHttpRequest();
	r.open("GET", "api/list.php?eggs&shuffle&first=" + Videos.list[Videos.index].file, false);
	r.onload = evt => sessionStorage["videos"] = r.responseText;
	r.send();

	Videos.index = 1;
	Videos.list = JSON.parse(sessionStorage["videos"])

	tooltip();
	document.documentElement.style.pointerEvents = "";
}

function getNewVideo() {
	if (Videos.list.length <= 1) getVideolist();
	else ++Videos.index;

	// just in case
	if (Videos.list.length == 0) return;
	if (Videos.index >= Videos.list.length) Videos.index = 0;

	// When the end of the list is reached, go back to the beginning. Only do this once per function call.
	for (var start = Videos.index, end = Videos.list.length, counter = 2; counter > 0; --counter) {
		// get a new video until it isn't an ending/opening
		if (videoType == "op" || videoType == "ed") {
			while (Videos.index < end) {
				let video = Videos.list[Videos.index];
				if (video.egg) break;
				let parts = video.file.split("-");
				let oped = parts[parts.length-2].slice(0,2).toLowerCase();
				if (oped == videoType) break;
				++Videos.index;
			}
		}
		// get a new video until it is an Easter Egg
		else if (videoType == "egg")
			while (Videos.index < end && !Videos.list[Videos.index].egg)
				++Videos.index;

		if (Videos.index >= end) {
			Videos.index = 0;
			end = start
		} else break;
	}

	var method = (document.title == "Secret~" ? "replace" : "push") + "State";

	setVideoElements();

	let video = Videos.list[Videos.index];
	history[method]({video: video, index: Videos.index}, document.title, location.origin + location.pathname + (video.egg ? "" : "?video=" + filenameToIdentifier(video.file)));

	subtitles.reset();
	VideoElement.play();
	DID("pause-button").classList.remove("fa-play");
	DID("pause-button").classList.add("fa-pause");
}

function setVideoElements() {
	function mimeToExt(mime) {
		if (mime.startsWith("video/mp4")) return ".mp4";
		if (mime.startsWith("video/webm")) return ".webm";
		return "";
	}

	const video = Videos.list[Videos.index];

	var sources = "";
	for (let mime of video.mime)
		sources += '<source src="video/' + video.file + mimeToExt(mime) + '" type="' + mime + '">';
	VideoElement.innerHTML = sources;
	VideoElement.load();
	DID("subtitle-attribution").innerHTML = (video.subtitles ? "[" + video.subtitles + "]" : "");
	DID("title").innerHTML = video.title;
	DID("source").innerHTML = "From " + video.source;

	// remove all download links but one
	let downloads = DQSA(".videodownload");
	for (let i = 1; i < downloads.length; ++i) downloads[i].remove();

	if (video.egg) {
		document.title = "Secret~";
		DID("videolink").parentNode.setAttribute("hidden","");
		DQS(".videodownload").style.display = "none";
	} else {
		document.title = video.title + " from " + video.source;
		DID("videolink").parentNode.removeAttribute("hidden");
		DID("videolink").href = "/?video=" + filenameToIdentifier(video.file);
		var dlinks = "";
		for (let mime of video.mime) {
			let ext = mimeToExt(mime);
			dlinks += '<li class="link videodownload"><a href="video/' + video.file + ext + '" download>Download this video as ' + ext.slice(1) + '</a></li>';
		}
		DQS(".videodownload").outerHTML = dlinks;
	}

	var song = "";
	if (video.song) song = "Song: &quot;" + video.song.title + "&quot; by " + video.song.artist;
	else if (video.egg || (Math.random() <= 0.01)) song = "Song: &quot;Sandstorm&quot; by Darude";
	DID("song").innerHTML = song;

	if (localStorage["title-popup"] && JSON.parse(localStorage["title-popup"])) showVideoTitle(localStorage["title-popup-delay"]);
}

// Menu Visibility Functions
function menuIsHidden() {
	return DID("site-menu").hasAttribute("hidden");
}
function showMenu() {
	if (xDown != null) tooltip(); // Hide the tooltip on mobile.
	clearTimeout(mouseIdle); // Stop things from being hidden on idle.
	DID("menubutton").style.display = "none";
	DID("site-menu").removeAttribute("hidden");
}
function hideMenu() {
	if (xDown != null) tooltip(); // Hide the tooltip on mobile.
	DID("menubutton").style.display = "";
	DID("site-menu").setAttribute("hidden", "");
}
function toggleMenu() {
	if (menuIsHidden()) showMenu();
	else hideMenu();
}

// Play/Pause Button
function playPause() {
	var button = DID("pause-button");

	if (VideoElement.paused) {
		VideoElement.play();
		button.classList.remove("fa-play");
		button.classList.add("fa-pause");
	} else {
		VideoElement.pause();
		button.classList.remove("fa-pause");
		button.classList.add("fa-play");
	}

	// Update Tooltip
	if (Tooltip.Showing == "pause-button") tooltip("pause-button");
}

// Video Seek Function
function skip(value) {
	VideoElement.currentTime += value;

	// Calculates the current time in minutes and seconds.
	const minutes = Math.floor(VideoElement.currentTime / 60);
	const seconds = Math.floor(VideoElement.currentTime - (60 * minutes));

	// Displays the current time.
	displayTopRight(minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

// Fullscreen Functions
function isFullscreen() {
	return Boolean(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
}
function toggleFullscreen() {
	if (isFullscreen()) {
		if (document.exitFullscreen) document.exitFullscreen();
		else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
		else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
		else if (document.msExitFullscreen) document.msExitFullscreen();
	} else {
		const e = document.documentElement;
		if (e.requestFullscreen) e.requestFullscreen();
		else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen();
		else if (e.mozRequestFullScreen) e.mozRequestFullScreen();
		else if (e.msRequestFullscreen) e.msRequestFullscreen();
	}

	// Update Tooltip
	if (Tooltip.Showing == "fullscreen-button") tooltip("fullscreen-button");
}
function aniopFullscreenChange() {
	var button = DID("fullscreen-button");

	if (isFullscreen()) {
		button.classList.remove("fa-expand");
		button.classList.add("fa-compress");
	} else {
		button.classList.remove("fa-compress");
		button.classList.add("fa-expand");
	}
}

// Autonext by Howl
function toggleAutonext() {
	autonext = !autonext;
	if (autonext) {
		DID("autonext").classList.remove("fa-toggle-off");
		DID("autonext").classList.add("fa-toggle-on");
		VideoElement.removeAttribute("loop");
	} else {
		DID("autonext").classList.remove("fa-toggle-on");
		DID("autonext").classList.add("fa-toggle-off");
		VideoElement.setAttribute("loop", "");
	}

	localStorage["autonext"] = autonext;
	DQS("input[name=autonext][value=" + autonext + "]").checked = true;

	// Update Tooltip
	if (Tooltip.Showing == "autonext") tooltip("autonext");
}

// what to do when the video ends
function onend() {
	if (autonext || document.title == "Secret~") getNewVideo();
	else VideoElement.play(); // loop
}

// OP/ED/All toggle
function changeVideoType(value) {
	// get new video type
	if (value.type == "change") { // toggle in settings
		videoType = value.target.value;
	} else if (value.type == "click") { // #videoTypeToggle toggle button
		if (videoType == "all") videoType = "op";
		else if (videoType == "op") videoType = "ed";
		else videoType = "all";
	} else videoType = value;

	// change #videoTypeToggle's icon
	var element = DID("videoTypeToggle");
	element.classList.remove("fa-adjust");
	element.classList.remove("fa-circle");
	element.classList.remove("fa-circle-o");
	element.classList.remove("fa-flip-horizontal");
	if (videoType == "all") element.classList.add("fa-circle");
	else if (videoType == "op") element.classList.add("fa-adjust", "fa-flip-horizontal");
	else if (videoType == "ed") element.classList.add("fa-adjust");
	else if (videoType == "egg") element.classList.add("fa-circle-o");

	// change what's set in the settings
	if (DQS("input[name=videoType]:checked")) DQS("input[name=videoType]:checked").checked = false;
	if (videoType != "egg") DQS("input[name=videoType][value=" + videoType + "]").checked = true;

	// update local-storage
	localStorage["videoType"] = videoType;

	// update tooltip
	if (Tooltip.Showing == "videoTypeToggle") tooltip("videoTypeToggle");
}

// Overused tooltip code
function tooltip(text, css) {
	var eventType;
	if (text) {
		if (text.target) {
			eventType = text.type;
			text = text.target.id;
		} else eventType = "mouseenter";
		Tooltip.Showing = text;
	} else eventType = "mouseleave";

	if (eventType === "mouseleave") Tooltip.Showing = "";

	switch (text) {
		case "menubutton":
			text = "Menu (M)";
			css = "top: 65px; bottom: auto; left";
			break;
		case "videoTypeToggle":
			if (videoType == "all") text = "Click to only view openings";
			else if (videoType == "op") text = "Click to only view endings";
			else text = "Click to view openings and endings";
			css = "left";
			break;
		case "getnewvideo":
			text = "Click to get a new video (N)";
			css = "left";
			break;
		case "autonext":
			if (autonext) text = "Click to loop video instead of getting a new one";
			else text = "Click to get a new video instead of looping";
			css = "left";
			break;
		case "skip-left":
			text = "Click to go back 10 seconds (left arrow)";
			css = "right";
			break;
		case "skip-right":
			text = "Click to go forward 10 seconds (right arrow)";
			css = "right";
			break;
		case "pause-button":
			if (!VideoElement.paused) text = "Click to pause the video (spacebar)";
			else text = "Click to play the video (spacebar)";
			css = "right";
			break;
		case "fullscreen-button":
			if (isFullscreen()) text = "Click to exit fullscreen (F)";
			else text = "Click to enter fullscreen (F)";
			css = "right";
			break;
		case "subtitles-button":
			if (subtitles.enabled()) text = "Click to disable subtitles (S)";
			else text = "Click to enable subtitles (S)";
			css = "right";
	}

	if (css) Tooltip.Element.setAttribute("style", css + ": 10px;");
	else Tooltip.Element.removeAttribute("style");
	Tooltip.Element.innerHTML = text;
	Tooltip.Element.classList.toggle("is-hidden", eventType === "mouseleave");
	Tooltip.Element.classList.toggle("is-visible", eventType === "mouseenter");
}
function showVideoTitle(delay) {
	const video = Videos.list[Videos.index];
	const popup = DID("title-popup");

	clearTimeout(showVideoTitleTimeoutA);
	clearTimeout(showVideoTitleTimeoutB);

	popup.innerHTML = video.title + " from " + video.source;

	showVideoTitleTimeoutA = setTimeout(() => {
		popup.style.opacity = 1;
		showVideoTitleTimeoutB = setTimeout(() => {
			popup.style.opacity = 0;
		}, 3500);
	}, delay * 1000);
}

// Keyboard functions
function keydown(e) {
	// check if the Konami Code is being entered
	let kc, konamicode = [38,38,40,40,37,39,37,39,66,65];
	if (e.which === konamicode[konamiIndex]) {
		++konamiIndex;
		if (konamiIndex === konamicode.length) {
			DID("menubutton").classList.toggle("fa-spin");
			DID("videoTypeToggle").classList.toggle("fa-spin");
			DID("wrapper").classList.toggle("fa-spin");
			DID("getnewvideo").classList.toggle("fa-spin");
			DID("autonext").classList.toggle("fa-spin");
			DID("subtitles-button").classList.toggle("fa-spin");
			DID("skip-left").classList.toggle("fa-spin");
			DID("skip-right").classList.toggle("fa-spin");
			DID("pause-button").classList.toggle("fa-spin");
			DID("fullscreen-button").classList.toggle("fa-spin");

			if (isKonaming = !isKonaming) changeVideoType("egg");
			konamiIndex = 0;
		}
		kc = true;
	} else {
		konamiIndex = 0;
		kc = false;
	}

	if (e.altKey || e.ctrlKey) return;

	switch (e.which) {
		case 8: // Backspace
			history.back();
		case 32: // Space
			playPause();
			break;
		case 33: // Page Up
			changeVolume(((20 * VideoElement.volume + 1) | 0) * 5);
			break;
		case 34: // Page Down
			changeVolume(((20 * VideoElement.volume - 1) | 0) * 5);
			break;
		case 37: // Left Arrow
			if (!kc) skip(-10);
			break;
		case 39: // Right Arrow
			if (!kc) skip(10);
			break;
		case 70: // F
		case 122: // F11
			toggleFullscreen();
			break;
		case 77: // M
			toggleMenu();
			break;
		case 78: // N
			getNewVideo();
			break;
		case 83: // S
			subtitles.toggle();
			break;
		default:
			return;
	}

	e.preventDefault();
}

// change volume
function changeVolume(amount) {
	amount |= 0;

	if (amount < 0) amount = 0;
	else if (amount > 100) amount = 100;

	VideoElement.volume = (amount / 100).toPrecision(2);

	displayTopRight(amount + "%");
	DID("volume-amount").innerHTML = amount + "%";
	DID("volume-slider").value = amount;
	localStorage[location.pathname+"volume"] = amount;
}

// display text in the top right of the screen
function displayTopRight(text,delay) {
	const display = DQS(".displayTopRight");

	display.innerHTML = text;
	display.style.transition = "";
	display.style.opacity = "0.5";

	clearTimeout(displayTopRightTimeout);
	displayTopRightTimeout = setTimeout(() => {
		display.style.transition = "opacity 1s linear";
		display.style.opacity = "0";
	}, delay || 10); // there seems to be a race condition here, but I couldn't find it
}

// set video progress bar buffered length
function updateprogress() {
	const buffered = ((VideoElement.buffered && VideoElement.buffered.length) ? 100 * (VideoElement.buffered.end(0) / VideoElement.duration) : (VideoElement.readyState == 4 ? 100 : 0)); // calculate buffered data in percent
	DID("bufferprogress").style.width = buffered + "%"; // update progress bar width
}

// set video progress bar played length
function updateplaytime() {
	const watched = 100 * (VideoElement.currentTime / VideoElement.duration); // calculate current time in percent
	DID("timeprogress").style.width = watched + "%"; // update progress bar width
}

// get mobile swipe start location
function handleTouchStart(evt) {
	xDown = evt.touches[0].clientX;
	yDown = evt.touches[0].clientY;
}

// handle mobile swipe
function handleTouchMove(evt) {
	if (!xDown && !yDown) return;

	const xDiff = xDown - evt.touches[0].clientX;
	const yDiff = yDown - evt.touches[0].clientY;

	// detect swipe in the most significant direction
	if (Math.abs(xDiff) > Math.abs(yDiff)) {
		if (xDiff > 0) {
			/* left swipe */
		} else {
			/* right swipe */
		}
	} else {
		if (yDiff > 0) {
			/* up swipe */
			DQS(".progress").style.height = "2px";
		} else {
			/* down swipe */
			DQS(".progress").style.height = "15px";
		}
	}

	// reset values
	xDown = null;
	yDown = null;
}

// Subtitle Funtions
var subtitles = {
	attribution: () => DID("subtitle-attribution").textContent,
	available: () => Boolean(Videos.list[Videos.index].subtitles),
	enabled: () => JSON.parse(localStorage["subtitles-enabled"]),
	path: () => "subtitles/" + filename() + ".ass",
	reset: function() {
		if (subtitles.available()) {
			DID("subtitles-button").style.display = "";
			DID("subs").style.display = "";
			SubtitleManager.setSubtitleFile(VideoElement,subtitles.path());
			if (subtitles.enabled()) subtitles.start();
		} else {
			DID("subtitles-button").style.display = "none";
			DID("subs").style.display = "none";
			SubtitleManager.hide(VideoElement);
		}
	},
	start: function() {
		SubtitleManager.setSubtitleFile(VideoElement,subtitles.path());
		SubtitleManager.show(VideoElement);
		DID("subtitles-button").classList.add("fa-commenting");
		DID("subtitles-button").classList.remove("fa-commenting-o");
		displayTopRight("Enabled Subtitles by " + subtitles.attribution(), 3000);
		if (Tooltip.Showing == "subtitles-button") tooltip("subtitles-button");
	},
	toggle: function() {
		var enabled = subtitles.enabled();
		enabled ? SubtitleManager.hide(VideoElement) : SubtitleManager.show(VideoElement);

		if (subtitles.available()) {
			if (enabled) {
				DID("subtitles-button").classList.add("fa-commenting-o");
				DID("subtitles-button").classList.remove("fa-commenting");
				displayTopRight("Disabled Subtitles", 1000);
			} else {
				DID("subtitles-button").classList.add("fa-commenting");
				DID("subtitles-button").classList.remove("fa-commenting-o");
				displayTopRight("Enabled Subtitles by " + subtitles.attribution(), 3000);
			}
			if (Tooltip.Showing == "subtitles-button") tooltip("subtitles-button");
		}

		localStorage["subtitles-enabled"] = !enabled;
		DID("subtitle-checkbox").checked = !enabled;
	}
};

// Video List Modal
var listModal = {
	open: function(e) {
		if (e.ctrlKey || e.shiftKey || e.metaKey || (e.button && e.button == 1))
			return;

		// Load with the "frame" GET argument for special CSS
		// The frame has to be removed before changing its source
		// so that it doesn't create a History entry.
		var modal = DID("modal");
		var frame = modal.firstElementChild;
		frame.remove();
		frame.src = "list/?frame&s=" + Videos.list[Videos.index].source;
		modal.appendChild(frame);
		modal.style.display = "block";

		e.preventDefault();
	},
	close: function() {DID("modal").style.display = "none";}
};
