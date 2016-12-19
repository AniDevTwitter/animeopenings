/* Contributors:
   Howl - Video Autonext
   Yurifag_ ( https://twitter.com/Yurifag_/ ) - Video Progress Bar
   trac - Video Progress Bar Seeking
   Tom McFarlin ( http://tommcfarlin.com ) - Konami Code
   Yay295 - Tooltip Function, Openings-Only Button, window.history, Mouse Idle, and Other Things
   givanse ( http://stackoverflow.com/a/23230280 ) - Mobile Swipe Detection
   maj160 - Fullscreen Functions, Subtitle Renderer
   aty2 - Menu toggle keyboard button
*/

// Global Variables
var isKonaming = false;
const konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];
var Videos = {video: 0, list: []};
var autonext = false;
var videoType = "all"; // egg, op, ed, all
var xDown = null, yDown = null; // position of mobile swipe start location
var mouseIdle, lastMousePos = {x:0,y:0};
var VideoElement, Tooltip = {Element: null, Showing: ""};

// Simple Functions
var filename = () => VideoElement.children[0].src.split("video/")[1].replace(/\.\w+$/, "");
var subtitlePath = () => "subtitles/" + filename() + ".ass";

window.onload = function() {
  VideoElement = document.getElementById("bgvid");
  Tooltip.Element = document.getElementById("tooltip");

  // Fix menu button. It is set in HTML to be a link to the FAQ page for anyone who has disabled JavaScript.
  document.getElementById("menubutton").outerHTML = '<span id="menubutton" class="quadbutton fa fa-bars"></span>';

  // Set/Get history state
  if (history.state == null) {
    var video = {file: VideoElement.children[0].src.split("video/")[1],
               source: document.getElementById("source").textContent.trim().slice(5),
                title: document.getElementById("title").textContent.trim()};
    if (document.getElementById("song").innerHTML) { // We know the song info
      var info = document.getElementById("song").innerHTML.replace("Song: \"","").split("\" by ");
      video.song = {title: info[0], artist: info[1]};
    }
    if ($("#subtitles-button").is(":visible")) // Subtitles are available
      video.subtitles = subtitles.attribution().slice(1,-1);

    if (document.title == "Secret~") {
      video.title = "Secret~";
      history.replaceState({video: 0, list: [video], directLink: !!location.search, egg: true}, document.title, location.origin + location.pathname);
    } else {
      // The title may have been set to a generic title in PHP.
      document.title = video.title + " from " + video.source;
      history.replaceState({video: 0, list: [video], directLink: !!location.search}, document.title, location.origin + location.pathname + "?video=" + filename());
    }

    Videos.list = [video];
  } else popHist();

  // Check LocalStorage
  if (!history.state.directLink && localStorage["autonext"] == "true") toggleAutonext();
  if (localStorage["videoType"]) changeVideoType(localStorage["videoType"]);
  if (localStorage[location.pathname+"volume"]) changeVolume(localStorage[location.pathname+"volume"]);
  if (localStorage["title-popup"]) {
    if (JSON.parse(localStorage["title-popup"])) {
      document.getElementById("show-title-checkbox").checked = true;
      document.getElementById("show-title-delay").getElementsByTagName("input")[0].value = localStorage["title-popup-delay"];
      showVideoTitle(localStorage["title-popup-delay"]);
    }
  } else {
    localStorage["title-popup"] = "true";
    localStorage["title-popup-delay"] = "0";
    showVideoTitle(localStorage["title-popup-delay"]);
  }
  if (localStorage["subtitles-enabled"]) {
    if (JSON.parse(localStorage["subtitles-enabled"]) && !subtitles.on()) subtitles.toggle();
  } else {
    localStorage["subtitles-enabled"] = "true";
    subtitles.toggle();
  }

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

  Videos.video = history.state.video;
  Videos.list = history.state.list;

  VideoElement = document.getElementById("bgvid");
  Tooltip.Element = document.getElementById("tooltip");

  setVideoElements();
  subtitles.reset();
  playPause();
}

