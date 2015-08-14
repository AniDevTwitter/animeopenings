var list, playlist = [], eList = [];
var playlistBot;

document.body.addEventListener("load", setup);
document.body.addEventListener("pageshow", search);

function setup() {
  // get list of series elements and set their id
  list = document.getElementsByClassName("series");
  for (var i = 0; i < list.length; ++i)
    list[i].id = list[i].childNodes[0].nodeValue.toLowerCase();

  // set search link onmouseover event
  document.getElementById("searchURL").addEventListener("mouseover", setSearchURL);

  // set search box search event
  document.getElementById("searchbox").addEventListener("keyup", search);

  // get search string from url
  if (location.search.indexOf("=") > -1)
    document.getElementById("searchbox").value = decodeURIComponent(location.search.substring(location.search.indexOf("=")+1));

  // add onclick(addVideoToPlaylist) to fa-plus elements
  for (var i = 0, addVideoButtons = document.getElementsByClassName("fa-plus"); i < addVideoButtons.length; ++i) {
    addVideoButtons[i].addEventListener("click", playlistAdd);
    addVideoButtons[i].nextElementSibling.className = "video";
  }

  // add click events to playlist "menu"
  playlistBot = document.getElementById("playlist").children[1];
  playlistBot.children[0].addEventListener("click", editPlaylist);
  playlistBot.children[2].addEventListener("click", startPlaylist);

  // set history state
  history.replaceState("list", document.title);
}

function search() {
  const toFind = document.getElementById("searchbox").value.toLowerCase().split(" ");

  var anyResults = false;

  for (var i = 0; i < list.length; ++i) {
    for (var j = 0; j < toFind.length; ++j) {
      if (list[i].id.indexOf(toFind[j]) !== -1) {
        list[i].removeAttribute("hidden");
        anyResults = true;
      } else {
        list[i].setAttribute("hidden", "");
        break;
      }
    }
  }

  if (anyResults) document.getElementById("NoResultsMessage").setAttribute("hidden","");
  else document.getElementById("NoResultsMessage").removeAttribute("hidden");
}

function setSearchURL() {
  document.getElementById("searchURL").href = "?s=" + document.getElementById("searchbox").value;
}

function playlistAdd() {
  const video = {title: this.nextElementSibling.text,
                 source: this.parentElement.parentElement.childNodes[0].nodeValue,
                 song: this.song,
                 file: this.nextElementSibling.href.substring(this.nextElementSibling.href.indexOf("=")+1)};
  playlist.push(video);

  eList.push(this);

  this.removeEventListener("click", playlistAdd);
  this.classList.remove("fa-plus");
  this.classList.add("fa-check");

  var XNode = document.createElement("i");
      XNode.classList.add("fa", "fa-remove");
      XNode.addEventListener("click", playlistRemove);
  var TNode = document.createElement("span");
      TNode.style.display = "inline-flex";
      TNode.style.padding = 0;
      TNode.innerHTML = '<span>' + video.title + " from " + video.source + "</span>";
  var BNode = document.createElement("i");
      BNode.classList.add("fa", "fa-none"); // Change "fa-none" to "fa-reorder" when playlist rearranging is added.
      BNode.N = playlist.length - 1;
  playlistBot.parentNode.insertBefore(XNode, playlistBot);
  playlistBot.parentNode.insertBefore(TNode, playlistBot);
  playlistBot.parentNode.insertBefore(BNode, playlistBot);

  document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
  document.getElementById("playlist").removeAttribute("hidden");
}

function playlistRemove() {
  const num = this.nextSibling.nextSibling.N;

  playlist.splice(num, 1);

  eList[num].classList.remove("fa-check");
  eList[num].classList.add("fa-plus");
  eList[num].addEventListener("click", playlistAdd);

  this.parentNode.removeChild(this.nextSibling);
  this.parentNode.removeChild(this.nextSibling);
  this.parentNode.removeChild(this);

  document.getElementById("playlist").children[0].innerHTML = playlist.length + " Video" + (playlist.length != 1 ? "s" : "") + " in Playlist";
}

function editPlaylist() {
  var box = document.createElement("div");
      box.id = "box";
      box.innerHTML = "<p><span>Cancel</span><span>Save</span></p><textarea></textarea>";
      box.children[0].children[0].addEventListener("click", cancelEdit);
      box.children[0].children[1].addEventListener("click", loadPlaylist);

  if (playlist.length) box.children[1].value = playlist[0].file;
  for (var i = 1; i < playlist.length; ++i)
    box.children[1].value += "\n" + playlist[i].file;

  document.body.appendChild(box);
}

function cancelEdit() {
  document.body.removeChild(document.getElementById("box"));
}

function loadPlaylist() {
  var X = playlistBot.parentElement.getElementsByClassName("fa-remove");
  while (X.length) X[0].click();

  for (var i = 0, sources = document.getElementById("box").children[1].value.split("\n"); i < sources.length; ++i) {
    for (var j = 0, videos = document.getElementsByClassName("video"); j < videos.length; ++j) {
      if (videos[j].getAttribute("href") == "../?video=" + sources[i] ) videos[j].previousElementSibling.click();
      else {
        var notFound = document.createElement("p");
            notFound.innerHTML = '<i class="fa fa-remove" style="padding-left: 0;"></i>"' + sources[i] + '" could not be found.';
            notFound.children[0].addEventListener("click", function(){this.parentNode.parentNode.removeChild(this.parentNode);});
        playlistBot.parentElement.appendChild(notFound);
      }
    }
  }

  document.body.removeChild(document.getElementById("box"));
}

function startPlaylist() {
  history.pushState({list: playlist, video: 0}, "Custom Playlist", "/");
  history.go();
}
