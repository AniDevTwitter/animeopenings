
// Huge thank you to https://twitter.com/Yurifag_/ for this script

var BUFFERPROGESS_COLOR = "#ccc";
var TIMEPROGRESS_COLOR = "#e65100";
//progress bar color constants

window.onload = function() { //when document is fully loaded

  //progress bar container
  var progressbar = document.body.appendChild(document.createElement("div")); //create div and append to body
  progressbar.id = "progressbar"; //set id
  progressbar.setAttribute("style", "position: fixed; top: 0; width: 100%; height: 2px"); //set CSS attributes

  /*
    Create progress bars for buffered data and current time.
    Current time progress will be displayed above buffer progress (position: absolute).
    Using CSS transition for smooth progress animation.
  */
  var bufferprogress = progressbar.appendChild(document.createElement("div")); //create div and append to progress bar container
  bufferprogress.id = "bufferprogress"; //set id
  bufferprogress.setAttribute("style", "position: absolute; top: 0; left: 0; width: 0%; height: 2px; background: " + BUFFERPROGESS_COLOR + "; transition: width 400ms linear"); //set CSS attributes

  var timeprogress = progressbar.appendChild(document.createElement("div")); //create div and append to progress bar container
  timeprogress.id = "timeprogress"; //set id
  timeprogress.setAttribute("style", "position: absolute; top: 0; left: 0; width: 0%; height: 2px; background: " + TIMEPROGRESS_COLOR + "; transition: width 400ms linear"); //set CSS attributes


  var video = document.getElementsByTagName("video")[0]; //get first video element on page
  if(video.buffered.end(0) / video.duration * 100 == 100) { //if video cached set buffer bar width to 100%
     bufferprogress.style.width = "100%";
  }
  else {
    video.addEventListener("progress", updateprogress); //on video loading progress
  }
  video.addEventListener("timeupdate", updateplaytime); //on time progress

  function updateprogress() {
    var bufferd = video.buffered.end(0) / video.duration * 100; //calculate buffered data in percent
    bufferprogress.style.width =  bufferd + "%"; //update progress bar width
  }

  function updateplaytime() {
    var watched = video.currentTime / video.duration * 100; //calculate current time in percent
    timeprogress.style.width =  watched + "%"; //update progress bar width
  }

}
