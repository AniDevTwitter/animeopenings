// dem global vars
var isKonaming = false;
var konamicode = [38,38,40,40,37,39,37,39,66,65];
var keylog = [];
var video_obj = [];

function retrieveNewVideo() {
  $.getJSON('api/list.php', function(data) {
    function shuffle(o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
}
if (video_obj == "") {
     video_obj = shuffle(data);
     i = 0;
}
var video = video_obj[i++];

  $('source').attr('src', "video/" + video.file);
  $('video')[0].load();
  $('#title').html(video['title']);
   $('#source').html("From " + video['source']);
    $('#videolink').attr('href', '/?video=' + video['file']);
    if(video['title'] == "???") {
        $('title').html("Secret~");
    } else {
        $('title').html(video['title'] + "From" + video['source']);
    }
// Reset URL
    window.history.pushState(null, null, '/');
    // Set button to pause
    if (isKonaming) { // Konami class
      $("#pause-button").attr("class", "fa fa-pause quadbutton ko fa-spin");
    }
    else { // Regular class
      $("#pause-button").attr("class", "fa fa-pause quadbutton ko");
    }
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
    var kc = konamicheck(e.which);
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
          if(!kc){
            skip(-10);
          }
          break;
        case 39: // Right Arrow
          if(!kc){
            skip(10);
          }
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
  var konamislice = konamicode.slice(0, keylog.length);
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
    keylog = []
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

function changeVolume(amount)
{
  var video = $('#bgvid')[0];
  if (video.volume > 0 && amount < 0){
    video.volume = (video.volume + amount).toPrecision(2);
  }
  else if (video.volume < 1 && amount > 0){
    video.volume = (video.volume + amount).toPrecision(2);
  }
  var volume = $('.volume');
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
  console.log('Volume changed to: ' + video.volume);
}

//we volume nows
$(document).ready(function(){
  var wheelEvent = isEventSupported('mousewheel') ? 'mousewheel' : 'wheel';
  // Mouse wheel functions
  $(document).on(wheelEvent, function(e) {
    var oEvent = e.originalEvent,
      delta  = oEvent.deltaY || oEvent.wheelDelta;
    //because doubles are shit in javascript have to round
    if (delta > 0) { // Scrolled down
      changeVolume(-0.05);
    }
    else if (delta < 0){ // Scrolled up
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
    var percentage = e.pageX / $(document).width();
    var vid = $("#bgvid")[0];
    vid.currentTime = vid.duration * percentage;
  });
});
