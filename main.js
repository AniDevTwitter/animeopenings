/* Contributors:
   Howl - Video Autoplay
   Yurifag_ ( https://twitter.com/Yurifag_/ ) - Video Progress Bar
   trac - Video Progress Bar Seeking
   Tom McFarlin ( http://tommcfarlin.com ) - Konami Code
   Yay295 - Consolidating this Mess
   givanse ( http://stackoverflow.com/a/23230280 ) - Mobile Swipe Detection
*/

// Global Variables
var isKonaming = false;
const konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];
var video_obj = [];
var autonext = false;
var xDown = null, yDown = null;

if (video_obj == "") {
  $.getJSON("api/list.php", function(json) {
    video_obj = shuffle(json);
    i = 0;
  });
}

window.onload = function() {
  const video = document.getElementById("bgvid");

  // Progress bar event listeners
  if (video.buffered.end(0) / video.duration * 100 != 100) // if video not cached
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
    // because doubles are shit in javascript have to round
    if (delta > 0) // Scrolled down
      changeVolume(-0.05);
    else if (delta < 0) // Scrolled up
      changeVolume(0.05);
  });
}

function shuffle(o) {
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function retrieveNewVideo() {
  if(video_obj.length == i) {
    $.getJSON("api/list.php", function(json) {
      video_obj = shuffle(json);
      i = 0;
    });
  }

  playvideo(video_obj[i++])

  function playvideo(video) {
    $("source").attr("src", "video/" + video.file);
    document.getElementById("bgvid").load();
    $("#title").html(video["title"]);
    $("#source").html("From " + video["source"]);
    $("[id=videolink]") .attr("href", "/?video=" + video["file"]);
    if (video["title"] == "???")
      $("title").html("Secret~");
    else
      $("title").html(video["title"] + " From " + video["source"]);
  }

  // Reset URL
  window.history.pushState(null, null, "/");
  // Set button to show pause icon.
  $("#pause-button").removeClass("fa-play").addClass("fa-pause");
}

// Show the Menu
function showMenu() {
  document.getElementById("menubutton").setAttribute("hidden", "");
  document.getElementById("site-menu").removeAttribute("hidden");
}

// Hide the Menu
function hideMenu() {
  document.getElementById("menubutton").removeAttribute("hidden");
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

// Autoplay by Howl
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
  tooltip("autonext", "left");
}
function onend() {
  if (autonext) retrieveNewVideo();
}

// Slightly better shitty tooltip code
function tooltip(value, location) {
  var text; // to display

  value = (typeof value !== "undefined" ? value : "");

  switch (value) {
    case "getnewvideo":
      text = "Click to get a new video";
      break;
    case "autonext":
      if (autonext) text = "Click to loop video instead of getting a new one";
      else text = "Click to get a new video instead of looping";
      break;
    case "skip-left":
      text = "Click to go back 10 seconds";
      break;
    case "skip-right":
      text = "Click to go forward 10 seconds";
      break;
    case "pause-button":
      if (!document.getElementById("bgvid").paused) text = "Click to pause the video";
      else text = "Click to play the video";
      break;
    default:
      text = value;
  }

  var element = document.getElementById("tooltip");
  element.removeAttribute("style");
  element.setAttribute("style", location + ": 10px");
  element.innerText = text;
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
    $("#bgvid").toggleClass("fa-spin");
    $("#getnewvideo").toggleClass("fa-spin");
    $("#autonext").toggleClass("fa-spin");
    $("#skip-left").toggleClass("fa-spin");
    $("#skip-right").toggleClass("fa-spin");
    $("#pause-button").toggleClass("fa-spin");

    keylog = []
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
        elements[i].style.height = "10px";
    }
  }

  // reset values
  xDown = null;
  yDown = null;
}
