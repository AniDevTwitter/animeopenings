/* Contributors:
   Howl - Video Autonext
   Yurifag_ ( https://twitter.com/Yurifag_/ ) - Video Progress Bar
   trac - Video Progress Bar Seeking
   Tom McFarlin ( http://tommcfarlin.com ) - Konami Code
   Yay295 - Tooltip Function, Openings-Only Button, window.history, and Other Things
   givanse ( http://stackoverflow.com/a/23230280 ) - Mobile Swipe Detection
*/

// Global Variables
var isKonaming = false;
const konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];
var vNum = 0, video_obj = [];
var autonext = false;
var OPorED = "all"; // egg, op, ed, all
var xDown = null, yDown = null;

function filename() { return document.getElementsByTagName("source")[0].src.split("video/")[1]; }
function title() { return document.getElementById("title").innerHTML.trim(); }
function source() { return document.getElementById("source").innerHTML.trim().slice(5); }

window.onload = function() {
  if (document.title != "Secret~") { // Set document title
    if (title() != "???") document.title = title() + " from " + source();
    else document.title = "Secret~";
  }

  if (history.state == null) { // Set/Get history state
    if (document.title == "Secret~") history.replaceState({video: "Egg", list: []}, document.title);
    else history.replaceState({video: [{file: filename(), source: source(), title: title()}], list: []}, document.title);
  } else {
    popHist();
  }

  // Fix menu button. It is set in HTML to be a link to the FAQ page for anyone who has disabled JavaScript.
  document.getElementById("menubutton").outerHTML = '<span id="menubutton" class="quadbutton fa fa-bars" onclick="showMenu()" onmouseover="tooltip(this.id)" onmouseout="tooltip()"></span>';

  const video = document.getElementById("bgvid");
  
  // autoplay
  if (video.paused) playPause();

  /* The onended event does not fire if loop is set. We want it to fire, so we
  need to remove the loop attribute. We don't want to remove loop from the base
  html so that it does still loop for anyone who has disabled JavaScript. */
  video.removeAttribute("loop");

  // Progress bar event listeners
  video.addEventListener("progress", updateprogress); // on video loading progress
  video.addEventListener("timeupdate", updateplaytime); // on time progress

  // Progress bar seeking
  $(document).on("click", "#progressbar", function(e) {
    const percentage = e.pageX / $(document).width();
    skip((video.duration * percentage) - video.currentTime);
  });

  // event listeners for mobile swiping
  document.addEventListener("touchstart", handleTouchStart);
  document.addEventListener("touchmove", handleTouchMove);

  // Mouse wheel functions
  const wheelEvent = isEventSupported("wheel") ? "wheel" : "mousewheel";
  $(document).on(wheelEvent, function(e) {
    const oEvent = e.originalEvent;
    const delta  = oEvent.deltaY || oEvent.wheelDelta;
    if (delta > 0) // Scrolled down
      changeVolume(-0.05);
    else if (delta < 0) // Scrolled up
      changeVolume(0.05);
  });
}

window.onpopstate = popHist;
function popHist() {
  if (history.state.list == "") {
    if (history.state.video == "Egg") getVideolist();
    else {
      vNum = 0;
      video_obj = history.state.video;
    }
  } else {
    vNum = history.state.video;
    video_obj = history.state.list;
  }
  setVideoElements();
  playPause();
  ++vNum;
}

/* keep for future use
window.onunload = function() {
  history.replaceState(history.state, document.title, location.origin + location.pathname);
}*/

// get shuffled list of videos with current video first
function getVideolist() {
  document.getElementById("bgvid").setAttribute("hidden", "");
  tooltip("Loading...", "bottom: 50%; left: 50%; bottom: calc(50% - 16.5px); left: calc(50% - 46.5px); null");

  $.ajaxSetup({async: false});
  $.getJSON("api/list.php?eggs&shuffle&first=" + filename(), function(json) {
    video_obj = json;
    vNum = 1;
  });
  $.ajaxSetup({async: true});

  tooltip();
  document.getElementById("bgvid").removeAttribute("hidden");
}

