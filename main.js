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
        document.getElementById("pause-button").className = "fa fa-pause pause-btn";
    } else {
        mediaPlayer.pause();
        document.getElementById("pause-button").className = "";
        document.getElementById("pause-button").className = "fa fa-play play-btn";
    }
}
