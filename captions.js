var FPS = 33;
var SPF = 1 / FPS;

window.requestAnimFrame = function() {
	return (
		window.requestAnimationFrame       ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame    ||
		window.oRequestAnimationFrame      ||
		window.msRequestAnimationFrame     ||
		function(draw) { window.setTimeout(draw,SPF); }
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

			if (_this.data["MarginL"] && _this.data["MarginL"] != 0) _this.div.style["margin-left"] = _this.data["MarginL"];
			if (_this.data["MarginR"] && _this.data["MarginR"] != 0) _this.div.style["margin-right"] = _this.data["MarginR"];
			if (_this.data["MarginV"] && _this.data["MarginV"] != 0) {
				_this.div.style["margin-top"] = _this.data["MarginV"];
				_this.div.style["margin-bottom"] = _this.data["MarginV"];
			}

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
		}
		this.updateTransitions = function() {
			_this.div.style.transition = "visibility 0s";
			for (var key in _this.transitions)
				_this.div.style.transition += "," + _this.transitions[key];
		}
		this.updateTransforms = function() {
			if (_this.style.ScaleX && _this.style.ScaleX != 100 && !_this.transforms["fscx"])
				_this.transforms["fscx"] = "scaleX(" + fontscale * _this.style.ScaleX / 100 + ") ";
			if (_this.style.ScaleY && _this.style.ScaleY != 100 && !_this.transforms["fscy"])
				_this.transforms["fscy"] = "scaleY(" + fontscale * _this.style.ScaleY / 100 + ") ";

			if (Object.keys(_this.transforms).length) {
				_this.div.style.transform = "translate(" + _this.div.getAttribute("x") + "px," + _this.div.getAttribute("y") + "px)";
				for (var key in _this.transforms) _this.div.style.transform += " " + _this.transforms[key];
				_this.div.style.transform += "translate(" + (-_this.div.getAttribute("x")) + "px," + (-_this.div.getAttribute("y")) + "px)";
			}
		}
		this.addMove = function(x1,y1,x2,y2,t1,t2) {
			if (t1 === undefined) t1 = 0;
			if (t2 === undefined) t2 = _this.get("Time");
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
				else if (A < 4) SA("dy",0); // 1, 2, 3
				else SA("dy",H/2); // 4, 5, 6

				if (A%3 == 0) SA("text-anchor","end"); // 3, 6, 9
				else if ((A+1)%3 == 0) SA("text-anchor","middle"); // 2, 5, 8
				else SA("text-anchor","start"); // 1, 4, 7
			}

			else {
				var CS = getComputedStyle(document.getElementById("caption_container"));

				var MarginL = ((_this.data["MarginL"] && _this.data["MarginL"] != 0) ? _this.data["MarginL"] : TS.MarginL);
				var MarginR = ((_this.data["MarginR"] && _this.data["MarginR"] != 0) ? _this.data["MarginR"] : TS.MarginR);
				var MarginV = ((_this.data["MarginV"] && _this.data["MarginV"] != 0) ? _this.data["MarginV"] : TS.MarginV);

				if (A > 6) { // 7, 8, 9
					SA("dy",H);
					SA("y",MarginV);
				} else if (A < 4) { // 1, 2, 3
					SA("dy",0);
					SA("y",parseFloat(CS.height)-MarginV);
				} else { // 4, 5, 6
					SA("dy",H/2);
					SA("y",parseFloat(CS.height)/2);
				}

				if (A%3 == 0) { // 3, 6, 9
					SA("text-anchor","end");
					SA("x",parseFloat(CS.width)-MarginR);
				} else if ((A+1)%3 == 0) { // 2, 5, 8
					SA("text-anchor","middle");
					SA("x",((MarginR-MarginL)/2)+(parseFloat(CS.width)/2));
				} else { // 1, 4, 7
					SA("text-anchor","start");
					SA("x",MarginL);
				}
			}
		}
		this.updateDivPosition = function() {
			if (_this.style.position.x) {
				_this.div.setAttribute("x",_this.style.position.x);
				_this.div.setAttribute("y",_this.style.position.y);
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
		this.createBox = function() {
			var TB = _this.box;
			var TD = _this.div;
			var TS = _this.style;
			var A = parseInt(TS.Alignment,10);
			var B = parseFloat(TB.style["stroke-width"]);
			var W = parseFloat(getComputedStyle(TD).width) * fontscale * (_this.ScaleX || TS.ScaleX) / 100;
			var H = parseFloat(getComputedStyle(TD).height) * fontscale * (_this.ScaleY || TS.ScaleY) / 100;
			var X = parseFloat(TD.getAttribute("x"));
			var Y = parseFloat(TD.getAttribute("y"));

			if (A%3 == 0) X -= W; // 3, 6, 9
			else if ((A+1)%3 == 0) X -= W / 2; // 2, 5, 8

			if (A < 7) {
				if (A < 4) Y -= H;
				else Y -= H / 2;
			}

			TB.setAttribute("x", X - B);
			TB.setAttribute("y", Y + B);
			TB.setAttribute("width", W + 2*B);
			TB.setAttribute("height", H + 2*B);
			document.getElementById("caption_container").insertBefore(TB,TD);
		}
		this.start = function(time) {
			_this.pepperYourAngus();
			if (_this.div.parentNode) return;
			var div = document.getElementById("caption_container");
			var sep = div.getElementById("separator" + _this.data["Layer"]);
			div.insertBefore(_this.div,sep);
			_this.div.style.display = "block";
			if (_this.box) _this.createBox();
		}
		this.stop = function() {
			if (!_this.div || !_this.div.parentNode) return;
			_this.div.style.display = "none";
			if (_this.box) _this.box.remove();
			if (_this.div) _this.div.remove();
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
		this.addTransition = function(times,options,trans_n) {
			times = times.split(",");
			var intime, outtime, accel;

			switch (times.length) {
				case 3:
					accel = times[2];
				case 2:
					outtime = times[1];
					intime = times[0];
					break;
				case 1:
					accel = times[0];
					break;
				default:
					accel = 1;
					outtime = _this.get("Time");
					intime = 0;
			}

			var callback = function(_this) {
				var ret = _this.override_to_html(options);
				var div = _this.div.querySelector(".transition"+trans_n);
				if (div == null) div = _this.div;
				div.style["transition"] = "all " + ((outtime - intime)/1000) + "s ";
				if (accel == 1) div.style["transition"] += "linear";
				else div.style["transition"] += "cubic-bezier(" + 0 + "," + 0 + "," + 1 + "," + 1 + ")"; // cubic-bezier(x1, y1, x2, y2)
				for (var x in ret.style)
					div.style[x] = ret.style[x];
				for (var i in ret.classes)
					div.className += " " + ret.classes[i];
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
				if (ret.classes.length) retval += "' class='";
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
					_this.addTransition(transitionString.slice(0,-1),transline,_this.n_transitions);
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
				}
			}
			_this.updateAlignment();
			_this.updateTransforms();
			ret = _this.updateColors(ret);
			ret = _this.updateShadows(ret);
			return ret;
		}

		this.updateColors = function(ret) {
			ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
			ret.style["stroke"] = "rgba(" + _this.style.c3r + "," + _this.style.c3g + "," + _this.style.c3b + "," + _this.style.c3a + ")";
			ret.style["stroke-width"] = _this.style.Outline + "px";
			return ret;
		}
		this.updateShadows = function(ret) {
			var fillColor = ret.style["fill"];
			var borderColor = ret.style["stroke"];
			var shadowColor = "rgba(" + _this.style.c4r + "," + _this.style.c4g + "," + _this.style.c4b + "," + _this.style.c4a + ")";
			_this.div.style["filter"] = "";
			if (_this.style.BorderStyle != 3) { // Outline and Shadow
				if (_this.style.blur) // \be, \blur
					_this.div.style["filter"] += "drop-shadow( 0 0 " + _this.style.blur + "px " + (_this.style.Outline ? borderColor : fillColor) + ") ";
				if (_this.style.ShOffX || _this.style.ShOffY) // \shad, \xshad, \yshad
					_this.div.style["filter"] += "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px 0 " + shadowColor + ")";
			} else { // Border Box
				if (!_this.box) _this.box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				_this.box.setAttribute("fill", borderColor);
				_this.box.style["stroke"] = (_this.style.Outline ? borderColor : fillColor);
				_this.box.style["stroke-width"] = ret.style["stroke-width"];
				ret.style["stroke-width"] = "0px";

				if (_this.style.blur) // \be, \blur
					_this.div.style["filter"] = "drop-shadow( 0 0 " + _this.style.blur + "px " + fillColor + ")";
				else _this.div.style["filter"] = "";
				if (_this.style.ShOffX || _this.style.ShOffY) // \shad, \xshad, \yshad
					_this.box.style["filter"] = "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px 0 " + shadowColor + ")";
				else _this.box.style["filter"] = "";
			}
			return ret;
		}

		this.parse_override = function (option,ret) {
			// TODO: implement \xbord and \ybord
			//			also? \q and \fe
			//		make \K actually do what it's supposed to (use masks?)
			//		implement \clip and \iclip with style="clip-path:rect(X1 Y1 X0 Y0)"
			
			// WrapStyle, Angle
			var map = {
				"alpha" : function(arg,ret) {
					arg = arg.slice(2,-1); // remove 'H' and '&'s
					var a = 1 - (parseInt(arg,16) / 255);
					_this.style.c1a = a; // primary fill
					_this.style.c2a = a; // secondary fill (for karaoke)
					_this.style.c3a = a; // border
					_this.style.c4a = a; // shadow
					return ret;
				},
				"1a" : function(arg,ret) {
					_this.style.c1a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
					return ret;
				},
				"2a" : function(arg,ret) {
					_this.style.c2a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
					return ret;
				},
				"3a" : function(arg,ret) {
					_this.style.c3a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
					return ret;
				},
				"4a" : function(arg,ret) {
					_this.style.c4a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
					return ret;
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
					_this.style.blur = arg;
					return ret;
				},
				"blur" : function(arg,ret) {
					_this.style.blur = arg;
					return ret;
				},
				"bord" : function(arg,ret) {
					_this.style.Outline = arg;
					return ret;
				},
				"xbord" : function(arg,ret) {
					return ret;
				},
				"ybord" : function(arg,ret) {
					return ret;
				},
				"c" : function(arg,ret) {
					return map["1c"](arg,ret);
				},
				"1c" : function(arg,ret) {
					if (arg.substr(8,2) != "&") {
						_this.style.c1a = 1 - (parseInt(arg.substr(2,2),16) / 255);
						arg = arg.substr(2);
					}
					_this.style.c1r = parseInt(arg.substr(6,2),16);
					_this.style.c1g = parseInt(arg.substr(4,2),16);
					_this.style.c1b = parseInt(arg.substr(2,2),16);
					return ret;
				},
				"2c" : function(arg,ret) {
					if (arg.substr(8,2) != "&") {
						_this.style.c2a = 1 - (parseInt(arg.substr(2,2),16) / 255);
						arg = arg.substr(2);
					}
					_this.style.c2r = parseInt(arg.substr(6,2),16);
					_this.style.c2g = parseInt(arg.substr(4,2),16);
					_this.style.c2b = parseInt(arg.substr(2,2),16);
					return ret;
				},
				"3c" : function(arg,ret) {
					if (arg.substr(8,2) != "&") {
						_this.style.c3a = 1 - (parseInt(arg.substr(2,2),16) / 255);
						arg = arg.substr(2);
					}
					_this.style.c3r = parseInt(arg.substr(6,2),16);
					_this.style.c3g = parseInt(arg.substr(4,2),16);
					_this.style.c3b = parseInt(arg.substr(2,2),16);
					return ret;
				},
				"4c" : function(arg,ret) {
					if (arg.substr(8,2) != "&") {
						_this.style.c4a = 1 - (parseInt(arg.substr(2,2),16) / 255);
						arg = arg.substr(2);
					}
					_this.style.c4r = parseInt(arg.substr(6,2),16);
					_this.style.c4g = parseInt(arg.substr(4,2),16);
					_this.style.c4b = parseInt(arg.substr(2,2),16);
					return ret;
				},
				"clip" : function(arg,ret) {
					return ret;
				},
				"iclip" : function(arg,ret) {
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
				"fax" : function(arg,ret) {
					_this.transforms["fax"] = "skewX(" + arg + ") ";
					return ret;
				},
				"fay" : function(arg,ret) {
					_this.transforms["fay"] = "skewY(" + arg + ") ";
					return ret;
				},
				"fn" : function(arg,ret) {
					_this.style.Fontname = arg;
					ret.style["font-family"] = arg;
					return ret;
				},
				"fr" : function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					return ret;
				},
				"frx" : function(arg,ret) {
					_this.transforms["frx"] = "rotateX(" + arg + "deg) ";
					return ret;
				},
				"fry" : function(arg,ret) {
					_this.transforms["fry"] = "rotateY(" + arg + "deg) ";
					return ret;
				},
				"frz" : function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					return ret;
				},
				"fs" : function(arg,ret) {
					_this.style.Fontsize = arg;
					ret.style["font-size"] = arg * fontscale + "px";
					return ret;
				},
				"fscx" : function(arg,ret) {
					_this.ScaleX = arg;
					_this.transforms["fscx"] = "scaleX(" + fontscale * arg / 100 + ") ";
					return ret;
				},
				"fscy" : function(arg,ret) {
					_this.ScaleY = arg;
					_this.transforms["fscy"] = "scaleY(" + fontscale * arg / 100 + ") ";
					return ret;
				},
				"fsp" : function(arg,ret) {
					if (arg == "0") arg = _this.style.Spacing;
					ret.style["letter-spacing"] = arg + "px";
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
				"ko" : function(arg,ret) {
					startTime = parseFloat(_this.karaokeTimer);
					endTime = parseFloat(_this.karaokeTimer) + parseFloat(arg*10);
					_this.addTransition(startTime + "," + startTime,"{\\_k}",_this.n_transitions);
					ret.style["stroke-width"] = "0px";
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
					_this.karaokeTimer = endTime;
					return ret;
				},
				"kt" : function(arg,ret) {
					_this.karaokeTimer = parseFloat(arg);
					return ret;
				},
				"_k" : function(arg,ret) {
					ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
					ret.style["stroke-width"] = _this.style.Outline + "px";
					return ret;
				},
				"move(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					_this.addMove(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5])
					return ret;
				},
				"org(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					_this.div.style["transform-origin"] = arg[0] + "px " + arg[1] + "px";
					return ret;
				},
				"p" : function(arg,ret) {
					_this.isPath = true;
					_this.div.style["fill"] = "none";
					return ret;
				},
				"pos(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					_this.style.position.x = arg[0];
					_this.style.position.y = arg[1];
					_this.updateDivPosition();
					_this.updateAlignment();
					return ret;
				},
				"q" : function(arg,ret) {
					return ret;
				},
				"r" : function(arg,ret) {
					var pos = _this.style.position;
					var style = (arg == "" ? _this.data.Style : (parent.style[arg] ? arg : _this.data.Style ));
					ret.classes.push(style_to_class(style));
					_this.style = JSON.parse(JSON.stringify(parent.style[style]));
					_this.style.position = pos;
					return ret;
				},
				"shad" : function(arg,ret) {
					_this.style.ShOffX = arg;
					_this.style.ShOffY = arg;
					return ret;
				},
				"xshad" : function(arg,ret) {
					_this.style.ShOffX = arg;
					if (!_this.style.ShOffY) _this.style.ShOffY = 0;
					return ret;
				},
				"yshad" : function(arg,ret) {
					if (!_this.style.ShOffX) _this.style.ShOffX = 0;
					_this.style.ShOffY = arg;
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
			// return override_to_html(match).match(/<span/g).length;
			// TODO: Count number of tags we need to close.
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
		if (Math.abs(time-lastTime) < SPF) return;
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
		for (var i = 0; i < assfile.length; ++i) {
			assfile[i] = assfile[i].trim();
			if (assfile[i] == "[Script Info]") {
				last_tag = i;
			} else if (assfile[i].indexOf("Styles") > -1) {
				captions.info = parse_info(assfile.slice(last_tag+1,i-1));
				last_tag = i;
			} else if (assfile[i] == "[Events]") {
				captions.styles = parse_styles(assfile.slice(last_tag+1,i-1));
				last_tag = i;
			}
		}
		captions.events = parse_events(assfile.slice(last_tag+1,i));
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

	this.update_titles_async = function(assdata,callback) {
		function f1_async() {
			_this.parse_head(assdata.info)
			requestAnimFrame(f2_async);
		}
		function f2_async() {
			_this.write_styles(assdata.styles);
			requestAnimFrame(f3_async);
		}
		function f3_async() {
			_this.init_subs(assdata.events);
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
		if (style.Fontname)
			ret += "font-family:" + style.Fontname + ";\n";
		if (style.Fontsize)
			ret += "font-size:" + (parseFloat(style.Fontsize)*fontscale).toFixed(2) + "px;\n";
		if (style.Spacing)
			ret += "letter-spacing:" + style.Spacing + "px;\n";
		if (style.Italic != 0)
			ret += "font-style:italic;\n";
		if (style.Bold != 0)
			ret += "font-weight:bold;\n";

		style.c1r = parseInt(style.PrimaryColour.substr(8,2),16);
		style.c1g = parseInt(style.PrimaryColour.substr(6,2),16);
		style.c1b = parseInt(style.PrimaryColour.substr(4,2),16);
		style.c1a = (255-parseInt(style.PrimaryColour.substr(2,2),16))/255;

		style.c2r = parseInt(style.SecondaryColour.substr(8,2),16);
		style.c2g = parseInt(style.SecondaryColour.substr(6,2),16);
		style.c2b = parseInt(style.SecondaryColour.substr(4,2),16);
		style.c2a = (255-parseInt(style.SecondaryColour.substr(2,2),16))/255;

		style.c3r = parseInt(style.OutlineColour.substr(8,2),16);
		style.c3g = parseInt(style.OutlineColour.substr(6,2),16);
		style.c3b = parseInt(style.OutlineColour.substr(4,2),16);
		style.c3a = (255-parseInt(style.OutlineColour.substr(2,2),16))/255;

		style.c4r = parseInt(style.BackColour.substr(8,2),16);
		style.c4g = parseInt(style.BackColour.substr(6,2),16);
		style.c4b = parseInt(style.BackColour.substr(4,2),16);
		style.c4a = (255-parseInt(style.BackColour.substr(2,2),16))/255;

		ret += "stroke: rgba(" + style.c3r + "," + style.c3g + "," + style.c3b + "," + style.c3a + "); stroke-width: " + style.Outline + "px;";
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

		if (style.MarginV) {
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