function addEventListeners() {
  // On Video End
  VideoElement.addEventListener("ended", onend);

  // Pause/Play Video on Click
  VideoElement.addEventListener("click", playPause);

  // Progress Bar
  VideoElement.addEventListener("progress", updateprogress); // on video loading progress
  VideoElement.addEventListener("timeupdate", updateprogress);
  VideoElement.addEventListener("timeupdate", updateplaytime); // on time progress

  // Progress Bar Seeking
  $(document).on("click", "#progressbar", function(e) {
    const percentage = e.pageX / $(document).width();
    skip((VideoElement.duration * percentage) - VideoElement.currentTime);
  });

  // Mobile Swipe
  document.addEventListener("touchstart", handleTouchStart);
  document.addEventListener("touchmove", handleTouchMove);

  // Mouse Wheel
  const wheelEvent = isEventSupported("wheel") ? "wheel" : "mousewheel";
  $(document).on(wheelEvent, function(e) {
    const oEvent = e.originalEvent;
    const delta  = oEvent.deltaY || oEvent.wheelDelta;
    if (delta > 0) // Scrolled down
      changeVolume(((20 * VideoElement.volume - 1) | 0) * 5);
    else if (delta < 0) // Scrolled up
      changeVolume(((20 * VideoElement.volume + 1) | 0) * 5);
  });

  // Mouse Move
  document.addEventListener("mousemove", aniopMouseMove);

  // Tooltip
  $("#menubutton").hover(tooltip);
  $(".controlsleft").children().hover(tooltip);
  $(".controlsright").children().hover(tooltip);


  // Menu Open/Close
  document.getElementById("menubutton").addEventListener("click", showMenu);
  document.getElementById("closemenubutton").addEventListener("click", hideMenu);

  // Settings/Keybindings Show/Hide
  $(".accordion-head").click(function() {
    $(this.firstElementChild).toggleClass("fa-chevron-right").toggleClass("fa-chevron-down");
    $(this.nextElementSibling).toggle();
  });

  // Title Popup Setting
  function storeTitlePopupSettings() {
    localStorage["title-popup"] = document.getElementById("show-title-checkbox").checked;
    localStorage["title-popup-delay"] = document.getElementById("show-title-delay").getElementsByTagName("input")[0].value;
  }
  document.getElementById("show-title-checkbox").addEventListener("change", storeTitlePopupSettings);
  $("#show-title-delay input").on("input", storeTitlePopupSettings);

  // Change Video Type
  $("input[name=videoType]").on("change", changeVideoType);

  // Autonext Toggle
  $("input[name=autonext]").on("change", toggleAutonext);

  // Toggle Subtitles
  document.getElementById("subtitle-checkbox").addEventListener("change", subtitles.toggle);

  // Volume Slider
  document.getElementById("volume-slider").addEventListener("input", e => changeVolume(e.target.value));


  // Left Controls
  document.getElementById("videoTypeToggle").addEventListener("click", changeVideoType);
  document.getElementById("getnewvideo").addEventListener("click", getNewVideo);
  document.getElementById("autonext").addEventListener("click", toggleAutonext);

  // Right Controls
  document.getElementById("subtitles-button").addEventListener("click", subtitles.toggle);
  document.getElementById("skip-left").addEventListener("click", () => skip(-10));
  document.getElementById("skip-right").addEventListener("click", () => skip(10));
  document.getElementById("pause-button").addEventListener("click", playPause);
  document.getElementById("fullscreen-button").addEventListener("click", toggleFullscreen);

  // Fullscreen Change
  document.addEventListener("fullscreenchange", aniopFullscreenChange);
  document.addEventListener("webkitfullscreenchange", aniopFullscreenChange);
  document.addEventListener("mozfullscreenchange", aniopFullscreenChange);
  document.addEventListener("MSFullscreenChange", aniopFullscreenChange);

  // List Modal
  document.getElementById("listlink").addEventListener("click", listModal.open);
  document.getElementById("modal").addEventListener("click", listModal.close);
}

// Hide mouse, progress bar, and controls if mouse has not moved for 3 seconds
// and the menu is not open. Will not hide the tooltip or a button that is
// being hovered over.
function aniopMouseMove(event) {
  // If it is not a mobile device.
  if (xDown == null) {
    $(".quadbutton").addClass("quadNotMobile");

    // If the mouse has actually moved.
    if (event.clientX != lastMousePos.x || event.clientY != lastMousePos.y) {
      clearTimeout(mouseIdle);

      document.getElementsByTagName("html")[0].style.cursor = "";
      $("#progressbar").removeClass("mouse-idle");
      $("#menubutton").removeClass("mouse-idle");
      $(".controlsleft").children().removeClass("mouse-idle");
      $(".controlsright").children().removeClass("mouse-idle");

      // If the menu is not open.
      if (document.getElementById("site-menu").hasAttribute("hidden")) {
        mouseIdle = setTimeout(function() {
          $("#progressbar").addClass("mouse-idle");
          $("#menubutton").addClass("mouse-idle");
          $(".controlsleft").children().addClass("mouse-idle");
          $(".controlsright").children().addClass("mouse-idle");
          document.getElementsByTagName("html")[0].style.cursor = "none";
        }, 3000);
      }

      lastMousePos = {"x":event.clientX,"y":event.clientY};
    }
  }
}

