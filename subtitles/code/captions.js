// A full list of supported features can be found here: https://github.com/AniDevTwitter/animeopenings/wiki/Subtitle-Features


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
	var parent = this;
	var time, lastTime = -1;
	var counter = 0;
	var fontsizes = {};
	var CC = document.getElementById("caption_container");
		CC.innerHTML = "<defs></defs>";

	var map = {
		"b" : function(_this,arg,ret) {
			if (arg && +arg) ret.style["font-weight"] = (arg == "1") ? "bold" : arg;
			else delete ret.style["font-weight"];
			return ret;
		},
		"i" : function(_this,arg,ret) {
			if (arg && +arg) ret.style["font-style"] = "italic";
			else delete ret.style["font-style"];
			return ret;
		},
		"u" : function(_this,arg,ret) {
			if (arg && +arg) {
				if (ret.style["text-decoration"]) ret.style["text-decoration"] = "underline line-through";
				else ret.style["text-decoration"] = "underline";
			} else {
				if (ret.style["text-decoration"].indexOf("line-through")+1) ret.style["text-decoration"] = "line-through";
				else delete ret.style["text-decoration"];
			}
			return ret;
		},
		"s" : function(_this,arg,ret) {
			if (arg && +arg) {
				if (ret.style["text-decoration"]) ret.style["text-decoration"] = "underline line-through";
				else ret.style["text-decoration"] = "line-through";
			} else {
				if (ret.style["text-decoration"].indexOf("underline")+1) ret.style["text-decoration"] = "underline";
				else delete ret.style["text-decoration"];
			}
			return ret;
		},
		"alpha" : function(_this,arg,ret) {
			arg = arg.slice(2,-1); // remove 'H' and '&'s
			var a = 1 - (parseInt(arg,16) / 255);
			_this.style.c1a = a; // primary fill
			_this.style.c2a = a; // secondary fill (for karaoke)
			_this.style.c3a = a; // border
			_this.style.c4a = a; // shadow
			return ret;
		},
		"1a" : function(_this,arg,ret) {
			_this.style.c1a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			return ret;
		},
		"2a" : function(_this,arg,ret) {
			_this.style.c2a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			return ret;
		},
		"3a" : function(_this,arg,ret) {
			_this.style.c3a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			return ret;
		},
		"4a" : function(_this,arg,ret) {
			_this.style.c4a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			return ret;
		},
		"a" : function(_this,arg,ret) {
			if (typeof(_this.style.Alignment) == "string") {
				if (arg == 0) arg = parseInt(parent.style[_this.style.Name].Alignment,10);
				else {
					arg = parseInt(arg,10);
					switch (arg) {
						case 5: arg = 7; break;
						case 6: arg = 8; break;
						case 7: arg = 9; break;
						case 9: arg = 4; break;
						case 10: arg = 5; break;
						case 11: arg = 6;
					}
				}
				_this.style.Alignment = arg;
			}
			return ret;
		},
		"an" : function(_this,arg,ret) {
			if (typeof(_this.style.Alignment) == "string") {
				if (arg == 0) arg = parent.style[_this.style.Name].Alignment;
				_this.style.Alignment = parseInt(arg,10);
			}
			return ret;
		},
		"be" : function(_this,arg,ret) {
			_this.style.Blur = arg;
			return ret;
		},
		"blur" : function(_this,arg,ret) {
			_this.style.Blur = arg;
			return ret;
		},
		"bord" : function(_this,arg,ret) {
			_this.style.Outline = arg;
			return ret;
		},
		"xbord" : function(_this,arg,ret) {
			return ret;
		},
		"ybord" : function(_this,arg,ret) {
			return ret;
		},
		"break" : function(_this,arg,ret) {
			if ((arg == "H") || (arg == "S" && ((_this.WrapStyle || parent.WrapStyle) == 2)))
				ret.Break = true;
			else ret.NoBreak = true;
			return ret;
		},
		"c" : function(_this,arg,ret) {
			return map["1c"](_this,arg,ret);
		},
		"1c" : function(_this,arg,ret) {
			if (arg.substr(8,2) != "&") {
				_this.style.c1a = 1 - (parseInt(arg.substr(2,2),16) / 255);
				arg = arg.substr(2);
			}
			_this.style.c1r = parseInt(arg.substr(6,2),16);
			_this.style.c1g = parseInt(arg.substr(4,2),16);
			_this.style.c1b = parseInt(arg.substr(2,2),16);
			return ret;
		},
		"2c" : function(_this,arg,ret) {
			if (arg.substr(8,2) != "&") {
				_this.style.c2a = 1 - (parseInt(arg.substr(2,2),16) / 255);
				arg = arg.substr(2);
			}
			_this.style.c2r = parseInt(arg.substr(6,2),16);
			_this.style.c2g = parseInt(arg.substr(4,2),16);
			_this.style.c2b = parseInt(arg.substr(2,2),16);
			return ret;
		},
		"3c" : function(_this,arg,ret) {
			if (arg.substr(8,2) != "&") {
				_this.style.c3a = 1 - (parseInt(arg.substr(2,2),16) / 255);
				arg = arg.substr(2);
			}
			_this.style.c3r = parseInt(arg.substr(6,2),16);
			_this.style.c3g = parseInt(arg.substr(4,2),16);
			_this.style.c3b = parseInt(arg.substr(2,2),16);
			return ret;
		},
		"4c" : function(_this,arg,ret) {
			if (arg.substr(8,2) != "&") {
				_this.style.c4a = 1 - (parseInt(arg.substr(2,2),16) / 255);
				arg = arg.substr(2);
			}
			_this.style.c4r = parseInt(arg.substr(6,2),16);
			_this.style.c4g = parseInt(arg.substr(4,2),16);
			_this.style.c4b = parseInt(arg.substr(2,2),16);
			return ret;
		},
		"clip(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			if (arg.length == 4) {
				
			}
			return ret;
		},
		"iclip(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			return ret;
		},
		"fad(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			var time = _this.data.Time;
			_this.addFade(255,0,255,0,arg[0],time-arg[1],time);
			return ret;
		},
		"fade(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			_this.addFade(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5],arg[6]);
			return ret;
		},
		"fax" : function(_this,arg,ret) {
			_this.transforms["fax"] = "matrix(1,0," + arg + ",1,0,0) ";
			return ret;
		},
		"fay" : function(_this,arg,ret) {
			_this.transforms["fay"] = "matrix(1," + arg + ",0,1,0,0) ";
			return ret;
		},
		"fn" : function(_this,arg,ret) {
			var size = getFontSize(arg,_this.style.Fontsize);
			_this.style.Fontname = arg;
			_this.style.Fontsize = size;
			ret.style["font-family"] = arg;
			ret.style["font-size"] = size + "px";
			return ret;
		},
		"fr" : function(_this,arg,ret) {
			return map["frz"](_this,arg,ret);
		},
		"frx" : function(_this,arg,ret) {
			_this.transforms["frx"] = "rotateX(" + arg + "deg) ";
			return ret;
		},
		"fry" : function(_this,arg,ret) {
			_this.transforms["fry"] = "rotateY(" + arg + "deg) ";
			return ret;
		},
		"frz" : function(_this,arg,ret) {
			_this.transforms["frz"] = "rotateZ(" + -(_this.style.Angle + parseFloat(arg)) + "deg) ";
			return ret;
		},
		"fs" : function(_this,arg,ret) {
			if (!arg || arg == "0") arg = parent.style[_this.style.Name].Fontsize;
			var size = getFontSize(_this.style.Fontname,arg);
			_this.style.Fontsize = size;
			ret.style["font-size"] = size + "px";
			return ret;
		},
		"fscx" : function(_this,arg,ret) {
			if (!arg || arg == "0") arg = parent.style[_this.style.Name].ScaleX;
			_this.ScaleX = arg;
			_this.transforms["fscx"] = "scaleX(" + arg / 100 + ") ";
			return ret;
		},
		"fscy" : function(_this,arg,ret) {
			if (!arg || arg == "0") arg = parent.style[_this.style.Name].ScaleY;
			_this.ScaleY = arg;
			_this.transforms["fscy"] = "scaleY(" + arg / 100 + ") ";
			return ret;
		},
		"fsp" : function(_this,arg,ret) {
			if (arg == "0") arg = _this.style.Spacing;
			ret.style["letter-spacing"] = arg + "px";
			return ret;
		},
		"k" : function(_this,arg,ret) {
			return setKaraokeColors(_this,arg,ret,false);
		},
		"K" : function(_this,arg,ret) {
			return map["kf"](_this,arg,ret);
		},
		"kf" : function(_this,arg,ret) {
			var startTime = _this.karaokeTimer;
			var endTime = startTime + arg * 10;

			var startColor = "rgba(" + _this.style.c2r + "," + _this.style.c2g + "," + _this.style.c2b + "," + _this.style.c2a + ")";
			var endColor = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
			var grad = "<lineargradient id='gradient" + counter + "'>";
				grad += "<stop offset='0' stop-color='" + endColor + "'></stop>";
				grad += "<stop stop-color='" + startColor + "'></stop></lineargradient>";
			document.getElementsByTagName("defs")[0].innerHTML += grad;

			if (!_this.kf) _this.kf = [counter];
			else _this.kf.push(counter);
			ret.style["fill"] = "url(#gradient" + counter + ")";
			ret.classes.push("kf"+counter);

			_this.updates["kf"+counter] = function(_this,t) {
				var ac = arguments.callee;

				if (!ac.start) {
					var range = document.createRange();
					range.selectNode(document.getElementsByClassName("kf" + ac.num)[0].firstChild);
					var eSize = range.getBoundingClientRect();
					var pSize = _this.div.getBoundingClientRect();
					ac.start = (eSize.left - pSize.left) / pSize.width;
					ac.frac = eSize.width / pSize.width;
					ac.gradStop = document.getElementById("gradient" + ac.num).firstChild;
				}

				if (t <= startTime) ac.gradStop.setAttribute("offset",ac.start);
				else if (startTime < t && t < endTime) {
					var val = ac.start + ac.frac * (t - startTime) / (endTime - startTime);
					ac.gradStop.setAttribute("offset",val);
				}
				else ac.gradStop.setAttribute("offset",ac.start+ac.frac);
			};
			_this.updates["kf"+counter].num = counter;

			++counter;
			_this.karaokeTimer = endTime;
			return ret;
		},
		"ko" : function(_this,arg,ret) {
			return setKaraokeColors(_this,arg,ret,true);
		},
		"kt" : function(_this,arg,ret) {
			_this.karaokeTimer = parseFloat(arg);
			return ret;
		},
		"_k" : function(_this,arg,ret) {
			ret.style.fill = "rgba(" + _this["k"+arg].r + "," + _this["k"+arg].g + "," + _this["k"+arg].b + "," + _this["k"+arg].a + ")";
			_this.style.c1r = _this["k"+arg].r;
			_this.style.c1g = _this["k"+arg].g;
			_this.style.c1b = _this["k"+arg].b;
			_this.style.c1a = _this["k"+arg].a;
			_this.style.c3a = _this["k"+arg].o;
			return ret;
		},
		"move(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			_this.addMove(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5])
			return ret;
		},
		"org(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			_this.tOrg = arg[0] + "px " + arg[1] + "px";
			return ret;
		},
		"p" : function(_this,arg,ret) {
			ret.hasPath = parseInt(arg,10);
			if (ret.hasPath) _this.pathOffset = 0;
			return ret;
		},
		"pbo" : function(_this,arg,ret) {
			_this.pathOffset = parseInt(arg,10);
			return ret;
		},
		"pos(" : function(_this,arg,ret) {
			arg = arg.slice(0,-1).split(",");
			_this.style.position.x = arg[0];
			_this.style.position.y = arg[1];
			return ret;
		},
		"q" : function(_this,arg,ret) {
			if (arg) _this.WrapStyle = parseInt(arg);
			else delete _this.WrapStyle;
			return ret;
		},
		"r" : function(_this,arg,ret) {
			var pos = _this.style.position;
			var style = (!arg ? _this.data.Style : (parent.style[arg] ? arg : _this.data.Style ));
			ret.classes.push("subtitle_" + style.replace(/ /g,"_"));
			_this.style = JSON.parse(JSON.stringify(parent.style[style]));
			_this.style.position = pos;
			return ret;
		},
		"shad" : function(_this,arg,ret) {
			_this.style.ShOffX = arg;
			_this.style.ShOffY = arg;
			return ret;
		},
		"xshad" : function(_this,arg,ret) {
			_this.style.ShOffX = arg;
			if (!_this.style.ShOffY) _this.style.ShOffY = 0;
			return ret;
		},
		"yshad" : function(_this,arg,ret) {
			if (!_this.style.ShOffX) _this.style.ShOffX = 0;
			_this.style.ShOffY = arg;
			return ret;
		}
	}

	function timeConvert(HMS) {
		var t = HMS.split(":");
		return t[0]*3600 + t[1]*60 + parseFloat(t[2]);
	}
	function getFontSize(font,size) {
		if (!fontsizes[font]) fontsizes[font] = {};

		if (!fontsizes[font][size]) {
			var smallE = document.createElementNS("http://www.w3.org/2000/svg","text");
				smallE.style.display = "block";
				smallE.style.fontFamily = font;
				smallE.style.fontSize = 100 + "px";
				smallE.style.opacity = 0;
				smallE.innerHTML = "Test";
			var bigE = document.createElementNS("http://www.w3.org/2000/svg","text");
				bigE.style.display = "block";
				bigE.style.fontFamily = font;
				bigE.style.fontSize = 300 + "px";
				bigE.style.opacity = 0;
				bigE.innerHTML = "Test";

			CC.appendChild(smallE);
			CC.appendChild(bigE);
			var scale = (200 / (bigE.getBoundingClientRect().height - smallE.getBoundingClientRect().height));
			smallE.remove();
			bigE.remove();

			fontsizes[font][size] = {"size" : size * (scale >= 1 ? 1 / scale : scale), "offset" : 0, "height" : 0};
			fontsizes[font][size].offset = -(size - fontsizes[font][size].size) / 4; // 4?

			var finalE = document.createElementNS("http://www.w3.org/2000/svg","text");
				finalE.style.display = "block";
				finalE.style.fontFamily = font;
				finalE.style.fontSize = fontsizes[font][size].size + "px";
				finalE.style.opacity = 0;
				finalE.innerHTML = "Test";
			CC.appendChild(finalE);
			fontsizes[font][size].height = finalE.getBoundingClientRect().height;
			finalE.remove();
		}

		return fontsizes[font][size].size;
	}
	function setKaraokeColors(_this,arg,ret,isko) { // for \k and \ko
		if (!_this.initialColors) {
			_this.initialColors = {
				"r" : _this.style.c1r,
				"g" : _this.style.c1g,
				"b" : _this.style.c1b,
				"a" : _this.style.c1a,
				"o" : _this.style.c3a
			};
		}

		_this["k"+counter] = {
			"r" : _this.initialColors.r,
			"g" : _this.initialColors.g,
			"b" : _this.initialColors.b,
			"a" : _this.initialColors.a,
			"o" : _this.initialColors.a
		};

		if (isko) _this.style.c3a = 0;
		else {
			ret.style.fill = "rgba(" + _this.style.c2r + "," + _this.style.c2g + "," + _this.style.c2b + "," + _this.style.c2a + ")";
			_this.style.c1r = _this.style.c2r;
			_this.style.c1g = _this.style.c2g;
			_this.style.c1b = _this.style.c2b;
			_this.style.c1a = _this.style.c2a;
		}

		ret.classes.push("transition" + counter);
		_this.addTransition(ret,_this.karaokeTimer + "," + _this.karaokeTimer, "\\_k" + counter, counter);
		_this.karaokeTimer += arg * 10;
		++counter;

		return ret;
	}

	function caption(data) {
		var _this = this;
		this.data = data;
		this.data.Start = timeConvert(this.data.Start);
		this.data.End = timeConvert(this.data.End);
		this.data.Time = (this.data.End - this.data.Start) * 1000;
		this.div = null;

		this.loadData = function() {
			_this.style = JSON.parse(JSON.stringify(parent.style[_this.data.Style]));
			_this.style.position = {};
		}
		this.start = function(time) {
			if (_this.div) return;
			_this.div = document.createElementNS("http://www.w3.org/2000/svg","text");

			_this.callbacks = {};
			_this.transforms = {};
			_this.updates = {};
			_this.loadData();
			_this.div.setAttribute("class","subtitle_" + _this.data.Style.replace(/ /g,"_"));

			if (_this.data.MarginL && _this.data.MarginL != 0) _this.div.style["margin-left"] = _this.data.MarginL;
			if (_this.data.MarginR && _this.data.MarginR != 0) _this.div.style["margin-right"] = _this.data.MarginR;
			if (_this.data.MarginV && _this.data.MarginV != 0) {
				_this.div.style["margin-top"] = _this.data.MarginV;
				_this.div.style["margin-bottom"] = _this.data.MarginV;
			}

			_this.div.innerHTML = _this.parse_text_line(_this.data.Text);
			_this.updateDivPosition();
			_this.updateAlignment();

			if (_this.div.parentNode) return;
			var layerGroup = CC.getElementById("layer"+_this.data.Layer);
			layerGroup.appendChild(_this.div);
			_this.div.style.display = "block";
			if (_this.box) _this.createBox();
			if (_this.paths) for (var path of _this.paths) layerGroup.insertBefore(path,_this.div);
		}
		this.createBox = function() {
			var TB = _this.box;
			var TD = _this.div;
			var TS = _this.style;
			var A = parseInt(TS.Alignment,10);
			var B = parseFloat(TB.style["stroke-width"]);
			var W = parseFloat(getComputedStyle(TD).width);
			var H = parseFloat(getComputedStyle(TD).height);
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
			CC.insertBefore(TB,TD);
		}
		this.createPath = function(line) {
			// Given an ASS "Dialogue:" line, this function finds the first path in the line and converts it
			// to SVG format. It then returns an object containing both versions of the path (ASS and SVG).
			
			line = line.slice(line.search(/\\p-?\d+/)+3);
			line = line.slice(line.indexOf("}")+1);
			if (line.indexOf("{")+1) line = line.slice(0,line.indexOf("{"));

			var path = line.toLowerCase();
			path = path.replace(/b/g,"C"); // cubic bezier curve to point 3 using point 1 and 2 as the control points
			path = path.replace(/c/g,"Z"); // close b-spline
			path = path.replace(/l/g,"L"); // line-to <x>, <y>
			path = path.replace(/m/g,"M"); // move-to <x>, <y>
			path = path.replace(/n/g,"M"); // move-to <x>, <y> (without closing shape)
			path = path.replace(/p/g,"");  // extend b-spline to <x>, <y>
			path = path.replace(/s/g,"C"); // 3rd degree uniform b-spline to point N, contains at least 3 coordinates

			return {"ass":line,"svg":path};
		}
		this.cleanup = function() {
			if (_this.box) _this.box.remove();
			if (_this.div) _this.div.remove();
			if (_this.kf) for (var num of _this.kf) document.getElementById("gradient" + num).remove();
			if (_this.paths) for (var path of _this.paths) path.remove();

			_this.box = null;
			_this.div = null;
			_this.kf = null;
			_this.paths = null;
		}

		this.parse_text_line = function (line) {
			_this.karaokeTimer = 0;
			if (line.charAt(0) != "{" && (line.indexOf("\\N") + line.indexOf("\\N")) > -2) line = "{\}" + line;
			line = line.replace(/</g,"&lt;");
			line = line.replace(/</g,"&gt;");
			line = line.replace(/\\h/g,"&nbsp;");
			line = line.replace(/\\N/g,"{\\breakH}"); // hard line break
			line = line.replace(/\\n/g,"{\\breakS}"); // soft line break
			function cat(ret) {
				if (ret.NoBreak) {
					ret.NoBreak = false;
					return " ";
				}
				var retval = "</tspan><tspan style=\"";
				for (var x in ret.style) retval += x + ":" + ret.style[x] + ";";
				retval += "\"";
				if (ret.Break) {
					if (ret.classes.length) retval += " class=\"" + ret.classes.join(" ") + " break\"";
					else retval += " class=\"break\"";
					ret.Break = false;
				} else if (ret.classes.length) retval += " class=\"" + ret.classes.join(" ") + "\"";
				retval += ">";
				return retval;
			}
			var overrides = line.match(/\{[^\}]*}/g) || ["}"];
			var ret = {style:{}, classes:[]};
			for (var match of overrides) { // match == "{...}"
				ret = _this.override_to_html(match,ret);
				if (ret.hasPath) {
					var path = _this.createPath(line);
					line = line.replace(path.ass,""); // remove .ass path commands
					var classes = _this.div.getAttribute("class");
					if (ret.classes.length) classes += " " + ret.classes.join(" ");
					var styles = "display:block;";
					for (var x in ret.style) styles += x + ":" + ret.style[x] + ";";
					var E = document.createElementNS("http://www.w3.org/2000/svg","path");
						E.setAttribute("d",path.svg);
						E.setAttribute("class",classes);
						E.setAttribute("style",styles);
					if (!_this.paths) _this.paths = [E];
					else _this.paths.push(E);
				}
				line = line.replace(match,cat(ret));
			}
			return line + "</tspan>";
		}
		this.override_to_html = function (match,ret) {
			match = match.slice(match.indexOf("\\")+1,-1); // Remove {,} tags and first "\"
			options = match.split("\\");
			var transition = 0;
			var transitionString = "";
			var transline = "";
			for (var key in options) {
				var option = options[key].trim();
				if (transition) {
					transline += "\\" + option;
					transition += option.split("(").length - 1;
					transition -= option.split(")").length - 1;
				}
				else if (option.slice(0,2) == "t(") {
					++transition;
					transitionString = option.slice(2,-1);
					transline = "";
				}
				else ret = _this.parse_override(option,ret);
				if (transline && !transition) {
					ret.classes.push("transition"+counter);
					_this.addTransition(ret,transitionString,transline.slice(0,-1),counter);
					++counter;
				}
			}
			_this.updateAlignment();
			_this.updateTransforms();
			ret = _this.updateColors(ret);
			ret = _this.updateShadows(ret);
			return ret;
		}
		this.parse_override = function (option,ret) {
			for (var i = option.length; i > 0; --i) {
				if (map[option.slice(0,i)]) {
					ret = map[option.slice(0,i)](_this,option.slice(i),ret);
					return ret;
				}
			}
			ret.classes.push(option);
			return ret;
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
		this.addMove = function(x1,y1,x2,y2,t1,t2,accel) {
			if (t1 === undefined) t1 = 0;
			if (t2 === undefined) t2 = _this.data.Time;
			if (accel === undefined) accel = 1;
			_this.style.position.x = x1;
			_this.style.position.y = y1;
			_this.updateDivPosition();
			_this.updateAlignment();
			_this.updates["move"] = function(_this,t) {
				if (t < t1) t = t1;
				if (t > t2) t = t2;
				var calc = Math.pow((t-t1)/(t2-t1),accel);
				_this.style.position.x = parseFloat(x1) + (x2 - x1) * calc;
				_this.style.position.y = parseFloat(y1) + (y2 - y1) * calc;
				_this.updateDivPosition();
				_this.updateAlignment();
			}
		}
		this.addTransition = function(ret,times,options,trans_n) {
			times = times.split(",");
			var intime, outtime, accel = 1;

			switch (times.length) {
				case 3:
					accel = parseFloat(times[2]);
				case 2:
					outtime = times[1];
					intime = times[0];
					break;
				case 1:
					if (times[0]) accel = parseFloat(times[0]);
					outtime = _this.data.Time;
					intime = 0;
			}

			if (options.indexOf("pos(") >= 0) {
				var pos = options.slice(options.indexOf("pos(")+4,options.indexOf(")")).split(",");
				options = options.replace(/\\pos\((\d|,)*\)/,"");
				_this.addMove(_this.style.position.x,_this.style.position.y,pos[0],pos[1],intime,outtime,accel);
			}

			if (options) {
				var callback = function(_this) {
					ret = _this.override_to_html(options+"}",ret);
					var divs = CC.getElementsByClassName("transition"+trans_n);
					var trans = "all " + ((outtime - intime)/1000) + "s ";
					if (accel == 1) trans += "linear";
					else {
						var cbc = fitCurve([[0,0],[0.25,Math.pow(0.25,accel)],[0.5,Math.pow(0.5,accel)],[0.75,Math.pow(0.75,accel)],[1,1]],50);
						// cubic-bezier(x1, y1, x2, y2)
						trans += "cubic-bezier(" + CBC[1][0] + "," + CBC[1][1] + "," + CBC[2][0] + "," + CBC[2][1] + ")";
					}
					_this.div.style["transition"] = trans; // for transitions that can only be applied to the entire line
					for (var div of divs) {
						div.style["transition"] = trans;
						for (var x in ret.style)
							div.style[x] = ret.style[x];
						for (var i in ret.classes)
							div.className += " " + ret.classes[i];
					}
				};
				_this.callbacks[trans_n] = {"f": callback, "t": intime};
			}
		}

		this.updateAlignment = function() {
			var TS = _this.style;
			var TD = _this.div;
			var F = getComputedStyle(TD).fontFamily || TS.Fontname;
				F = fontsizes[F] || fontsizes[F.slice(1,-1)];
			var S = parseInt(parent.style[TS.Name].Fontsize,10);
			var H = F[S].height;
			var O = F[S].offset;
			var A = parseInt(TS.Alignment,10);
			var SA = TD.setAttribute.bind(TD);
			var BR = TD.getElementsByClassName("break");

			if (TS.position.x) {
				if (A > 6) SA("dy",H+O); // 7, 8, 9
				else if (A < 4) SA("dy",O); // 1, 2, 3
				else SA("dy",H/2+O); // 4, 5, 6

				if (A%3 == 0) SA("text-anchor","end"); // 3, 6, 9
				else if ((A+1)%3 == 0) SA("text-anchor","middle"); // 2, 5, 8
				else SA("text-anchor","start"); // 1, 4, 7
			} else {
				var CS = getComputedStyle(CC);
				var D = _this.data;

				var MarginL = ((D.MarginL && D.MarginL != 0) ? D.MarginL : TS.MarginL);
				var MarginR = ((D.MarginR && D.MarginR != 0) ? D.MarginR : TS.MarginR);
				var MarginV = ((D.MarginV && D.MarginV != 0) ? D.MarginV : TS.MarginV);

				if (A > 6) { // 7, 8, 9
					SA("dy",H+O);
					SA("y",MarginV);
				} else if (A < 4) { // 1, 2, 3
					SA("dy",O);
					SA("y",parseFloat(CS.height)-MarginV-H*BR.length);
				} else { // 4, 5, 6
					SA("dy",H/2+O);
					SA("y",(parseFloat(CS.height)-H*BR.length)/2);
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

			if (BR.length) {
				var xVal;

				if (TS.position.x) xVal = TS.position.x;
				else {
					var W = parseFloat(getComputedStyle(CC).width);
					var D = _this.data;

					var MarginL = ((D.MarginL && D.MarginL != 0) ? D.MarginL : TS.MarginL);
					var MarginR = ((D.MarginR && D.MarginR != 0) ? D.MarginR : TS.MarginR);
					var MarginV = ((D.MarginV && D.MarginV != 0) ? D.MarginV : TS.MarginV);
					
					if (A%3 == 0) xVal = W-MarginR;
					else if ((A+1)%3 == 0) xVal = ((MarginR-MarginL)/2)+(W/2);
					else xVal = MarginL;
				}

				TD.firstChild.setAttribute("x",xVal);
				for (var B of BR) {
					B.setAttribute("x",xVal);
					B.setAttribute("dy","1em");
				}
			}
		}
		this.updateColors = function(ret) {
			if (!ret.style["fill"] || (ret.style["fill"] && (ret.style["fill"].slice(0,4) != "url("))) ret.style["fill"] = "rgba(" + _this.style.c1r + "," + _this.style.c1g + "," + _this.style.c1b + "," + _this.style.c1a + ")";
			ret.style["stroke"] = "rgba(" + _this.style.c3r + "," + _this.style.c3g + "," + _this.style.c3b + "," + _this.style.c3a + ")";
			ret.style["stroke-width"] = _this.style.Outline + "px";
			return ret;
		}
		this.updateDivPosition = function() {
			if (_this.style.position.x) {
				_this.div.setAttribute("x",_this.style.position.x);
				_this.div.setAttribute("y",_this.style.position.y);
			}
			_this.updateTransforms();
		}
		this.updateShadows = function(ret) {
			var fillColor = ret.style["fill"];
			var borderColor = ret.style["stroke"];
			var shadowColor = "rgba(" + _this.style.c4r + "," + _this.style.c4g + "," + _this.style.c4b + "," + _this.style.c4a + ")";
			_this.div.style["filter"] = "";
			if (_this.style.BorderStyle != 3) { // Outline and Shadow
				if (_this.style.Blur) // \be, \blur
					_this.div.style["filter"] += "drop-shadow( 0 0 " + _this.style.Blur + "px " + (_this.style.Outline ? borderColor : fillColor) + ") ";
				if (_this.style.ShOffX != 0 || _this.style.ShOffY != 0) // \shad, \xshad, \yshad
					_this.div.style["filter"] += "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px 0 " + shadowColor + ")";
			} else { // Border Box
				if (!_this.box) _this.box = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				_this.box.setAttribute("fill", borderColor);
				_this.box.style["stroke"] = (_this.style.Outline ? borderColor : fillColor);
				_this.box.style["stroke-width"] = ret.style["stroke-width"];
				ret.style["stroke-width"] = "0px";

				if (_this.style.Blur) // \be, \blur
					_this.div.style["filter"] = "drop-shadow( 0 0 " + _this.style.Blur + "px " + fillColor + ")";
				if (_this.style.ShOffX != 0 || _this.style.ShOffY != 0) // \shad, \xshad, \yshad
					_this.box.style["filter"] = "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px 0 " + shadowColor + ")";
				else _this.box.style["filter"] = "";
			}
			if (_this.paths) {
				for (var path of _this.paths) {
					path.style["filter"] = ""
					if (_this.style.Blur) // \be, \blur
						path.style["filter"] += "drop-shadow( 0 0 " + _this.style.Blur + "px " + (_this.style.Outline ? borderColor : fillColor) + ") ";
					if (_this.style.ShOffX != 0 || _this.style.ShOffY != 0) // \shad, \xshad, \yshad
						path.style["filter"] += "drop-shadow(" + _this.style.ShOffX + "px " + _this.style.ShOffY + "px 0 " + shadowColor + ")";
				}
			}
			return ret;
		}
		this.updateTransforms = function() {
			if (_this.style.Angle && !_this.transforms["frz"]) _this.transforms["frz"] = "rotateZ(" + (-_this.style.Angle) + "deg) ";
			if (_this.style.ScaleX != 100 && !_this.transforms["fscx"])
				_this.transforms["fscx"] = "scaleX(" + _this.style.ScaleX / 100 + ") ";
			if (_this.style.ScaleY != 100 && !_this.transforms["fscy"])
				_this.transforms["fscy"] = "scaleY(" + _this.style.ScaleY / 100 + ") ";

			var divX = parseFloat(_this.div.getAttribute("x"));
			var divY = parseFloat(_this.div.getAttribute("y"));
			var origin = _this.tOrg || (divX + "px " + divY + "px");
			var transforms = "";

			if (Object.keys(_this.transforms).length) {
				for (var key in _this.transforms) transforms += _this.transforms[key];

				if (_this.paths) {
					var BBox, X, Y;
					try {BBox = _this.div.getBBox();}catch(e){;}
					if (BBox && (BBox.x || BBox.y)) {
						X = BBox.x;
						Y = BBox.y;
					} else {
						X = _this.style.position.x;
						Y = _this.style.position.y;
					}
					Y = parseFloat(Y) + _this.pathOffset;
					var pTransform = "translate(" + X + "px," + Y + "px) ";
						pTransform += transforms;
					for (var path of _this.paths) path.style.transform = pTransform;
				}
			}

			_this.div.style.transform = transforms;
			_this.div.style["transform-origin"] = origin;
			if (_this.box) _this.box.style.transform = transforms;
			if (_this.box) _this.box.style["transform-origin"] = origin;
			if (_this.kf) {
				for (var num of _this.kf) {
					document.getElementById("gradient" + num).setAttribute("gradient-transform", "translate(" + divX + "px," + divY + "px) " + transforms + "translate(" + (-divX) + "px," + (-divY) + "px)");
				}
			}
		}

		this.update = function(t) {
			if (!this.div) return;
			var time = t * 1000;
			for (var key in _this.updates)
				_this.updates[key](_this,time);
			for (var key in _this.callbacks) {
				var callback = _this.callbacks[key];
				if (callback["t"] <= time) {
					callback["f"](_this);
					delete _this.callbacks[key];
				}
			}
		}
	}

	this.timeUpdate = function() {
		time = video.currentTime - _this.TimeOffset;
		if (Math.abs(time-lastTime) < SPF) return;
		lastTime = time;

		for (var C of _this.captions) {
			if (C.data.Start <= time && time <= C.data.End) {
				if (C.div && C.div.parentNode) C.update(time - C.data.Start);
				else C.start();
			} else if (C.div && C.div.parentNode)
				C.cleanup();
		}
	}

	this.resizeCaptions = function(timeout) {
		if (timeout === undefined) timeout = 200;
		if (_this.resizeRequest) return;
		_this.resizeRequest = setTimeout(function() {
			_this.resizeRequest = 0;
			if (!_this.assdata) return; // We're not loaded, or deconstructed
			_this.parse_head(_this.assdata.info);
			CC.style.transform = "scale(" + _this.scale + ")";
			CC.style.left = (window.innerWidth - video.offsetWidth) / (2) + "px";
			CC.style.top = (window.innerHeight - video.offsetWidth * video.videoHeight / video.videoWidth) / (2) + "px";
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
		CC.setAttribute("height",info.PlayResY);
		CC.style.height = info.PlayResY + "px";
		CC.setAttribute("width",info.PlayResX);
		CC.style.width = info.PlayResX + "px";
		_this.scale = Math.min(video.clientWidth/parseFloat(info.PlayResX),video.clientHeight/parseFloat(info.PlayResY));
		_this.TimeOffset = parseFloat(info.TimeOffset) || 0;
		if (info.WrapStyle) _this.WrapStyle = parseInt(info.WrapStyle);
		else _this.WrapStyle = 2;
	}
	this.write_styles = function(styles) {
		if (typeof(_this.style_css) === "undefined") {
			_this.style_css = document.createElement("style");
			_this.style_css.type = "text/css";
			document.getElementsByTagName("head")[0].appendChild(_this.style_css);
		}
		var text = "";
		for (var key in styles) text += "\n.subtitle_" + key.replace(/ /g,"_") + " {\n" + style_to_css(styles[key]) + "}\n";
		_this.style = styles;
		_this.style_css.innerHTML = text;
	}
	this.init_subs = function(subtitles) {
		_this.captions = [];
		var layers = {};
		for (var line of subtitles) {
			layers[line.Layer] = true;
			setTimeout(_this.captions.push.bind(_this.captions,new caption(line)),0);
		}
		for (var layer of Object.keys(layers)) {
			var d = document.createElementNS("http://www.w3.org/2000/svg","g");
				d.setAttribute("id","layer"+layer);
			CC.appendChild(d);
		}
	}

	function parse_info(info_section) {
		var info = {};
		for (var line of info_section) {
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
		for (var line of style_section) {
			if (line.search("Style: ") == -1)
				continue;
			var elems = line.replace("Style: ","").split(",");
			var new_style = {};
			for (var i = 0; i < elems.length; ++i)
				new_style[map[i]] = elems[i];
			styles[new_style.Name] = new_style;
		}
		return styles;
	}
	function parse_events(event_section) {
		var events = [];
		var header = event_section[0].replace("Format: ","");
		var map = header.split(", ");
		for (var line of event_section) {
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
			ret += "font-size:" + getFontSize(style.Fontname,style.Fontsize) + "px;\n";
		if (+style.Bold) ret += "font-weight:bold;\n";
		if (+style.Italic) ret += "font-style:italic;\n";
		if (+style.Underline || +style.StrikeOut) {
			ret += "text-decoration:";
			if (+style.Underline) ret += " underline";
			if (+style.StrikeOut) ret += " line-through";
			ret += ";\n";
		}
		if (!style.ScaleX) style.ScaleX = 100;
		if (!style.ScaleY) style.ScaleY = 100;

		if (style.Spacing) ret += "letter-spacing:" + style.Spacing + "px;\n";
		else style.Spacing = "0";

		if (!style.PrimaryColour) style.PrimaryColour = "&HFFFFFFFF";
		style.c1r = parseInt(style.PrimaryColour.substr(8,2),16);
		style.c1g = parseInt(style.PrimaryColour.substr(6,2),16);
		style.c1b = parseInt(style.PrimaryColour.substr(4,2),16);
		style.c1a = (255-parseInt(style.PrimaryColour.substr(2,2),16))/255;

		if (!style.SecondaryColour) style.SecondaryColour = "&HFFFFFFFF";
		style.c2r = parseInt(style.SecondaryColour.substr(8,2),16);
		style.c2g = parseInt(style.SecondaryColour.substr(6,2),16);
		style.c2b = parseInt(style.SecondaryColour.substr(4,2),16);
		style.c2a = (255-parseInt(style.SecondaryColour.substr(2,2),16))/255;

		if (!style.OutlineColour) style.OutlineColour = "&HFFFFFFFF";
		style.c3r = parseInt(style.OutlineColour.substr(8,2),16);
		style.c3g = parseInt(style.OutlineColour.substr(6,2),16);
		style.c3b = parseInt(style.OutlineColour.substr(4,2),16);
		style.c3a = (255-parseInt(style.OutlineColour.substr(2,2),16))/255;

		if (!style.BackColour) style.BackColour = "&HFFFFFFFF";
		style.c4r = parseInt(style.BackColour.substr(8,2),16);
		style.c4g = parseInt(style.BackColour.substr(6,2),16);
		style.c4b = parseInt(style.BackColour.substr(4,2),16);
		style.c4a = (255-parseInt(style.BackColour.substr(2,2),16))/255;

		if (!style.Angle) style.Angle = 0;
		else style.Angle = parseFloat(style.Angle);
		if (style.Encoding && style.Encoding == 128 && style.Angle == 270) {
			// Encoding 128 = Shift-JIS
			style.Angle = 0;
			ret += "writing-mode: vertical-rl;\n";
		}

		if (!style.BorderStyle) style.BorderStyle = 1;
		if (!style.Outline) style.Outline = 0;

		if (+style.Shadow) {
			if (style.Outline == 0) style.Outline = 1;
			style.ShOffX = style.Shadow;
			style.ShOffY = style.Shadow;
		} else {
			style.ShOffX = 0;
			style.ShOffY = 0;
		}

		ret += "stroke: rgba(" + style.c3r + "," + style.c3g + "," + style.c3b + "," + style.c3a + "); stroke-width: " + style.Outline + "px;";
		ret += "fill: rgba(" + style.c1r + "," + style.c1g + "," + style.c1b + "," + style.c1a + ");\n";


		if (!style.Alignment) style.Alignment = "7";
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


		if (!style.MarginL) style.MarginL = "0";
		if (!style.MarginR) style.MarginR = "0";

		if (!style.MarginV) style.MarginV = "0";
		ret += "margin-top: " + style.MarginV + "px;\n";
		ret += "margin-bottom: " + style.MarginV + "px;\n";

		return ret;
	}

	this.shutItDown = function() {
		video.removeEventListener("pause",_this.pauseCaptions,false);
		video.removeEventListener("play",_this.resumeCaptions,false);
		window.removeEventListener("resize",_this.resizeCaptions,false);
		document.removeEventListener("mozfullscreenchange",_this.resizeCaptions,false);
		document.removeEventListener("webkitfullscreenchange",_this.resizeCaptions,false);
		for (var C of _this.captions) {
			clearTimeout(C.startTimer);
			clearTimeout(C.endTimer);
		}
		fontsizes = {};
		_this.captions = [];
		_this.stopCaptions = true;
		CC.innerHTML = "<defs></defs>";
	}

	var _this = this;
	var freq = new XMLHttpRequest();
	freq.open("get",captionFile,true);
	freq.onreadystatechange = function() {
		if (freq.readyState != 4) return;
		_this.init(freq.responseText);
	};
	freq.send();
};