function retrieveNewVideo() {
  if (video_obj.length <= 1) getVideolist();

  // just in case
  if (video_obj.length == 0) return;
  if (vNum >= video_obj.length) vNum = 0;

  // When the end of the list is reached, go back to the beginning. Only do this once per function call.
  for (var start = vNum, end = video_obj.length, counter = 2; counter > 0; --counter) {
    // get a new video until it isn't an ending
    if (OPorED == "op")
      while (vNum < end && video_obj[vNum].file.slice(0, 6) == "Ending")
        ++vNum;
    // get a new video until it isn't an opening
    else if (OPorED == "ed")
      while (vNum < end && video_obj[vNum].file.slice(0, 7) == "Opening")
        ++vNum;
    // get a new video until it is an Easter Egg
    else if (OPorED == "egg")
      while (vNum < end && video_obj[vNum].file.slice(0, 3) != "Egg")
        ++vNum;

    if (vNum >= end) {
      vNum = 0;
      end = start
    } else break;
  }

  setVideoElements();
  playPause();

  if (document.title == "Secret~") history.pushState({video: "Egg", list: []}, document.title);
  else history.pushState({video: vNum, list: video_obj}, document.title);

  ++vNum;
}

function setVideoElements() {
  const video = video_obj[vNum];

  document.getElementsByTagName("source")[0].src = "video/" + video.file;
  document.getElementById("bgvid").load();
  document.getElementById("title").innerHTML = video.title;
  document.getElementById("source").innerHTML = "From " + video.source;
  if (video.title == "???") {
    document.title = "Secret~";
    document.getElementById("videolink").parentNode.setAttribute("hidden", "");
    document.getElementById("videodownload").parentNode.setAttribute("hidden", "");
  } else {
    document.title = video.title + " from " + video.source;
    document.getElementById("videolink").parentNode.removeAttribute("hidden");
    document.getElementById("videodownload").parentNode.removeAttribute("hidden");
    document.getElementById("videolink").href = "/?video=" + video.file;
    document.getElementById("videodownload").href = "video/" + video.file;
  }

  // Set button to show play icon.
  $("#pause-button").removeClass("fa-pause").addClass("fa-play");
}

// Show the Menu
function showMenu() {
  document.getElementById("menubutton").setAttribute("style", "display: none");
  document.getElementById("site-menu").removeAttribute("hidden");
}

// Hide the Menu
function hideMenu() {
  document.getElementById("menubutton").removeAttribute("style");
  document.getElementById("site-menu").setAttribute("hidden", "");
}

// Play/Pause Button
function playPause() {
  // Set media player constant.
  const video = document.getElementById("bgvid");

  // If video is paused, play it.
  if (video.paused) video.play();
  // Else if video is playing, pause it.
  else video.pause();

  // Toggle Tooltip
  tooltip();
  tooltip("pause-button", "right");

  // Toggle Play/Pause Icon
  $("#pause-button").toggleClass("fa-play").toggleClass("fa-pause");
}

