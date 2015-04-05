// Shit menu button script
function showMenu() {
  document.getElementById("site-menu").className = "";
  document.getElementById("site-menu").className = "is-visible";
  document.getElementById("menubutton").className = "";
  document.getElementById("menubutton").className = "fa fa-bars quadbutton is-hidden";
}
function hideMenu() {
  document.getElementById("site-menu").className = "";
  document.getElementById("site-menu").className = "is-hidden";
  document.getElementById("menubutton").className = "";
  document.getElementById("menubutton").className = "fa fa-bars quadbutton";
}

// Shit play/Pause button
function playPause() {
  var mediaPlayer = document.getElementById('bgvid');
  if (mediaPlayer.paused) {
    mediaPlayer.play();
    document.getElementById("pause-button").className = "";
    document.getElementById("pause-button").className = "fa fa-pause quadbutton";
  } else {
    mediaPlayer.pause();
    document.getElementById("pause-button").className = "";
    document.getElementById("pause-button").className = "fa fa-play quadbutton";
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
    $('#autonext').attr('class', 'fa fa-toggle-on quadbutton');
    $('video').removeAttr('loop');
  } else {
    $('#autonext').attr('class', 'fa fa-toggle-off quadbutton');
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
      $('#source').html(data['videoname']['source']);
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
    $('#source').html(data['videoname']['source']);
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