// get shuffled list of videos with current video first
function getVideolist() {
  tooltip("Loading...", "bottom: 50%; left: 50%; bottom: calc(50% - 16.5px); left: calc(50% - 46.5px); null");

  $.ajaxSetup({async: false});
  $.getJSON("api/list.php?eggs&shuffle&first=" + Videos.list[Videos.video].file, json => Videos.list = json);
  $.ajaxSetup({async: true});

  tooltip();
}

function getNewVideo() {
  if (Videos.list.length <= 1) {
    getVideolist();
    Videos.video = 1;
  } else ++Videos.video;

  // just in case
  if (Videos.list.length == 0) return;
  if (Videos.video >= Videos.list.length) Videos.video = 0;

  // When the end of the list is reached, go back to the beginning. Only do this once per function call.
  for (var start = Videos.video, end = Videos.list.length, counter = 2; counter > 0; --counter) {
    // get a new video until it isn't an ending
    if (videoType == "op")
      while (Videos.video < end && Videos.list[Videos.video].file.slice(0,6) == "Ending")
        ++Videos.video;
    // get a new video until it isn't an opening
    else if (videoType == "ed")
      while (Videos.video < end && Videos.list[Videos.video].file.slice(0,7) == "Opening")
        ++Videos.video;
    // get a new video until it is an Easter Egg
    else if (videoType == "egg")
      while (Videos.video < end && !Videos.list[Videos.video].egg)
        ++Videos.video;

    if (Videos.video >= end) {
      Videos.video = 0;
      end = start
    } else break;
  }

  setVideoElements();

  if (document.title == "Secret~") history.pushState(Object.assign({egg: true}, Videos), document.title, location.origin + location.pathname);
  else history.pushState(Videos, document.title, location.origin + location.pathname + "?video=" + filename());

  subtitles.reset();
  VideoElement.play();
  document.getElementById("pause-button").classList.remove("fa-play");
  document.getElementById("pause-button").classList.add("fa-pause");
}

function setVideoElements() {
  function videoMIMEsubtype(filename) {
    filename = filename.replace(filename.replace(/\.\w+$/, ""), "");
      switch (filename) {
        case ".mp4":
        case ".m4v":
          return "mp4";
        case ".ogg":
        case ".ogm":
        case ".ogv":
          return "ogg";
        case ".webm":
          return "webm";
        default:
          return "*";
      }
  }

  const video = Videos.list[Videos.video];

  document.getElementsByTagName("source")[0].src = "video/" + video.file;
  document.getElementsByTagName("source")[0].type = "video/" + videoMIMEsubtype(video.file);
  VideoElement.load();
  document.getElementById("subtitle-attribution").innerHTML = (video.subtitles ? "[" + video.subtitles + "]" : "");
  document.getElementById("title").innerHTML = video.title;
  document.getElementById("source").innerHTML = "From " + video.source;
  if (video.egg) {
    document.title = "Secret~";
    document.getElementById("videolink").parentNode.setAttribute("hidden","");
    document.getElementById("videodownload").parentNode.setAttribute("hidden","");
  } else {
    document.title = video.title + " from " + video.source;
    document.getElementById("videolink").parentNode.removeAttribute("hidden");
    document.getElementById("videodownload").parentNode.removeAttribute("hidden");
    document.getElementById("videolink").href = "/?video=" + video.file.replace(/\.\w+$/, "");
    document.getElementById("videodownload").href = "video/" + video.file;
  }

  var song = "";
  if (video.song) song = "Song: &quot;" + video.song.title + "&quot; by " + video.song.artist;
  else if (video.egg || (Math.random() <= 0.01)) song = "Song: &quot;Sandstorm&quot; by Darude";
  document.getElementById("song").innerHTML = song;

  // Set button to show play icon.
  $("#pause-button").removeClass("fa-pause").addClass("fa-play");

  if (localStorage["title-popup"] && JSON.parse(localStorage["title-popup"])) showVideoTitle(localStorage["title-popup-delay"]);
}