// Video Seek Function
function skip(value) {
  // Retrieves the video's DOM object, and then adds to the current
  // position in time the value given by the function parameters.
  const video = document.getElementById("bgvid");
  video.currentTime += value;

  // Calculates the current time in minutes and seconds.
  const minutes = Math.floor(video.currentTime / 60);
  const seconds = Math.floor(video.currentTime - (60 * minutes));

  // Displays the current time.
  displayTopRight(minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

// Autonext by Howl
function toggleAutonext() {
  autonext = !autonext;
  if (autonext) {
    $("#autonext").removeClass("fa-toggle-off").addClass("fa-toggle-on");
    document.getElementById("bgvid").removeAttribute("loop");
  } else {
    $("#autonext").removeClass("fa-toggle-on").addClass("fa-toggle-off");
    document.getElementById("bgvid").setAttribute("loop", "");
  }

  // Toggle Tooltip
  tooltip();
  tooltip("autonext");
}

// what to do when the video ends
function onend() {
  if (autonext || document.title == "Secret~") retrieveNewVideo();
  else document.getElementById("bgvid").play(); // loop
}

// OP/ED/All toggle
function toggleOpeningsOnly () {
  const element = document.getElementById("openingsonly");
  if (OPorED == "all") { // change from all to openings
    OPorED = "op";
    element.classList.remove("fa-circle");
    element.classList.add("fa-adjust");
    element.classList.add("fa-flip-horizontal");
  } else if (OPorED == "op") { // change from openings to endings
    OPorED = "ed";
    element.classList.remove("fa-flip-horizontal");
  } else { // change from egg or endings to all
    OPorED = "all";
    element.classList.remove("fa-circle-o");
    element.classList.remove("fa-adjust");
    element.classList.add("fa-circle");
  }

  tooltip();
  tooltip("openingsonly");
}

// Overused tooltip code
function tooltip(text, css) {
  switch (text) {
    case "menubutton":
      text = "Menu";
      css = "top: 65px; bottom: auto; left";
      break;
    case "openingsonly":
      if (OPorED == "all") text = "Click to only view openings";
      else if (OPorED == "op") text = "Click to only view endings";
      else text = "Click to view openings and endings";
      css = "left";
      break;
    case "getnewvideo":
      text = "Click to get a new video";
      css = "left";
      break;
    case "autonext":
      if (autonext) text = "Click to loop video instead of getting a new one";
      else text = "Click to get a new video instead of looping";
      css = "left";
      break;
    case "skip-left":
      text = "Click to go back 10 seconds";
      css = "right";
      break;
    case "skip-right":
      text = "Click to go forward 10 seconds";
      css = "right";
      break;
    case "pause-button":
      if (!document.getElementById("bgvid").paused) text = "Click to pause the video";
      else text = "Click to play the video";
      css = "right";
  }

  const element = document.getElementById("tooltip");
  element.removeAttribute("style");
  if (css != "") element.setAttribute("style", css + ": 10px;");
  element.innerHTML = text;
  element.classList.toggle("is-hidden");
  element.classList.toggle("is-visible");
}

// Keyboard functions
$(document).keydown(function(e) {
    const kc = konamicheck(e.which);
    switch(e.which) {
        case 32: // Space
          playPause();
          break;
        case 33: // Page Up
          changeVolume(0.05);
          break;
        case 34: // Page Down
          changeVolume(-0.05);
          break;
        case 37: // Left Arrow
          if(!kc) skip(-10);
          break;
        case 39: // Right Arrow
          if(!kc) skip(10);
          break;
        case 78: // N
          retrieveNewVideo();
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
  }
  else return true;
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
    code : [38,38,40,40,37,39,37,39,66,65],
    eventName : "konami",
    eventProperties : null,
    cheat: function(evt, opts) {
      $(evt.target).trigger(opts.eventName, [ opts.eventProperties ]);
    }
  };
}( jQuery ));

// The Konami Code Easter Egg
$(window).konami({
  cheat: function() {
    isKonaming = !isKonaming;

    $("#menubutton").toggleClass("fa-spin");
    $("#openingsonly").parent().toggleClass("fa-spin");
    $("#bgvid").toggleClass("fa-spin");
    $("#getnewvideo").toggleClass("fa-spin");
    $("#autonext").toggleClass("fa-spin");
    $("#skip-left").toggleClass("fa-spin");
    $("#skip-right").toggleClass("fa-spin");
    $("#pause-button").toggleClass("fa-spin");

    keylog = []

    if (isKonaming) {
      const element = document.getElementById("openingsonly");
      element.classList.remove("fa-circle");
      element.classList.remove("fa-adjust");
      element.classList.remove("fa-flip-horizontal");
      element.classList.add("fa-circle-o");
      OPorED = "egg";
    }
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
  const video = document.getElementById("bgvid");
  if (video.volume > 0 && amount < 0)
    video.volume = (video.volume + amount).toPrecision(2);
  else if (video.volume < 1 && amount > 0)
    video.volume = (video.volume + amount).toPrecision(2);

  var percent = (video.volume * 100);
  if (video.volume < 0.1)
    percent = percent.toPrecision(1);
  else if (video.volume == 1)
    percent = percent.toPrecision(3);
  else
    percent = percent.toPrecision(2);

  displayTopRight(percent + "%");
}

// display text in the top right of the screen
function displayTopRight(text) {
  const disp = $(".displayTopRight");
  disp.stop(true, true);
  disp.text(text);
  disp.show();
  disp.fadeOut(1000);
}

// set video progress bar buffered length
function updateprogress() {
  const video = document.getElementById("bgvid"); // get video element
  const buffered = 100 * (video.buffered.end(0) / video.duration); // calculate buffered data in percent
  document.getElementById("bufferprogress").style.width = buffered + "%"; // update progress bar width
}

// set video progress bar played length
function updateplaytime() {
  const video = document.getElementById("bgvid"); // get video element
  const watched = 100 * (video.currentTime / video.duration); // calculate current time in percent
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
    const elements = document.getElementsByClassName("progress");
    const num = elements.length;
    if (yDiff > 0) {
      /* up swipe */
      for (var i = 0; i < num; ++i)
        elements[i].style.height = "2px";
    } else {
      /* down swipe */
      for (var i = 0; i < num; ++i)
        elements[i].style.height = "15px";
    }
  }

  // reset values
  xDown = null;
  yDown = null;
}
