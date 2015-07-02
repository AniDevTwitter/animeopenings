// dem global vars
var isKonaming = false;
const konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];
var video_obj = [];
if (video_obj == "") {
  $.getJSON('api/list.php', function(json) {
    video_obj = shuffle(json);
    i = 0;
  });
}

function shuffle(o) {
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
}

function retrieveNewVideo() {
  if(video_obj.length == i) {
    $.getJSON('api/list.php', function(json){
      video_obj = shuffle(json);
      i = 0;
    });
  }
  playvideo(video_obj[i++])

  function playvideo(video) {
    $('source').attr('src', "video/" + video.file);
    $('video')[0].load();
    $('#title').html(video['title']);
    $('#source').html("From " + video['source']);
    $("[id=videolink]") .attr('href', '/?video=' + video['file']);
    if(video['title'] == "???") {
      $('title').html("Secret~");
    } else {
      $('title').html(video['title'] + " From " + video['source']);
    }
  }

  // Reset URL
  window.history.pushState(null, null, '/');
  // Set button to show pause icon.
  $("#pause-button").removeClass("fa-play").addClass("fa-pause");
}

// Show the Menu
function showMenu() {
  $("#menubutton").removeClass("is-visible").addClass("is-hidden");
  $("#site-menu").removeClass("is-hidden").addClass("is-visible");
}

// Hide the Menu
function hideMenu() {
  $("#menubutton").removeClass("is-hidden").addClass("is-visible");
  $("#site-menu").removeClass("is-visible").addClass("is-hidden");
}

// Play/Pause Button
function playPause() {
  // Set media player constant.
  const video = $('#bgvid')[0];

  // If video is paused, play it.
  if (video.paused) video.play();
  // Else if video is playing, pause it.
  else video.pause();

  // Toggle Play/Pause Icon
  $("#pause-button").toggleClass("fa-play").toggleClass("fa-pause");
}

// Video Seek Function
function skip(value) {
  // Retrieves the video's DOM object, and then adds to the current
  // position in time the value given by the function parameters.
  $("#bgvid")[0].currentTime += value;
}

// Autoplay by Howl
var autonext = false;
function toggleAutonext() {
  autonext = !autonext;
  if (autonext) {
    $('#autonext').removeClass('fa-toggle-off').addClass('fa-toggle-on');
    $('video').removeAttr('loop');
  } else {
    $('#autonext').removeClass('fa-toggle-on').addClass('fa-toggle-off');
    $('video').attr('loop', '');
  }
}
function onend() {
  if (autonext)
    retrieveNewVideo();
};

// Shitty tooltip code
function tooltip(value) {
  value = (typeof value !== "undefined" ? value : "");
  $("#tooltip").html(value).toggleClass("is-hidden").toggleClass("is-visible");
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

function konamicheck(k)
{
  keylog.push(k);
  const konamislice = konamicode.slice(0, keylog.length);
  if(konamislice.toString() !== keylog.toString()){
    keylog = [];
    return false;
  }
  else{
    return true;
  }
}

/*
 * Konami Code For jQuery Plugin
 * 1.3.0, 7 March 2014
 *
 * Using the Konami code, easily configure and Easter Egg for your page or any element on the page.
 *
 * Copyright 2011 - 2014 Tom McFarlin, http://tommcfarlin.com
 * Released under the MIT License
 */
(function ( $ ) {
  "use strict";

  $.fn.konami = function( options ) {
    var opts = $.extend({}, $.fn.konami.defaults, options);
    var controllerCode = [];

    // note that we use the passed-in options, not the resolved options
    opts.eventProperties = $.extend({}, options,  opts.eventProperties);

    this.keyup(function( evt ) {
      const code = evt.keyCode || evt.which;

      if ( opts.code.length > controllerCode.push( code ) ) {
        return;
      } // end if

      if ( opts.code.length < controllerCode.length ) {
        controllerCode.shift();
      } // end if

      if ( opts.code.toString() !== controllerCode.toString() ) {
        return;
      } // end if

      opts.cheat(evt, opts);

    }); // end keyup

    return this;
  }; // end opts

  $.fn.konami.defaults = {
    code : [38,38,40,40,37,39,37,39,66,65],
    eventName : 'konami',
    eventProperties : null,
    cheat: function(evt, opts) {
      $(evt.target).trigger(opts.eventName, [ opts.eventProperties ]);
    }
  };
}( jQuery ));

// the konami code easter egg
$(window).konami({
  cheat: function() {
    isKonaming = !isKonaming;

    $('#menubutton').toggleClass('fa-spin');
    $('#bgvid').toggleClass('fa-spin');
    $('#getnewvideo').toggleClass('fa-spin');
    $('#autonext').toggleClass('fa-spin');
    $('#skip-left').toggleClass('fa-spin');
    $('#skip-right').toggleClass('fa-spin');
    $('#pause-button').toggleClass('fa-spin');

    keylog = []
  }
});

// checks if an event is supported
function isEventSupported(eventName) {
  const el = document.createElement('div');
  eventName = 'on' + eventName;
  var isSupported = (eventName in el);

  if (!isSupported) {
    el.setAttribute(eventName, 'return;');
    isSupported = typeof el[eventName] == 'function';
  }

  return isSupported;
}

function changeVolume(amount)
{
  const video = $('#bgvid')[0];
  if (video.volume > 0 && amount < 0){
    video.volume = (video.volume + amount).toPrecision(2);
  }
  else if (video.volume < 1 && amount > 0){
    video.volume = (video.volume + amount).toPrecision(2);
  }
  const volume = $('.volume');
  var percent = (video.volume * 100);
  if (video.volume < 0.1){
    percent = percent.toPrecision(1);
  }
  else if (video.volume == 1){
    percent = percent.toPrecision(3);
  }
  else{
    percent = percent.toPrecision(2);
  }
  volume.stop(true, true);
  volume.text(percent + "%");
  volume.show();
  volume.fadeOut(1000);
}

//we volume nows
$(document).ready(function(){
  const wheelEvent = isEventSupported('mousewheel') ? 'mousewheel' : 'wheel';
  // Mouse wheel functions
  $(document).on(wheelEvent, function(e){
    const oEvent = e.originalEvent;
    const delta  = oEvent.deltaY || oEvent.wheelDelta;
    //because doubles are shit in javascript have to round
    if (delta > 0) { // Scrolled down
      changeVolume(-0.05);
    }
    else if (delta < 0) { // Scrolled up
      changeVolume(0.05);
    }
  });
  //progress bar seeking (base code courtesy of trac)
  $(document).mousemove(function(e){
    if (e.pageY <= 20) {
      $("#progressbar").height('10px');
      $("#bufferprogress").height('10px');
      $("#timeprogress").height('10px');
    }
    else {
      $("#progressbar").height('2px');
      $("#bufferprogress").height('2px');
      $("#timeprogress").height('2px');
    }
  });
  $(document).on('click', '#progressbar', function(e){
    const percentage = e.pageX / $(document).width();
    const vid = $("#bgvid")[0];
    vid.currentTime = vid.duration * percentage;
  });
});