// Menu Visibility Functions
function menuIsHidden() {
  return document.getElementById("site-menu").hasAttribute("hidden");
}
function showMenu() {
  if (xDown != null) tooltip(); // Hide the tooltip on mobile.
  clearTimeout(mouseIdle); // Stop things from being hidden on idle.
  $("#menubutton").hide();
  document.getElementById("site-menu").removeAttribute("hidden");
}
function hideMenu() {
  if (xDown != null) tooltip(); // Hide the tooltip on mobile.
  $("#menubutton").show();
  document.getElementById("site-menu").setAttribute("hidden", "");
}
function toggleMenu() {
  if (menuIsHidden()) showMenu();
  else hideMenu();
}

// Play/Pause Button
function playPause() {
  var button = document.getElementById("pause-button");

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
    const e = document.getElementsByTagName("html")[0];
    if (e.requestFullscreen) e.requestFullscreen();
    else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen();
    else if (e.mozRequestFullScreen) e.mozRequestFullScreen();
    else if (e.msRequestFullscreen) e.msRequestFullscreen();
  }

  // Update Tooltip
  if (Tooltip.Showing == "fullscreen-button") tooltip("fullscreen-button");
}
function aniopFullscreenChange() {
  var button = document.getElementById("fullscreen-button");

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
    $("#autonext").removeClass("fa-toggle-off").addClass("fa-toggle-on");
    VideoElement.removeAttribute("loop");
  } else {
    $("#autonext").removeClass("fa-toggle-on").addClass("fa-toggle-off");
    VideoElement.setAttribute("loop", "");
  }

  localStorage["autonext"] = autonext;
  $("input[name=autonext]").val([autonext]);

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
  var element = document.getElementById("videoTypeToggle");
  element.classList.remove("fa-adjust");
  element.classList.remove("fa-circle");
  element.classList.remove("fa-circle-o");
  element.classList.remove("fa-flip-horizontal");
  if (videoType == "all") element.classList.add("fa-circle");
  else if (videoType == "op") element.classList.add("fa-adjust", "fa-flip-horizontal");
  else if (videoType == "ed") element.classList.add("fa-adjust");
  else if (videoType == "egg") element.classList.add("fa-circle-o");

  // change what's set in the settings
  $("input[name=videoType]").val([videoType]);

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
      if (subtitles.on()) text = "Click to disable subtitles (S)";
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
  var currVideo = Videos.list[Videos.video];
  $("#title-popup").stop(true).text(currVideo.title + " from " + currVideo.source).delay(1000 * delay).fadeIn().promise().done(function(){this.delay(3500).fadeOut()});
}

// Keyboard functions
$(document).keydown(function(e) {
  if (e.altKey || e.ctrlKey) return;
  const kc = konamicheck(e.which);
  switch(e.which) {
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
});

function konamicheck(k) {
  keylog.push(k);
  if (konamicode.slice(0, keylog.length).toString() !== keylog.toString()) {
    keylog = [];
    return false;
  } else return true;
}

/* Konami Code For jQuery Plugin
   1.3.0, 7 March 2014

   Using the Konami code, easily configure an Easter Egg for your page or any element on the page.

   Copyright 2011 - 2014 Tom McFarlin, http://tommcfarlin.com
   Released under the MIT License.
*/
(function($) {
  "use strict";

  $.fn.konami = function(options) {
    var opts = $.extend({}, $.fn.konami.defaults, options);
    var controllerCode = [];

    // note that we use the passed-in options, not the resolved options
    opts.eventProperties = $.extend({}, options,  opts.eventProperties);

    this.keyup(function(evt) {
      const code = evt.keyCode || evt.which;

      if (opts.code.length > controllerCode.push(code))
        return;

      if (opts.code.length < controllerCode.length)
        controllerCode.shift();

      if (opts.code.toString() !== controllerCode.toString())
        return;

      opts.cheat(evt, opts);
    });

    return this;
  };

  $.fn.konami.defaults = {
    code: [38,38,40,40,37,39,37,39,66,65],
    eventName: "konami",
    eventProperties: null,
    cheat: function(evt, opts) {
      $(evt.target).trigger(opts.eventName, [opts.eventProperties]);
    }
  };
}( jQuery ));

// The Konami Code Easter Egg
$(window).konami({
  cheat: function() {
    isKonaming = !isKonaming;

    $("#menubutton").toggleClass("fa-spin");
    $("#videoTypeToggle").toggleClass("fa-spin");
    $("#wrapper").toggleClass("fa-spin");
    $("#getnewvideo").toggleClass("fa-spin");
    $("#autonext").toggleClass("fa-spin");
    $("#subtitles-button").toggleClass("fa-spin");
    $("#skip-left").toggleClass("fa-spin");
    $("#skip-right").toggleClass("fa-spin");
    $("#pause-button").toggleClass("fa-spin");
    $("#fullscreen-button").toggleClass("fa-spin");

    keylog = [];

    if (isKonaming) changeVideoType("egg");
  }
});

// checks if an event is supported
function isEventSupported(eventName) {
  const el = document.createElement("div");
  eventName = "on" + eventName;
  var isSupported = (eventName in el);

  if (!isSupported) {
    el.setAttribute(eventName, "return;");
    isSupported = typeof el[eventName] === "function";
  }

  return isSupported;
}

// change volume
function changeVolume(amount) {
  amount |= 0;

  if (amount < 0) amount = 0;
  else if (amount > 100) amount = 100;

  VideoElement.volume = (amount / 100).toPrecision(2);

  displayTopRight(amount + "%");
  document.getElementById("volume-amount").innerHTML = amount + "%";
  document.getElementById("volume-slider").value = amount;
  localStorage[location.pathname+"volume"] = amount;
}

// display text in the top right of the screen
function displayTopRight(text,delay) {
  const disp = $(".displayTopRight");
  disp.stop(true,true);
  disp.text(text);
  disp.show();
  disp.delay(delay?delay:0).fadeOut(1000);
}

// set video progress bar buffered length
function updateprogress() {
  const buffered = ((VideoElement.buffered && VideoElement.buffered.length) ? 100 * (VideoElement.buffered.end(0) / VideoElement.duration) : (VideoElement.readyState == 4 ? 100 : 0)); // calculate buffered data in percent
  document.getElementById("bufferprogress").style.width = buffered + "%"; // update progress bar width
}

// set video progress bar played length
function updateplaytime() {
  const watched = 100 * (VideoElement.currentTime / VideoElement.duration); // calculate current time in percent
  document.getElementById("timeprogress").style.width = watched + "%"; // update progress bar width
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
      $(".progress").height(2);
    } else {
      /* down swipe */
      $(".progress").height(15);
    }
  }

  // reset values
  xDown = null;
  yDown = null;
}

