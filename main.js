// dem global vars
var isKonaming = false;
var shiftDown = false;

// Shit menu button script
function showMenu() {
  document.getElementById("site-menu").className = "";
  if (isKonaming) {
    document.getElementById("site-menu").className = "is-visible ko fa-spin";
  }
  else {
    document.getElementById("site-menu").className = "is-visible ko";
  }
  document.getElementById("menubutton").className = "";
  document.getElementById("menubutton").className = "fa fa-bars quadbutton is-hidden";
}
function hideMenu() {
  document.getElementById("site-menu").className = "";
  if (isKonaming) {
    document.getElementById("site-menu").className = "is-hidden ko fa-spin";
  }
  else {
    document.getElementById("site-menu").className = "is-hidden ko";
  }
  document.getElementById("menubutton").className = "";
  document.getElementById("menubutton").className = "fa fa-bars quadbutton ko";
}

// Shit play/Pause button
function playPause() {
  var mediaPlayer = document.getElementById('bgvid');
  if (mediaPlayer.paused) {
    mediaPlayer.play();
    document.getElementById("pause-button").className = "";
    if (isKonaming) {
      document.getElementById("pause-button").className = "fa fa-pause quadbutton ko fa-spin";
    }
    else {
      document.getElementById("pause-button").className = "fa fa-pause quadbutton ko";
    }
  } else {
    mediaPlayer.pause();
    document.getElementById("pause-button").className = "";
    if (isKonaming) {
      document.getElementById("pause-button").className = "fa fa-play quadbutton ko fa-spin";
    }
    else {
      document.getElementById("pause-button").className = "fa fa-play quadbutton ko";
    }
  }
}


// Lazy seeking funtion that might get implemented in the future
function skip(value) {
  var video = document.getElementById("bgvid");
  video.currentTime += value;
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
  if (autonext) {
    $.getJSON('nextvideo.php', function(data) {
      console.log(data);
      var videourl = data['videourl'];
      $('source').attr('src', videourl);
      $('video')[0].load();
      $('#title').html(data['videoname']['title']);
      $('#source').html("From " + data['videoname']['source']);
      $('#videolink').attr('href', 'http://animeopenings.tk/?video=' + data['videofname']);
    });
  }
};


// Lazy mod of Howl's code

var newvideo = function() {
  $.getJSON('nextvideo.php', function(data) {
    console.log(data);
    var videourl = data['videourl'];
    $('source').attr('src', videourl);
    $('video')[0].load();
    $('#title').html(data['videoname']['title']);
    $('#source').html("From " + data['videoname']['source']);
    $('#videolink').attr('href', 'http://animeopenings.tk/?video=' + data['videofname']);
  });
};

// Shitty tooltip code
function showTooltip(content) {
  document.getElementById("tooltip").className = "is-visible";
  document.getElementById('tooltip').innerHTML = content;
}

function hideTooltip() {
  document.getElementById("tooltip").className = "is-hidden";
}

// Keybinds window

function showKeybinds() {
  if(!($("#keybinds").hasClass("modal-visible"))) {
    $("#keybinds").addClass("modal-visible");
  }
}

function closeKeybinds() {
  if($("#keybinds").hasClass("modal-visible")) {
    $("keybinds").removeClass("modal-visible");
  }
}

// Keyboard functions

$(document).keydown(function(e) {
    switch(e.which) {
        case 16: // Shift
          shiftDown = true;
          break;
        case 27: // Escape
          closeKeybinds();
          break;
        case 32: // Space
          playPause();
          break;
        case 37: // Left Arrow
          skip(-10);
          break;
        case 39: // Right Arrow
          skip(10);
          break;
        case 78: // N
          newvideo();
          break;
        case 191: // / (slash)
          if (shiftDown) {
            showKeybinds();
          }
          break;
        default: return;
    }
    e.preventDefault();
});

$(document).keydown(function(e) {
  if (e.which == 16) {
    shiftDown = false;
  }
});

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
// why fa-spin? Because it saves bandwith by not creating an identical class with the same stuff!!!
// (aka: i'm lazy)
// --howl

$(window).konami({
  cheat: function() {
    isKonaming = !isKonaming;
    $('.ko').toggleClass('fa-spin');
  }
});
