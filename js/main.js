// dem global vars
var isKonaming = false;
var konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];

function retrieveNewVideo() {
  $.getJSON('nextvideo.php?avoid=' + openingToAvoidNext, function(data) {
    console.log(data);
    // sets the video file name to the global var openingToAvoidNext
    openingToAvoidNext = data['videofname'];
    $('source').attr('src', data['videourl']);
    $('video')[0].load();
    $('#title').html(data['videoname']['title']);
    $('#source').html("From " + data['videoname']['source']);
    $('#videolink').attr('href', '/?video=' + data['videofname']);
    $('title').html(data['videoname']['title'] + " from " + data['videoname']['source']);
  });
}

// Show the menu
function showMenu() {
  if (isKonaming) { // ko class if konami code is active

    // TODO: replace all #site-menu etc... with global js vars to minify and increase readability
    $("#site-menu").attr("class", "is-visible ko fa-spin");
  }
  else { // regular classes otherwise
    $("#site-menu").attr("class", "is-visible ko");
  }
  // Hide the menu button
  $("#menubutton").attr("class", "fa fa-bars quadbutton is-hidden");
}

// Hide the menu
function hideMenu() {
  if (isKonaming) { // ko class if konami code is active
    $("#site-menu").attr("class", "is-hidden ko fa-spin");
  }
  else { // regular classes otherwise
    $("#site-menu").attr("class", "is-hidden ko");
  }
  // Hide button
  $("#menubutton").attr("class", "fa fa-bars quadbutton ko");
}

// Shit play/Pause button
function playPause() {
  // Set media player variable
  var video = $('#bgvid')[0];

  // If video is paused
  if (video.paused) {
    video.play(); // Play video
    if (isKonaming) { // Konami class
      $("#pause-button").attr("class", "fa fa-pause quadbutton ko fa-spin");
    }
    else { // Regular class
      $("#pause-button").attr("class", "fa fa-pause quadbutton ko");
    }
  }
  // Otherwise
  else {
    video.pause(); // Pause the video
    if (isKonaming) { // Konami classes
      $("#pause-button").attr("class", "fa fa-play quadbutton ko fa-spin");
    } else { // Regular classes
      $("#pause-button").attr("class", "fa fa-play quadbutton ko");
    }
  }
}


// Lazy seeking funtion that might get implemented in the future
function skip(value) {
  // Retrieves the video's DOM object, and then adds to the current position in time the value
  // given by the function parameters.
  $("#bgvid")[0].currentTime += value;
}

// Autoplay by Howl
var autonext = false;
var toggleAutonext = function() {
  autonext = !autonext;
  if (autonext) {
    if (isKonaming) {
      $('#autonext').attr('class', 'fa fa-toggle-on quadbutton ko fa-spin');
    }
    else {
      $('#autonext').attr('class', 'fa fa-toggle-on quadbutton ko');
    }
    $('video').removeAttr('loop');
  } else {
    if (isKonaming) {
      $('#autonext').attr('class', 'fa fa-toggle-off quadbutton ko fa-spin');
    }
    else {
      $('#autonext').attr('class', 'fa fa-toggle-off quadbutton ko');
    }
    $('video').attr('loop', '');
  }
}
var onend = function() {
  if (autonext)
    retrieveNewVideo();
};

// Shitty tooltip code
function tooltip(value) {
  value = typeof value !== "undefined" ? value : "";
  $("#tooltip").html(value).toggleClass("is-hidden").toggleClass("is-visible");
}

// Keyboard functions
$(document).keydown(function(e) {
    switch(e.which) {
        case 32: // Space
          konamicheck(32);
          playPause();
          break;
        case 37: // Left Arrow
          if(!konamicheck(37)){
            skip(-10);
          }
          break;
        case 39: // Right Arrow
          if(!konamicheck(39)){
            skip(10);
          }
          break;
        case 78: // N
          konamicheck(78);
          retrieveNewVideo();
          break;
        default:
          konamicheck(e.which);
          return;
    }
    e.preventDefault();
});

function konamicheck(k)
{
  keylog.push(k);
  var konamisplice = konamicode.slice(0, keylog.length);
  if(konamisplice.toString() !== keylog.toString()){
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
    var opts, controllerCode;

    opts = $.extend({}, $.fn.konami.defaults, options);
    controllerCode = [];

    // note that we use the passed-in options, not the resolved options
    opts.eventProperties = $.extend({}, options,  opts.eventProperties);

    this.keyup(function( evt ) {
      var code = evt.keyCode || evt.which;

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

// le konami code easter egg
// why fa-spin? because lazy

$(window).konami({
  cheat: function() {
    isKonaming = !isKonaming;
    $('.ko').toggleClass('fa-spin');
  }
});

// checks if an event is supported
function isEventSupported(eventName) {
    var el = document.createElement('div');
    eventName = 'on' + eventName;
    var isSupported = (eventName in el);
    if (!isSupported) {
        el.setAttribute(eventName, 'return;');
        isSupported = typeof el[eventName] == 'function';
    }
    el = null;
    return isSupported;
}

//we volume nows
$(document).ready(function(){
  var wheelEvent = isEventSupported('mousewheel') ? 'mousewheel' : 'wheel';
  // Mouse wheel functions
  $(document).on(wheelEvent, function(e) {
    var oEvent = e.originalEvent,
      delta  = oEvent.deltaY || oEvent.wheelDelta;
    var vid = document.getElementById('bgvid');
    //because doubles are shit in javascript have to round
    if (delta > 0 && vid.volume > 0) { // Scrolled down
      var volume = vid.volume - 0.05;
      vid.volume = volume.toPrecision(2)
    }
    else if (delta < 0 && vid.volume < 1){ // Scrolled up
      var volume = vid.volume + 0.05;
      vid.volume = volume.toPrecision(2)
    }
    console.log('Volume changed to: ' + vid.volume);
  });
})