// Subtitle Funtions
var subtitles = {
  attribution: () => document.getElementById("subtitle-attribution").textContent,
  available: () => Boolean(Videos.list[Videos.video].subtitles),
  on: () => Boolean(VideoElement.subtitles),
  reset: function() {
    if (subtitles.available()) {
      $("#subtitles-button").show();
      $("#subs").show();
      var temp = document.getElementById("wrapper").children;
      if (subtitles.on()) subtitles.init(temp[0], temp[1], subtitlePath());
    } else {
      $("#subtitles-button").hide();
      $("#subs").hide();
      if (subtitles.on()) {
        subtitles.remove(VideoElement);
        VideoElement.subtitles = true; // flag that subtitles are toggled on
      }
    }
  },
  toggle: function() {
    var enabled = subtitles.on();

    if (subtitles.available()) {
      if (enabled) {
        $("#subtitles-button").addClass("fa-commenting-o").removeClass("fa-commenting");
        subtitles.remove(VideoElement);
        displayTopRight("Disabled Subtitles", 1000);
      } else {
        $("#subtitles-button").addClass("fa-commenting").removeClass("fa-commenting-o");
        var temp = document.getElementById("wrapper").children;
        subtitles.init(temp[0], temp[1], subtitlePath());
        displayTopRight("Enabled Subtitles by " + subtitles.attribution(), 3000);
      }
      if (Tooltip.Showing == "subtitles-button") tooltip("subtitles-button");
    }

    localStorage["subtitles-enabled"] = !enabled;
    document.getElementById("subtitle-checkbox").checked = !enabled;
  },
  init: function(subContainer, videoElem, subFile) {
    subtitles.remove(videoElem);
    videoElem.subtitles = new subtitleRenderer(subContainer, videoElem, subFile);
  },
  remove: function(videoElem) {
    if (subtitles.on() && videoElem.subtitles.shutItDown) {
      videoElem.subtitles.shutItDown();
      videoElem.subtitles = null;
    }
  }
};

// Video List Modal
var listModal = {
  open: function(e) {
    if (e.ctrlKey || e.shiftKey || e.metaKey || (e.button && e.button == 1))
      return;

    var modal = document.getElementById("modal");
    modal.firstElementChild.src = "list/?s=" + Videos.list[Videos.video].source;
    modal.style.display = "block";

    e.preventDefault();
  },
  close: function() {
    document.getElementById("modal").style.display = "none";
  }
};
