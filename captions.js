window.requestAnimFrame = function() {
	return (
		window.requestAnimationFrame       ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame    ||
		window.oRequestAnimationFrame      ||
		window.msRequestAnimationFrame     ||
		function(draw1) {
			window.setTimeout(draw1,1000/60);
		}
	);
}();

captionRenderer = function(video,captionFile) {
	var fontscale = 1;
	var parent = this;
	var time, lastTime = -1;

	function timeConvert(HMS) {
		var t = HMS.split(":");
		return t[0]*3600 + t[1]*60 + parseFloat(t[2]);
	}

	function caption(data) {
		var _this = this;
		this.data = data;
		this.data["Start"] = timeConvert(this.data["Start"]);
		this.data["End"] = timeConvert(this.data["End"]);
		this.data["Time"] = (this.data["End"] - this.data["Start"]) * 1000;
		this.div = null;
		this.pathProcessed = false;

		this.set = function (key,value) {
			_this.data[key] = value;
		}
		this.get = function(key) {
			return _this.data[key] ? _this.data[key] : "";
		}
		this.delete = function () {
			if (_this.div == null)
				return;
			if (_this.div.parentNode)
				_this.div.parentNode.removeChild(_this.div);
		}
		this.loadData = function() {
			_this.style = JSON.parse(JSON.stringify(parent.style[_this.data.Style]));
			_this.style.position = {};
		}
		this.reload = function() {
			_this.isPath = false;
			_this.callbacks = {};
			_this.transitions = {};
			_this.transforms = {};
			_this.updates = {};
			_this.n_transitions = 0;
			_this.loadData();
			_this.div.setAttribute("class",style_to_class(_this.data.Style));
			_this.div.innerHTML = _this.parse_text_line(_this.data.Text);
			if (_this.isPath && !_this.pathProcessed) {
				_this.pathProcessed = true;
				_this.delete();
				_this.div = null;
				_this.pepperYourAngus("path");
				_this.div.setAttribute("d",_this.div.innerHTML);
				_this.div.innerHTML = "";
				_this.pathProcessed = false;
			}
			_this.updateDivPosition();
			_this.updateAlignment();
			_this.update_timings();
		}
		this.updateTransitions = function() {
			_this.div.style.transition = "visibility 0s";
			for (var key in _this.transitions) {
				var transition = _this.transitions[key];
				_this.div.style.transition += "," + transition;
			}
		}
		this.updateTransforms = function() {
			if (Object.keys(_this.transforms).length) {
				_this.div.style.transform = "translate(" + _this.div.getAttribute("x") + "px," + _this.div.getAttribute("y") + "px)";
				for (var key in _this.transforms) _this.div.style.transform += " " + _this.transforms[key];
				_this.div.style.transform += "translate(" + (-_this.div.getAttribute("x")) + "px," + (-_this.div.getAttribute("y")) + "px)";
			}
		}
		this.addMove = function(x1,y1,x2,y2,t1,t2) {
			if (t1 === undefined) t1 = 0;
			if (t2 === undefined) t2 = _this.get("Time");
			_this.div.style.position = "absolute";
			_this.style.position.x = x1;
			_this.style.position.y = y1;
			_this.div.style.transition = "";
			_this.updateDivPosition();
			_this.updateAlignment();
			_this.updates["move"] = function(_this, t) {
				if (t < t1) t = t1;
				if (t > t2) t = t2;
				_this.style.position.x = parseFloat(x1) + (x2 - x1) * (t-t1) / (t2-t1);
				_this.style.position.y = parseFloat(y1) + (y2 - y1) * (t-t1) / (t2-t1);
				_this.updateDivPosition();
				_this.updateAlignment();
			}
		}
		this.addFade = function(a1,a2,a3,t1,t2,t3,t4) {
			var o1 = 1 - a1/255;
			var o2 = 1 - a2/255;
			var o3 = 1 - a3/255;
			_this.div.style.opacity = o1; // Prevent flickering at the start.
			_this.updates["fade"] = function(_this,t) {
				if (t <= t1) _this.div.style.opacity = o1;
				else if (t1 < t && t < t2) _this.div.style.opacity = o1 + (o2-o1) * (t-t1) / (t2-t1);
				else if (t2 < t && t < t3) _this.div.style.opacity = o2;
				else if (t3 < t && t < t4) _this.div.style.opacity = o2 + (o3-o2) * (t-t3) / (t4-t3);
				else if (t4 <= t) _this.div.style.opacity = o3;
			}
		}
		this.updateAlignment = function() {
			var TS = _this.style;
			var H = (_this.div.clientHeight * 2 / 3) || TS.Fontsize; // Approximate font height
			var A = parseInt(TS.Alignment,10);
			var SA = _this.div.setAttribute.bind(_this.div);

			if (TS.position.x) {
				if (A > 6) SA("dy",H); // 7, 8, 9
				else if (A < 4) SA("dy","0"); // 1, 2, 3
				else SA("dy",H/2); // 4, 5, 6

				if (A%3 == 0) SA("text-anchor","end"); // 3, 6, 9
				else if ((A+1)%3 == 0) SA("text-anchor","middle"); // 2, 5, 8
				else SA("text-anchor","start"); // 1, 4, 7
			}

			else {
				var CS = getComputedStyle(document.getElementById("caption_container"));

				if (A > 6) { // 7, 8, 9
					SA("dy",H);
					SA("y",TS.MarginV);
				} else if (A < 4) { // 1, 2, 3
					SA("dy","0");
					SA("y",parseFloat(CS.height)-TS.MarginV);
				} else { // 4, 5, 6
					SA("dy",H/2);
					SA("y",parseFloat(CS.height)/2);
				}

				if (A%3 == 0) { // 3, 6, 9
					SA("text-anchor","end");
					SA("x",parseFloat(CS.width)-TS.MarginR);
				} else if ((A+1)%3 == 0) { // 2, 5, 8
					SA("text-anchor","middle");
					SA("x",(parseFloat(CS.width)-TS.MarginR-TS.MarginL)/2);
				} else { // 1, 4, 7
					SA("text-anchor","start");
					SA("x",TS.MarginL);
				}
			}
		}
		this.updateDivPosition = function() {
			if (_this.style.position.x) {
				_this.div.setAttribute("y",_this.style.position.y);
				_this.div.setAttribute("x",_this.style.position.x);
			}
			_this.updateTransforms();
		}

		this.pepperYourAngus = function(type) {
			if (_this.div != null) return;
			if (!time) time = 0;
			if (!type) type = "text";
			_this.div = document.createElementNS("http://www.w3.org/2000/svg",type);
			_this.reload();
		}
		this.start = function(time) {
			_this.pepperYourAngus();
			if (_this.div.parentNode) return;
			var div = document.getElementById("caption_container");
			var sep = div.getElementById("separator" + _this.data["Layer"]);
			div.insertBefore(_this.div,sep);
			_this.div.style.display = "block";
		}
		this.stop = function() {
			if (!_this.div || !_this.div.parentNode) return;
			_this.div.style.display = "none";
			_this.delete();
		}
		this.cleanup = function() {
			_this.stop();
			_this.div = null;
		}
		this.getAnchorOffset = function() {
			var tmp = _this.div.style.display;
			_this.div.style.display = "block";
			ret = {
				x: video.offsetWidth / 2,
				y: 2 * _this.div.offsetHeight / 3
			};
			_this.div.style.display = tmp;
			return ret;
		}
		this.update_timings = function() {
			// ... should this do something?
		}
		this.addTransition = function(times,options,trans_n) {
			times = times.split(",");
			var intime = times[0] ? times[0] : 0;
			var outtime = times[1] ? times[1] : _this.get("Time");
			var callback = function(_this) {
				var retThing = _this.override_to_html(options);
				var div = _this.div.querySelector(".transition"+trans_n);
				if (div == null) div = _this.div;
				div.style["transition"] = "all " + ((outtime - intime)/1000) + "s linear";
				for (var x in retThing.style)
					div.style[x] = retThing.style[x];
				for (var i in retThing.classes)
					div.className += " " + retThing.classes[i];
			};
			_this.callbacks[trans_n] = {"f": callback, "t": intime};
		}
		this.patchCoords = function(match) {
			match = match.split(" ");
			match[0] = match[0].toUpperCase();
			match[1] = parseFloat(match[1]) + parseFloat(_this.style.position.x);
			match[2] = parseFloat(match[2]) + parseFloat(_this.style.position.y);
			return match[0] + " " + match[1] + " " + match[2];
		}
		this.createPath = function(line) {
			var overrides = line.match(/\{[^\}]*}/g);
			for (var key in overrides) {
				var match = overrides[key];
				line = line.replace(match,"");
			}
			var commands = line.match(/[MLml] -?[0-9]+ -?[0-9]+/g);
			for (var key in commands) {
				var match = commands[key];
				line = line.replace(match,_this.patchCoords(match));
			}
			return line;
		}
		this.parse_text_line = function (line) {
			_this.karaokeTimer = 0;
			line = line.replace(/</g,"&lt;");
			line = line.replace(/</g,"&gt;");
			line = line.replace(/\\h/g,"&nbsp;");
			line = line.replace(/\\N/g,"<br />");
			line = line.replace(/\\n/g,"\n");
			var overrides = line.match(/\{[^\}]*}/g);
			function cat(ret) {
				var retval = "<tspan style='";
				for (var x in ret.style)
					retval += x + ": " + ret.style[x] + ";";
				retval += "' class='";
				for (var i = 0; i < ret.classes.length; ++i)
					retval += ret.classes[i] + " ";
				retval += "'>";
				return retval;
			}
			function applyToDiv(ret) {
				_this.div.style = ret.style;
				retval = " ";
				for (var i = 0; i < ret.classes.length; ++i)
					retval += ret.classes[i] + " ";
				_this.div.setAttribute("class", _this.div.getAttribute("class") + retval);
			}
			for (var key in overrides) {
				var match = overrides[key];
				var ret = _this.override_to_html(match);
				if (_this.isPath) {
					line = _this.createPath(line);
					applyToDiv(ret);
					return line;
				} else {
					line = line.replace(match,cat(ret));
					line = line + get_html_end_tags(match);
				}
			}
			return line;
		}
		this.override_to_html = function (match) {
			match = match.slice(1,-1); // Remove {,} tags
			options = match.split("\\").slice(1); // Drop null match at beginning of string (before first "\")
			var ret = {style:{}, classes:[]};
			var transition = false;
			var transitionString = "";
			var transline = "";
			for (var key in options) {
				var option = options[key].trim();
				if (transition) transline += "\\" + option;
				else if (option.slice(0,2) == "t(") {
					transition = true;
					transitionString = option.slice(2);
					transline = "";
				}
				else ret = _this.parse_override(option,ret);
				if (option.slice(-1) == ")" && transline) {
					transline = "{" + transline.slice(0,-1) + "}";
					transition = false;
					_this.addTransition(transitionString,transline,_this.n_transitions);
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
				}
			}
			return _this.getSelfShadow(ret);
		}
		this.getSelfShadow = function(ret) {
				ret.style["stroke"] = "rgba(" + _this.style.c3r + "," + _this.style.c3g + "," + _this.style.c3b + "," + _this.style.c3a + ")";
				ret.style["stroke-width"] = (_this.style.Outline / 1) + "px";
				ret.style["text-shadow"] = ((_this.style.Shadow > 0) ? ("," + _this.style.Shadow + "px " + _this.style.Shadow + "px 0px rgba(" + _this.style.c4r + "," + _this.style.c4g + "," + _this.style.c4b + "," + (_this.style.c4a * _this.style.c1a) + ")") : "none");
				return ret;
		}

		this.parse_override = function (option,ret) {
			var map = {
				"alpha" : function(arg,ret) {
				// TODO _this.style - Go through and set relevant styles
					_this.style.c1a = 1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c2a = 1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c3a = 1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c4a = 1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					return _this.getSelfShadow(ret);
				},
				"1a" : function(arg,ret) {
				// TODO _this.style - Go through and set relevant styles
					_this.style.c1a = 1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					return _this.getSelfShadow(ret);
				},
				"2a" : function(arg,ret) {
					_this.style.c2a = 1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					return _this.getSelfShadow(ret);
				},
				"3a" : function(arg,ret) {
					_this.style.c3a = 1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					return _this.getSelfShadow(ret);
				},
				"4a" : function(arg,ret) {
					_this.style.c4a = 1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					return _this.getSelfShadow(ret);
				},
				"a" : function(arg,ret) {
					arg = +arg; // toInt
					switch (arg) {
						case 5: arg = 7; break;
						case 6: arg = 8; break;
						case 7: arg = 9; break;
						case 9: arg = 4; break;
						case 10: arg = 5; break;
						case 11: arg = 6;
						default:
					}
					_this.style.Alignment = arg;
					return ret;
				},
				"an" : function(arg,ret) {
					_this.style.Alignment = arg;
					return ret;
				},
				"be" : function(arg,ret) {
					return map["blur"](arg,ret);
				},
				"blur" : function(arg,ret) {
					_this.style.ShVal = arg;
					_this.div.style["filter"] = "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px " + arg + "px)";
					return ret;
				},
				"bord" : function(arg,ret) {
					_this.style.Outline = arg;
					return _this.getSelfShadow(ret);
				},
				"c" : function(arg,ret) {
					// TODO _this.style - Go through and set relevant styles
					if (arg.substr(8,2) != "&") {
						_this.style.c1a = 1 - (parseInt("0x"+arg.substr(2,2)) / 255.0);
						arg = arg.substr(2);
					}
					_this.style.c1r = parseInt("0x"+arg.substr(6,2));
					_this.style.c1g = parseInt("0x"+arg.substr(4,2));
					_this.style.c1b = parseInt("0x"+arg.substr(2,2));
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					return _this.getSelfShadow(ret);
				},
				"1c" : function(arg,ret) {
					// TODO _this.style - Go through and set relevant styles
					if (arg.substr(8,2) != "&") {
						_this.style.c1a = 1 - (parseInt("0x"+arg.substr(2,2)) / 255.0);
						arg = arg.substr(2);
					}
					_this.style.c1r = parseInt("0x"+arg.substr(6,2));
					_this.style.c1g = parseInt("0x"+arg.substr(4,2));
					_this.style.c1b = parseInt("0x"+arg.substr(2,2));
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					return _this.getSelfShadow(ret);
				},
				"3c" : function(arg,ret) {
					if (arg.substr(8,2) != "&") {
						_this.style.c3a = 1 - (parseInt("0x"+arg.substr(2,2)) / 255.0);
						arg = arg.substr(2);
					}
					_this.style.c3r = parseInt("0x"+arg.substr(6,2));
					_this.style.c3g = parseInt("0x"+arg.substr(4,2));
					_this.style.c3b = parseInt("0x"+arg.substr(2,2));
					return _this.getSelfShadow(ret);
				},
				"clip" : function(arg,ret) {
					return ret;
				},
				"fad(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var time = _this.get("Time");
					_this.addFade(255,0,255,0,arg[0],time-arg[1],time);
					return ret;
				},
				"fade(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					_this.addFade(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5],arg[6]);
					return ret;
				},
				"fn" : function(arg,ret) {
					_this.style.Fontname = arg;
					ret.style["font-family"] = arg;
					return ret;
				},
				"fr" : function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"frx" : function(arg,ret) {
					_this.transforms["frx"] = "rotateX(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"fry" : function(arg,ret) {
					_this.transforms["fry"] = "rotateY(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"frz" : function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"fs" : function(arg,ret) {
					_this.style.Fontsize = arg;
					ret.style["font-size"] = arg * fontscale + "px";
					return ret;
				},
				"fscx" : function(arg,ret) {
					_this.transforms["fscx"] = "scaleX(" + fontscale * arg / 100.0 + ") ";
					_this.updateTransforms();
					return ret;
				},
				"fscy" : function(arg,ret) {
					_this.transforms["fscy"] = "scaleY(" + fontscale * arg / 100.0 + ") ";
					_this.updateTransforms();
					return ret;
				},
				"k" : function(arg,ret) {
					startTime = parseFloat(_this.karaokeTimer);
					endTime = parseFloat(_this.karaokeTimer) + parseFloat(arg*10);
					_this.addTransition(startTime + "," + startTime,"{\\_k}",_this.n_transitions);
					ret.style["fill"] = "rgba(" + _this.style.c2r + "," + _this.style.c2g + "," + _this.style.c2b + "," + _this.style.c2a + ")";
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
					_this.karaokeTimer = endTime;
					return ret;
				},
				"K" : function(arg,ret) {
					startTime = parseFloat(_this.karaokeTimer);
					endTime = parseFloat(_this.karaokeTimer) + parseFloat(arg*10);
					_this.addTransition(startTime + "," + endTime,"{\\_k}",_this.n_transitions);
					ret.style["fill"] = "rgba(" + _this.style.c2r + "," + _this.style.c2g + "," + _this.style.c2b + "," + _this.style.c2a + ")";
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
					_this.karaokeTimer = endTime;
					return ret;
				},
				"kf" : function(arg,ret) {
					return map["k"](arg,ret);
				},
				"kt" : function(arg,ret) {
					_this.karaokeTimer = parseFloat(arg);
					return ret;
				},
				"_k" : function(arg,ret) {
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					return ret;
				},
				"move(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					_this.addMove(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5])
					return ret;
				},
				"p" : function(arg,ret) {
					_this.isPath = true;
					_this.style.outline = arg;
					div.style.fill = "none";
					div.style.stroke = "rgba("+_this.style.c1r+","+_this.style.c1g+","+_this.style.c1b+","+_this.style.c1a+")";
					return ret;
				},
				"pos(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var x = arg[0];
					var y = arg[1];
					_this.addMove(x,y,x,y);
					return ret;
				},
				"r" : function(arg,ret) {
					var pos = _this.style.position;
					ret.classes.push(style_to_class(_this.data.Style));
					_this.style = JSON.parse(JSON.stringify(parent.style[_this.data.Style]));
					_this.style.position = pos;
					return ret;
				},
				"shad" : function(arg,ret) {
					_this.style.ShOffX = arg;
					_this.style.ShOffY = arg;
					_this.div.style["filter"] = "drop-shadow(" + arg + "px " + arg + "px " + _this.style.ShVal + "px)";
					return ret;
				},
				"xshad" : function(arg,ret) {
					_this.style.ShOffX = arg;
					_this.div.style["filter"] = "drop-shadow(" + arg + "px " + _this.style.ShOffY + "px " + _this.style.ShVal + "px)";
					return ret;
				},
				"yshad" : function(arg,ret) {
					_this.style.ShOffY = arg;
					_this.div.style["filter"] = "drop-shadow(" + _this.style.ShOffX + "px " + arg + "px " + _this.style.ShVal + "px)";
					return ret;
				}
			}
			for (var i = option.length; i >= 0; --i) {
				if (map[option.slice(0,i)]) {
					ret = map[option.slice(0,i)](option.slice(i),ret);
					return ret;
				}
			}
			ret.classes.push(option);
			return ret;
		}
		function get_html_end_tags(match) {
		//	return override_to_html(match).match(/<span/g).length;
		//	TODO: Count number of tags we need to close.
			return "</tspan>";
		}
		this.update = function(t) {
			if (!this.div) return;
			var time = t * 1000;
			for (var key in _this.updates)
				_this.updates[key](_this,time);
			for (var key in _this.callbacks) {
				var callback = _this.callbacks[key];
				if (callback["t"] < time) {
					callback["f"](_this);
					delete _this.callbacks[key];
				}
			}
			_this.updateAlignment();
		}
		_this.loadData();
	}

	function style_to_class(text) {
		return "subtitle_" + text.replace(/ /g,"_");
	}

	function process(captionGroup,time) {
		for (var key in captionGroup) {
			var C = captionGroup[key];
			if (C.get("Start") < time && time < C.get("End")) {
				if (C.div && C.div.parentNode) C.update(time - C.get("Start"));
				else C.start();
			}
			if (time < C.get("Start") || C.get("End") < time && (C.div && C.div.parentNode)) {
				C.stop();
				C.cleanup();
			}
		}
	}
	this.timeUpdate = function() {
		time = video.currentTime;
		if (lastTime == time) return;
		lastTime = time;
		process(_this.captions,time);
	}

	this.renderCaptions = function(url) {
		var freq = new XMLHttpRequest();
		freq.open("get",url,true);
		freq.onreadystatechange = function() {
			if (freq.readyState != 4) return;
			_this.init(freq.responseText);
		};
		freq.send();
	}

	this.resizeCaptions = function(timeout) {
		if (timeout === undefined) timeout = 200;
		if (_this.resizeRequest) return;
		_this.resizeRequest = setTimeout(function() {
			_this.resizeRequest = 0;
			if (!_this.assdata) return; // We're not loaded, or deconstructed
			_this.parse_head(_this.assdata.info);
			document.getElementById("caption_container").style.transform = "scale(" + _this.scale + ")";
			document.getElementById("caption_container").style.left = (window.innerWidth - video.offsetWidth) / (2) + "px";
			document.getElementById("caption_container").style.top = (window.innerHeight - video.offsetWidth * video.videoHeight / video.videoWidth) / (2) + "px";
		}, timeout);
	}

	this.mainLoop = function() {
		if (_this.stopCaptions) return;
		if (video.paused) {
			_this.pauseCaptions();
			return;
		}
		requestAnimFrame(_this.mainLoop);
		_this.timeUpdate();
	}

	this.pauseCaptions = function() {
		_this.stopCaptions = true;
		video.addEventListener("play",_this.resumeCaptions,false);
	}
	this.resumeCaptions = function() {
		video.removeEventListener("play",_this.resumeCaptions,false);
		_this.stopCaptions = false;
		requestAnimFrame(_this.mainLoop);
	}

	function ass2js(asstext) {
		var captions = {};
		var assfile = asstext.split("\n");
		var last_tag = 0;
		var state = 0;
		for (var i = 0; i < assfile.length; ++i) {
			assfile[i] = assfile[i].trim();
			if (assfile[i] == "[Script Info]") {
				parse_section(captions,state,assfile.slice(last_tag+1,i-1));
				state = 1;
				last_tag = i;
			}
			if (assfile[i] == "[V4+ Styles]") {
				parse_section(captions,state,assfile.slice(last_tag+1,i-1));
				state = 2;
				last_tag = i;
			}
			if (assfile[i] == "[Events]") {
				parse_section(captions,state,assfile.slice(last_tag+1,i-1));
				state = 3;
				last_tag = i;
			}
		}
		parse_section(captions,state,assfile.slice(last_tag+1,i));
		return captions;
	}

	this.init = function(text) {
		_this.assdata = ass2js(text);
		_this.stopCaptions = false;
		_this.update_titles_async(_this.assdata, function() {
			video.addEventListener("pause",_this.pauseCaptions,false);
			window.addEventListener("resize",_this.resizeCaptions,false);
			document.addEventListener("mozfullscreenchange",_this.resizeCaptions,false);
			document.addEventListener("webkitfullscreenchange",_this.resizeCaptions,false);
			_this.resizeCaptions(0);
			requestAnimFrame(_this.mainLoop);
		} );
	}

	this.update_titles_async = function(title_data,callback) {
		function f1_async() {
			_this.parse_head(title_data.info)
			requestAnimFrame(f2_async);
		}
		function f2_async() {
			_this.write_styles(title_data.styles);
			requestAnimFrame(f3_async);
		}
		function f3_async() {
			_this.init_subs(title_data.events);
			requestAnimFrame(callback);
		}
		requestAnimFrame(f1_async);
	}

	this.parse_head = function(info) {
		var div = document.getElementById("caption_container");
		div.setAttribute("height",info.PlayResY);
		div.style.height = info.PlayResY + "px";
		div.setAttribute("width",info.PlayResX);
		div.style.width = info.PlayResX + "px";
		_this.scale = Math.min(video.clientWidth/parseFloat(info.PlayResX),video.clientHeight/parseFloat(info.PlayResY));
	}
	this.write_styles = function(styles) {
		if (typeof(_this.style_css) === "undefined") {
			_this.style_css = document.createElement("style");
			_this.style_css.type = "text/css";
			document.getElementsByTagName("head")[0].appendChild(_this.style_css);
		}
		_this.style_css.innerHTML = "";
		for (var key in styles) {
			var style = styles[key];
			_this.style = styles;
			_this.style_css.innerHTML += "\n." + style_to_class(key) + " {\n" + style_to_css(style) + "}\n";
		}
	}
	this.init_subs = function(subtitles) {
		_this.captions = [];
		var layers = [];
		for (var key in subtitles) {
			if (layers.indexOf(subtitles[key]["Layer"] * 1) == -1)
				layers.push(subtitles[key]["Layer"] * 1);
		}
		layers.sort(function(a,b) { return a - b; } );
		for (var i = 0; i < layers.length; ++i) {
			if (!document.querySelector("#caption_container > #separator"+layers[i])) {
				var d = document.createElement("text");
				d.setAttribute("id","separator"+layers[i]);
				document.getElementById("caption_container").appendChild(d);
			}
		}
		for (var key in subtitles)
			setTimeout(_this.captions.push.bind(_this.captions,new caption(subtitles[key])),0);
	}

	function parse_section(captions,state,section) {
		switch(state) {
			case 1:
				captions.info = parse_info(section);
				break;
			case 2:
				captions.styles = parse_styles(section);
				break;
			case 3:
				captions.events = parse_events(section);
		}
		return captions;
	}
	function parse_info(info_section) {
		var info = {};
		for (var key in info_section) {
			var line = info_section[key];
			if (line.charAt(0) == ";") continue;
			var keyval = line.split(":");
			if (keyval.length != 2) continue;
			info[keyval[0]] = keyval[1].trim();
		}
		return info;
	}
	function parse_styles(style_section) {
		var styles = {};
		var header = style_section[0].replace("Format: ","");
		var map = header.split(", ");
		for (var key in style_section) {
			var line = style_section[key];
			if (line.search("Style: ") == -1)
				continue;
			var elems = line.replace("Style: ","").split(",");
			var new_style = {};
			for (var i = 0; i < elems.length; ++i)
				new_style[map[i]] = elems[i];
			styles[new_style["Name"]] = new_style;
		}
		return styles;
	}
	function parse_events(event_section) {
		var events = [];
		var header = event_section[0].replace("Format: ","");
		var map = header.split(", ");
		for (var key in event_section) {
			var line = event_section[key];
			if (line.search("Dialogue: ") == -1)
				continue;
			var elems = line.replace("Dialogue: ","").split(",");
			var new_event = {};
			for (var i = 0; map[i] != "Text" && i < elems.length; ++i)
				new_event[map[i]] = elems[i];
			if (map[i] == "Text")
				new_event[map[i]] = elems.slice(i).join(",");
			events.push(new_event);
		}
		return events;
	}

	function style_to_css(style) {
		var ret = "position:absolute;\n";
		if (typeof(style.Fontname) != "undefined")
			ret += "font-family:" + style.Fontname + ";\n";
		if (typeof(style.Fontsize) != "undefined")
			ret += "font-size:" + (parseFloat(style.Fontsize)*fontscale).toFixed(2).toString() + "px;\n";
		if (style.Italic > 0)
			ret += "font-style:italic;\n";
		if (style.Bold > 0)
			ret += "font-weight:bold;\n";

		style.c3r = parseInt("0x"+style.OutlineColour.substr(8,2));
		style.c3g = parseInt("0x"+style.OutlineColour.substr(6,2));
		style.c3b = parseInt("0x"+style.OutlineColour.substr(4,2));
		style.c3a = (255-parseInt("0x"+style.OutlineColour.substr(2,2)))/255;

		style.c4r = parseInt("0x"+style.BackColour.substr(8,2));
		style.c4g = parseInt("0x"+style.BackColour.substr(6,2));
		style.c4b = parseInt("0x"+style.BackColour.substr(4,2));
		style.c4a = (255-parseInt("0x"+style.BackColour.substr(2,2)))/255;

		style.c2r = parseInt("0x"+style.SecondaryColour.substr(8,2));
		style.c2g = parseInt("0x"+style.SecondaryColour.substr(6,2));
		style.c2b = parseInt("0x"+style.SecondaryColour.substr(4,2));
		style.c2a = (255-parseInt("0x"+style.SecondaryColour.substr(2,2)))/255;

		style.c1r = parseInt("0x"+style.PrimaryColour.substr(8,2));
		style.c1g = parseInt("0x"+style.PrimaryColour.substr(6,2));
		style.c1b = parseInt("0x"+style.PrimaryColour.substr(4,2));
		style.c1a = (255-parseInt("0x"+style.PrimaryColour.substr(2,2)))/255;

		ret += "stroke: rgba(" + style.c3r + "," + style.c3g + "," + style.c3b + "," + style.c3a + "); stroke-width: " + style.Outline / 1 + "px;";
		ret += "text-shadow: " + ((style.Shadow > 0) ? ("," + style.Shadow + "px " + style.Shadow + "px 0px rgba(" + style.c4r + "," + style.c4g + "," + style.c4b + "," + (style.c4a * style.c1a) + ")") : "none") + ";";

		ret += "fill: rgba(" + style.c1r + "," + style.c1g + "," + style.c1b + "," + style.c1a + ");\n";


		if (typeof(style.Alignment) != "undefined") {
			var N = parseInt(style.Alignment,10);

			ret += "text-align: ";
			if (N%3 == 0) ret += "right"; // 3, 6, 9
			else if ((N+1)%3 == 0) ret += "center"; // 2, 5, 8
			else ret += "left"; // 1, 4, 7
			ret += ";\n";

			ret += "vertical-align: ";
			if (N > 6) ret += "top";
			else if (N < 4) ret += "bottom";
			else ret += "middle";
			ret += ";\n";
		}

		if (style.MarginV != 0) {
			ret += "margin-bottom: " + style.MarginV + "px;\n";
			ret += "margin-top: " + style.MarginV + "px;\n";
		} else {
			ret += "margin-top: 0px;\n";
			ret += "margin-bottom: 0px;\n";
		}

		return ret;
	}

	this.shutItDown = function() {
		video.removeEventListener("pause",_this.pauseCaptions,false);
		video.removeEventListener("play",_this.resumeCaptions,false);
		window.removeEventListener("resize",_this.resizeCaptions,false);
		document.removeEventListener("mozfullscreenchange",_this.resizeCaptions,false);
		document.removeEventListener("webkitfullscreenchange",_this.resizeCaptions,false);
		for (var key in _this.captions) {
			var caption = _this.captions[key];
			clearTimeout(caption.startTimer);
			clearTimeout(caption.endTimer);
		}
		_this.captions = [];
		_this.stopCaptions = true;
		document.getElementById("caption_container").innerHTML = "";
	}

	var _this = this;
	this.renderCaptions(captionFile);
};
