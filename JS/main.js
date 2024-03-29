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
// const BACKEND_VALUES is set from the main PHP file.
let videoData = BACKEND_VALUES.video_data.data; // metadata for the current video
let nextVideoParams = BACKEND_VALUES.video_data.next; // url params to use to get the next video
let isKonaming = false, konamiIndex = 0, loadingVideo = false;
let autonext = false, inIFrame = window !== window.parent;
let autoplayRequested = /[?&;]autoplay(?:=(?:1|(?:t(rue)?)))?(?:[&;]|$)/i.test(location.search);
let xDown = null, yDown = null; // position of mobile swipe start location
let mouseIdle, changeOnMouseMove = null, lastMousePos = {x:0,y:0};
let VideoElement, Tooltip = {Element: null, Showing: ""};
let showVideoTitleTimeoutA = null, showVideoTitleTimeoutB = null;
let displayTopRightTimeout = null;

// If local/session storage isn't available, set it to a blank object. Nothing
// will be stored, but it means we don't have to check every time we use it.
let myLocalStorage, mySessionStorage;
try { myLocalStorage = window.localStorage || {}; }
catch (e) { myLocalStorage = {}; }
try { mySessionStorage = window.sessionStorage || {}; }
catch (e) { mySessionStorage = {}; }


// Helper/Alias Functions
let rawurlencodePHP = URL => encodeURIComponent(URL).replace(/[!'()*]/g, c => "%" + c.charCodeAt(0).toString(16));
let getVideoQuery = video => "video=" + rawurlencodePHP(video.uid || video.file);
let DID = document.getElementById.bind(document);
let DQS = document.querySelector.bind(document);
let DQSA = document.querySelectorAll.bind(document);

window.onload = function() {
	VideoElement = DID("bgvid");
	Tooltip.Element = DID("tooltip");
	SubtitleManager.add(VideoElement);

	let noHistory = history.state === null;

	// Fix menu button. It is set in HTML to be a link to the FAQ page for anyone who has disabled JavaScript.
	DID("menubutton").outerHTML = '<span id="menubutton" class="quadbutton fa fa-bars"></span>';

	// Show giant play button.
	let GPB = DID("giant-play-button");
	GPB.style.display = "block";

	// Set/Get history state
	if (noHistory) {
		// The title may have been set to a generic title in PHP.
		document.title = videoData.hidden ? "Secret~" : videoData.title + " from " + videoData.source;
		history.replaceState({video: videoData, next: nextVideoParams, directLink: !!location.search}, document.title, location.origin + location.pathname + (videoData.hidden ? "" : "?" + getVideoQuery(videoData)));
	} else {
		// Restore history state.
		popHist();
		// Make sure current URL is encoded properly.
		history.replaceState(history.state, document.title, location.origin + location.pathname + (videoData.hidden ? "" : "?" + getVideoQuery(videoData)));
	}

	// Check myLocalStorage
	if (!history.state.directLink && myLocalStorage["autonext"] == "true") toggleAutonext();
	if (myLocalStorage["video-types"]) {
		let types = new Set(JSON.parse(myLocalStorage["video-types"]));
		for (let checkbox of DQSA("#video-types input"))
			checkbox.checked = types.has(checkbox.value);
	}
	if (myLocalStorage[location.pathname+"volume"]) changeVolume(myLocalStorage[location.pathname+"volume"]);
	if (myLocalStorage["title-popup"]) {
		if (JSON.parse(myLocalStorage["title-popup"])) {
			DID("show-title-checkbox").checked = true;
			DQS("#show-title-delay input").value = myLocalStorage["title-popup-delay"];
			showVideoTitle(myLocalStorage["title-popup-delay"]);
		}
	} else {
		myLocalStorage["title-popup"] = "true";
		myLocalStorage["title-popup-delay"] = "0";
		showVideoTitle(myLocalStorage["title-popup-delay"]);
	}
	if (!myLocalStorage["subtitles-enabled"]) myLocalStorage["subtitles-enabled"] = true;
	if (subtitles.enabled() && subtitles.available()) subtitles.start();

	// hide left controls when in iframe
	if (inIFrame) {
		let controlsleft = DQS(".controlsleft");
		controlsleft.style.display = "none";
	}

	/* The 'ended' event does not fire if 'loop' is set. We want it to fire, so we
	need to remove the loop attribute. We don't want to remove loop from the base
	html so that it does still loop for anyone who has disabled JavaScript. */
	VideoElement.removeAttribute("loop");

	addEventListeners();
	setupPlayerJS();

	// autoplay
	let shouldPlay = autoplayRequested || !inIFrame;

	// check that the current video matches one of the requested video types
	if (noHistory && !history.state.directLink && !DQS("#video-types input:checked[value="+videoData.type+"]")) {
		// set the current data to 'hidden' so the current history state gets replaced
		videoData.hidden = true;
		getNewVideo(shouldPlay);
	} else if (shouldPlay) {
		playVideo();
	}
};

window.onpopstate = popHist;
function popHist() {
	if (history.state === "list") history.go();

	VideoElement = DID("bgvid");
	Tooltip.Element = DID("tooltip");
	SubtitleManager.add(VideoElement);

	let shouldPlay = !VideoElement.paused;

	videoData = history.state.video;
	nextVideoParams = history.state.next;
	if (videoData.load_video) {
		getNewVideo(shouldPlay);
	} else {
		setVideoElements(videoData);
		subtitles.reset();
		if (shouldPlay) playVideo();
	}
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
	let GPB = DID("giant-play-button");
	if (GPB) GPB.addEventListener("click", playPause);

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
	for (let e of DQSA("#menubutton, #searchbutton, .controlsleft > *, .controlsright > *")) {
		e.addEventListener("mouseenter", tooltip);
		e.addEventListener("mouseleave", tooltip);
	}

	// Key Down
	DAEL("keydown", keydown);


	// Menu Open/Close
	DIDAEL("menubutton", "click", menu.show);
	DIDAEL("closemenubutton", "click", menu.hide);

	// Title Popup Setting
	function storeTitlePopupSettings() {
		myLocalStorage["title-popup"] = DID("show-title-checkbox").checked;
		myLocalStorage["title-popup-delay"] = DQS("#show-title-delay input").value;
	}
	DIDAEL("show-title-checkbox", "change", storeTitlePopupSettings);
	DQS("#show-title-delay input").addEventListener("input", storeTitlePopupSettings);

	// Select Video Types
	DIDAEL("video-types", "click", e => {
		if (e.target.tagName !== "INPUT") return;
		myLocalStorage["video-types"] = JSON.stringify([...DQSA("#video-types input:checked")].map(x => x.value));
	});

	// Autonext Toggle
	for (let e of DQSA("input[name=autonext]")) e.addEventListener("change", toggleAutonext);

	// Toggle Subtitles
	DIDAEL("subtitle-checkbox", "change", subtitles.toggle);

	// Volume Slider
	DIDAEL("volume-slider", "input", e => changeVolume(e.target.value));


	// Left Controls
	DIDAEL("getnewvideo", "click", () => getNewVideo(!VideoElement.paused));
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
	DIDAEL("searchbutton", "click", listModal.open);
	DIDAEL("modal", "click", listModal.close);
}

// Hide mouse, progress bar, and controls if mouse has not moved for 3 seconds
// and the menu is not open. Will not hide the tooltip or a button that is
// being hovered over.
function aniopMouseMove(event) {
	// If it is not a mobile device.
	if (xDown === null) {
		if (changeOnMouseMove === null) {
			changeOnMouseMove = DQSA("#progressbar, #menubutton, #searchbutton, .controlsleft > *, .controlsright > *");
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

function getNewVideo(shouldPlay) {
	// Pause the video and prevent button/mouse events.
	pauseVideo();
	tooltip("Loading...", "bottom: 50%; left: 50%; bottom: calc(50% - 16.5px); left: calc(50% - 46.5px); null");
	loadingVideo = true;
	document.documentElement.style.pointerEvents = "none";

	let hs = history.state;
	let oldVideoData = videoData;
	nextVideoParams = nextVideoParams || {};

	// Update the next video params with the currently set video types to skip.
	for (let type of DQSA("#video-types input:checked")) {
		delete nextVideoParams[BACKEND_VALUES.prefix_skip+type.value];
	}
	for (let type of DQSA("#video-types input:not(:checked)")) {
		nextVideoParams[BACKEND_VALUES.prefix_skip+type.value] = true;
	}

	let params = Object.entries(nextVideoParams).map(e=>e[0]+"="+e[1]).join("&");
	let newListIndex = hs.list ? ((hs.index + 1) % hs.list.length) : 0;

	let r = new XMLHttpRequest();
	r.open("GET", "api/details.php?" + (hs.list ? "&uid=" + hs.list[newListIndex] : "") + params);
	r.onloadend = function(evt) {
		let errorMessage = "Failed to load the next video.\n";
		let error = r.responseText === null || r.responseText.length === 0;
		let response = error ? {} : JSON.parse(r.responseText);

		if (!error && response.data) {
			errorMessage = "";
			videoData = response.data;
			nextVideoParams = response.next;

			// Update the history state. How we change the history state depends on whether or not the *previous* video is "hidden".
			var method = (oldVideoData.hidden ? "replace" : "push") + "State";
			let toStore = {video:videoData};
			if (nextVideoParams) {
				toStore.next = nextVideoParams;
			}
			if (hs.list) {
				toStore.list = hs.list;
				toStore.index = newListIndex;
			}
			history[method](toStore, document.title, location.origin + location.pathname + (videoData.hidden ? "" : "?" + getVideoQuery(videoData)));

			// Load the video data.
			setVideoElements(videoData);
			subtitles.reset();
		} else if (hs.list) {
			errorMessage += "Could not get the video with ID '" + hs.list[newListIndex] + "'.\n";
		} else {
			errorMessage += "HTTP Status: " + r.status + " " + r.statusText + "\n";
		}

		if (response.comment) {
			errorMessage += response.comment;
		}
		if (errorMessage) {
			alert(errorMessage.trim());
		}

		// Reset the UI.
		document.documentElement.style.pointerEvents = "";
		loadingVideo = false;
		tooltip();
		if (shouldPlay) playVideo();
	};
	r.send();
}

function setVideoElements(video) {
	function mimeToExt(mime) {
		if (mime.startsWith("video/mp4")) return ".mp4";
		if (mime.startsWith("video/webm")) return ".webm";
		return "";
	}

	const filepath = (video.path ? (rawurlencodePHP(video.path) + "/") : "") + rawurlencodePHP(video.file);

	var sources = "";
	for (let mime of video.mime)
		sources += '<source src="' + filepath + mimeToExt(mime) + '" type="' + mime + '">';
	VideoElement.innerHTML = sources;
	VideoElement.load();
	DID("subtitle-attribution").innerHTML = (video.subtitles ? "[" + video.subtitles + "]" : "");
	DID("title").innerHTML = video.title;
	DID("source").innerHTML = "From " + video.source;

	// Remove all download links but one. The code below expects exactly one to exist.
	let downloads = DQSA(".videodownload");
	for (let i = 1; i < downloads.length; ++i) downloads[i].remove();

	if (video.hidden) {
		document.title = "Secret~";
		DID("videolink").parentNode.setAttribute("hidden","");
		DQS(".videodownload").style.display = "none";
	} else {
		document.title = video.title + " from " + video.source;
		DID("videolink").parentNode.removeAttribute("hidden");
		DID("videolink").href = "/?" + getVideoQuery(video);
		var dlinks = "";
		for (let mime of video.mime) {
			let ext = mimeToExt(mime);
			dlinks += '<li class="link videodownload"><a href="' + filepath + ext + '" download>Download this video as ' + ext.slice(1) + '</a></li>';
		}
		DQS(".videodownload").outerHTML = dlinks;
	}

	let song = "";
	if (video.song) {
		song = "Song: &quot;" + video.song.title + "&quot; by " + video.song.artist;
	} else if (video.hidden || (Math.random() <= 0.01)) {
		let songs = [
			"Song: &quot;Sandstorm&quot; by Darude",
			"Song: &quot;Never Gonna Give You Up&quot; by Rick Astley",
			"Song: &quot;Mr. Blue Sky&quot; by Electric Light Orchestra"
		];
		song = songs[songs.length * Math.random() | 0];
	}
	DID("song").innerHTML = song;

	if (myLocalStorage["title-popup"] && JSON.parse(myLocalStorage["title-popup"])) showVideoTitle(myLocalStorage["title-popup-delay"]);
}

// Menu Visibility Functions
let menu = {
	isHidden: () => DID("site-menu").hasAttribute("hidden"),
	show: function() {
		if (xDown != null) tooltip(); // Hide the tooltip on mobile.
		clearTimeout(mouseIdle); // Stop things from being hidden on idle.
		DID("menubutton").style.display = "none";
		DID("site-menu").removeAttribute("hidden");
	},
	hide: function() {
		if (xDown != null) tooltip(); // Hide the tooltip on mobile.
		DID("menubutton").style.display = "";
		DID("site-menu").setAttribute("hidden", "");
	},
	toggle: () => menu.isHidden() ? menu.show() : menu.hide()
};

// Play/Pause Button
function playPause() {
	VideoElement.paused ? playVideo() : pauseVideo();
}
function playVideo(callback) {
	let GPB = DID("giant-play-button");

	function then() {
		if (!VideoElement.paused) {
			if (GPB) GPB.remove();
			let btn = DID("pause-button");
			btn.classList.remove("fa-play");
			btn.classList.add("fa-pause");
			if (Tooltip.Showing == "pause-button")
				tooltip("pause-button");
			if (callback) callback();
		}
	}

	if (VideoElement.paused) {
		let playPromise = VideoElement.play();
		if (playPromise)
			playPromise.then(then).catch(e => console.warn(e));
		else then();
	}

	// If we wait to remove this until the promise returns, it will flash on
	// the screen for a second before being removed. However, if the video can
	// play, it may already be playing at this point before the promise returns.
	if (!VideoElement.paused && GPB) GPB.remove();
}
function pauseVideo() {
	VideoElement.pause();
	let btn = DID("pause-button");
	btn.classList.remove("fa-pause");
	btn.classList.add("fa-play");
	if (Tooltip.Showing == "pause-button")
		tooltip("pause-button");
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

	myLocalStorage["autonext"] = autonext;
	DQS("input[name=autonext][value=" + autonext + "]").checked = true;

	// Update Tooltip
	if (Tooltip.Showing == "autonext") tooltip("autonext");
}

// what to do when the video ends
function onend() {
	// Don't get a new video if we're in an iframe.
	if (inIFrame) {
		if (autonext) pauseVideo();
		else playVideo();
	} else {
		if (autonext || videoData.hidden) {
			getNewVideo(true);
		} else playVideo();
	}
}

// Overused tooltip code
function tooltip(text, css) {
	if (loadingVideo) return;

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
		case "searchbutton":
			text = "Search (/)";
			css = "top: 65px; bottom: auto; right";
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

// Shows the title of the current video on screen for the specified number of seconds.
function showVideoTitle(delay) {
	const popup = DID("title-popup");

	// If a title is being displayed, cancel its callbacks.
	clearTimeout(showVideoTitleTimeoutA);
	clearTimeout(showVideoTitleTimeoutB);

	// Hide the popup text and set it to its new value.
	popup.style.opacity = 0;
	popup.innerHTML = videoData.title + " from " + videoData.source;

	// After `delay` milliseconds, display the title.
	// After 3.5 seconds, hide the title again.
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
			DID("searchbutton").classList.toggle("fa-spin");
			DID("wrapper").classList.toggle("fa-spin");
			DID("getnewvideo").classList.toggle("fa-spin");
			DID("autonext").classList.toggle("fa-spin");
			DID("subtitles-button").classList.toggle("fa-spin");
			DID("skip-left").classList.toggle("fa-spin");
			DID("skip-right").classList.toggle("fa-spin");
			DID("pause-button").classList.toggle("fa-spin");
			DID("fullscreen-button").classList.toggle("fa-spin");
			for (let type of DQSA("#video-types [hidden]")) type.removeAttribute("hidden");
			konamiIndex = 0;
		}
		kc = true;
	} else {
		konamiIndex = 0;
		kc = false;
	}

	if (loadingVideo || e.altKey || e.ctrlKey) return;

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
			menu.toggle();
			break;
		case 78: // N
			getNewVideo(!VideoElement.paused);
			break;
		case 83: // S
			subtitles.toggle();
			break;
		case 191: // /
			listModal.open(e);
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
	myLocalStorage[location.pathname+"volume"] = amount;
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
			for (let p of DQSA(".progress"))
				p.style.height = "2px";
		} else {
			/* down swipe */
			for (let p of DQSA(".progress"))
				p.style.height = "15px";
		}
	}
}

// Subtitle Functions
var subtitles = {
	attribution: () => DID("subtitle-attribution").textContent,
	available: () => Boolean(videoData.subtitles),
	enabled: () => JSON.parse(myLocalStorage["subtitles-enabled"]),
	path: () => "subtitles/" + videoData.file + ".ass",
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

		myLocalStorage["subtitles-enabled"] = !enabled;
		DID("subtitle-checkbox").checked = !enabled;
	}
};

// Video List Modal
var listModal = {
	open: function(e) {
		if (e.ctrlKey || e.shiftKey || e.metaKey || (e.button && e.button == 1))
			return;

		var modal = DID("modal");
		if (modal.style.display == "block")
			return;

		// Load with the "frame" GET argument for special CSS
		// The frame has to be removed before changing its source
		// so that it doesn't create a History entry.
		var frame = modal.firstElementChild;
		frame.remove();
		frame.src = "list/?frame&s=" + videoData.source;
		modal.appendChild(frame);
		modal.style.display = "block";

		e.preventDefault();
	},
	close: function() {DID("modal").style.display = "none";}
};

// PlayerJS Support
// https://github.com/embedly/player.js/blob/master/SPEC.rst
let originalSrc = location.toString();
function setupPlayerJS() {
	if (!inIFrame) return;

	let origin, CONTEXT = "player.js", VERSION = "0.0.11";

	{ // get origin
		let url = document.referrer;
		if (url.charAt(0) === "/" && url.charAt(1) === "/")
			url = window.location.protocol + url;
		origin = url.split("/").slice(0,3).join("/");
	}

	let events = {
		"ready": [],
		"play": [],
		"pause": [],
		"ended": [],
		"timeupdate": [],
		"progress": [],

		// these ones aren't required by PlayerJS
		"canplay": [],
		"playing": [],
		"seeked": [],
		"seeking": []
	};

	let methods = {
		"play": playVideo,
		"pause": pauseVideo,
		"getPaused": _ => VideoElement.paused,
		"mute": _ => VideoElement.muted = true,
		"unmute": _ => VideoElement.muted = false,
		"getMuted": _ => VideoElement.muted,
		"setVolume": changeVolume,
		"getVolume": _ => VideoElement.volume * 100,
		"getDuration": _ => VideoElement.duration,
		"setCurrentTime": value => skip(value - VideoElement.currentTime),
		"getCurrentTime": _ => VideoElement.currentTime,
		"setLoop": value => autonext = !value,
		"getLoop": _ => !(autonext || videoData.hidden),
		"removeEventListener": (value,listener) => {
			if (events[value]) {
				events[value] = events[value].filter(l => l != listener);
				if (!events[value])
					VideoElement.removeEventListener(value,playerJSEventHandler);
			}
		},
		"addEventListener": (value,listener) => {
			if (events[value]) {
				methods.removeEventListener(value,listener);
				events[value].push(listener);
			} else events[value] = [listener];
			VideoElement.addEventListener(value,playerJSEventHandler);
		}
	};

	// this does not handle the "ready" event
	function playerJSEventHandler(e) {
		if (events[e.type]) {
			// only two events actually return a value
			if (e.type === "timeupdate" || e.type === "progress") {
				var value = {
					"seconds": VideoElement.currentTime,
					"duration": VideoElement.duration,
					"percent": VideoElement.buffered.length
				};
			}

			for (let listener of events[e.type])
				reply(e.type, value, listener);
		}
	}

	function reply(method, value, listener) {
		data = {
			"context": CONTEXT,
			"version": VERSION,
			"event": method
		};

		if (value !== undefined && value !== null)
			data.value = value;

		if (listener !== undefined && listener !== null)
			data.listener = listener;

		window.parent.postMessage(JSON.stringify(data), origin || "*");
	}

	window.addEventListener("message", function(e) {
		// Only listen to messages with the same origin as our parent.
		// Hopefully this *is* our parent.
		if (e.origin !== origin) return false;

		// Get the data. We may need to parse it.
		try { var data = (typeof e.data === "string" ? JSON.parse(e.data) : e.data); }
		catch (err) { if (!(err instanceof SyntaxError)) throw err; }

		// Check that the data has what we need.
		if (data.context !== "player.js" || !data.method || !methods[data.method])
			return;

		// Call the requested method.
		if (data.method === "addEventListener")
			methods.addEventListener(data.value,data.listener);
		else if (data.method === "removeEventListener")
			methods.removeEventListener(data.value,data.listener);
		else if (data.method.charAt(0) === "g" && data.method.charAt(1) === "e" && data.method.charAt(2) === "t")
			reply(data.method, methods[data.method](data.value), data.listener);
		else methods[data.method](data.value);

		// Trigger Event Replies
		playerJSEventHandler({"type":data.method});
	});

	function onReady() {
		let value = {
			"src": originalSrc,
			"events": Object.keys(events),
			"methods": Object.keys(methods)
		};
		reply("ready", value);
		for (let listener of events.ready)
			reply("ready", value, listener);
	}
	if (VideoElement.readyState > 3) onReady();
	else VideoElement.addEventListener("canplay",onReady);
}
