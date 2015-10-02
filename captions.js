window.requestAnimFrame = function(){
    return (
        window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ draw1){
            window.setTimeout(draw1, 1000/60);
        }
    );
}();
captionRenderer = function(video,captionFile) {
	var fontscale = 1;
	var parent = this;
	function caption(data) {
		var _this = this;
		this.data = data;
		this.div = null;
		this.pathProcessed = false;
		this.set = function (key,value) {
			_this.data[key] = value;
		//	_this.reload();
		}
		this.get = function(key) {
			return _this.data[key] ? _this.data[key] : "";
		}
		this.delete = function () {
			if(_this.div== null)
				return;
			if(_this.div.parentNode)
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
			if(_this.isPath && !_this.pathProcessed) {
				_this.pathProcessed = true;
				_this.delete();
				_this.div = null;
				_this.pepperYourAngus("path");
				pathSpec = _this.div.innerHTML;
				_this.div.setAttribute("d",pathSpec);
				_this.div.innerHTML = '';
				_this.pathProcessed = false;
			}
			_this.updateDivPosition();
			_this.updateAlignment();
			_this.update_timings();
		}
		this.updateTransitions = function() {
			_this.div.style.transition = "visibility 0s";
			for(key in _this.transitions) {
				var transition = _this.transitions[key];
				_this.div.style.transition += "," + transition;
			}
			//console.log(_this.div.style.transition);
		}
		this.updateTransforms = function() {
			_this.div.style.transform = '';
			for(key in _this.transforms) {
				var transform = _this.transforms[key];
				_this.div.style.transform += " " + transform;
			}

		}
		this.addMove = function(x1,y1,x2,y2,t1,t2) {
			if(t1 === undefined) t1=0;
			if(t2 === undefined) t2=(timeConvert(_this.get("End")) - timeConvert(_this.get("Start"))) * 1000;
			//console.log({x1,y1,x2,y2,t1,t2});
			_this.div.style.position = "absolute";
			_this.style.position.x = x1;
			_this.style.position.y = y1;
			_this.div.style.transition = "";
			_this.updateDivPosition();
			_this.updateAlignment();
			_this.updates["move"] = function(_this, t) {
				if(t < t1) t = t1;
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
			_this.updates["fade"] = function(_this, t) {
				if(t < t1) t = t1;
				if (t > t4) t = t4;
				if(t1 < t && t < t2) {
					_this.div.style.opacity = o1 + (o2 - o1) * (t-t1) / (t2-t1);
				}
				if(t2 < t && t < t3) {
					_this.div.style.opacity = o2;
				}
				if(t3 < t && t < t4) {
					_this.div.style.opacity = o2 + (o3 - o2) * (t-t3) / (t4-t3);
				}
			}
		}
		this.updateAlignment = function() {
			var height = _this.div.clientHeight * 2 / 3 || _this.style.Fontsize;	//Approximate font height
			if(_this.style.Alignment == "1" || _this.style.Alignment == "2" || _this.style.Alignment == "3"){
				_this.div.setAttribute("dy","0");
			}
			if(_this.style.Alignment == "4" || _this.style.Alignment == "5" || _this.style.Alignment == "6"){
				_this.div.setAttribute("dy",height/2);
			}
			if(_this.style.Alignment == "7" || _this.style.Alignment == "8" || _this.style.Alignment == "9"){
				_this.div.setAttribute("dy",height);
			}

			if(_this.style.Alignment == "1" || _this.style.Alignment == "4" || _this.style.Alignment == "7"){
				_this.div.setAttribute("text-anchor","start");
			}
			if(_this.style.Alignment == "2" || _this.style.Alignment == "5" || _this.style.Alignment == "8"){
				_this.div.setAttribute("text-anchor","middle");
			}
			if(_this.style.Alignment == "3" || _this.style.Alignment == "6" || _this.style.Alignment == "9"){
				_this.div.setAttribute("text-anchor","end");
			}
			if(!_this.style.position.x) {

				if ((_this.style.Alignment == "9") || (_this.style.Alignment == "6") || (_this.style.Alignment == "3")) {
					_this.div.setAttribute("x",parseFloat(getComputedStyle(document.querySelector("#caption_container")).width) - _this.style.MarginR);
				}
				if ((_this.style.Alignment == "8") || (_this.style.Alignment == "5") || (_this.style.Alignment == "2")) {
					_this.div.setAttribute("x",(parseFloat(getComputedStyle(document.querySelector("#caption_container")).width) - _this.style.MarginR + 1 * _this.style.MarginL)/2);
				}
				if ((_this.style.Alignment == "7") || (_this.style.Alignment == "4") || (_this.style.Alignment == "1")) {
					_this.div.setAttribute("x",_this.style.MarginL);
				}

				if ((_this.style.Alignment == "9") || (_this.style.Alignment == "8") || (_this.style.Alignment == "7")) {
					_this.div.setAttribute("y",_this.style.MarginV);
				}
				if ((_this.style.Alignment == "6") || (_this.style.Alignment == "5") || (_this.style.Alignment == "4")) {
					_this.div.setAttribute("y",parseFloat(getComputedStyle(document.querySelector("#caption_container")).height)/2);
				}
				if ((_this.style.Alignment == "1") || (_this.style.Alignment == "2") || (_this.style.Alignment == "3")) {
					_this.div.setAttribute("y",parseFloat(getComputedStyle(document.querySelector("#caption_container")).height) - _this.style.MarginV);
				}
			}

		}
		this.updateDivPosition = function() {
			if(_this.style.position.x) {
				_this.div.setAttribute("y",_this.style.position.y);
				_this.div.setAttribute("x",_this.style.position.x);
			}
			_this.div.style["transform-origin"] = (_this.div.getAttribute("x") + "px " + this.div.getAttribute("y") + "px 0px");
		}

		this.pepperYourAngus = function(type) {
			if(_this.div != null) {
				return;
			}
			if(!time) time = 0;
			if(!type) type = 'text';
			_this.div = document.createElementNS("http://www.w3.org/2000/svg",type);
			_this.reload();
		}
		this.start = function(time) {
			_this.pepperYourAngus();
			if(_this.div.parentNode) {
				return;
			}
			var div = document.getElementById("caption_container");
			var sep = div.getElementById("separator" + _this.data["Layer"]);
			div.insertBefore(_this.div,sep);
			_this.div.style.display = 'block';
			//console.log(_this);
		}
		this.stop = function() {
			if(!_this.div || !_this.div.parentNode) {
				return;
			}
			_this.div.style.display = 'none';
			_this.delete();
		}
		this.cleanup = function() {
			_this.stop();
			_this.div = null;
		}
		this.getAnchorOffset = function() {
			var tmp = _this.div.style.display;
			_this.div.style.display = 'block';
			ret = {
				x : video.offsetWidth/2,
				y: 2 * _this.div.offsetHeight/3
			};
			_this.div.style.display = tmp;
			return ret;
		}
		this.update_timings = function() {

		}
		this.addTransition= function(times,options,trans_n) {
			times = times.split(",");
			var intime = times[0] ? times[0] : 0;
			var outtime = times[1] ? times[1] : (timeConvert(_this.get("End")) - timeConvert(_this.get("Start"))) * 1000;
			var callback = function(_this){
				/*_this.div.queryselector(".transition"+trans_n).style =*/ var retThing = _this.override_to_html(options);
				var div = _this.div.querySelector(".transition"+trans_n);
				if(div == null) {
					div = _this.div;
				}
				div.style["transition"] = "all " + ((outtime - intime)/1000) + "s linear";
				for (x in retThing.style) {
					div.style[x] = retThing.style[x];
				}
				for (i in retThing.classes) {
					div.className += " " + retThing.classes[i];
				}
			};
			_this.callbacks[trans_n] = {"f": callback, "t":intime};
			//console.log({intime,outtime, options});
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
			for(key in overrides) {
				var match = overrides[key];
				line = line.replace(match,'');
			}
			var commands = line.match(/[MLml] -?[0-9]+ -?[0-9]+/g);
			for(key in commands) {
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
				var retval="<tspan style='";
				for (x in ret.style) {
					retval+=x + ": " + ret.style[x] + ";"
				}
				retval+="' class='";
				for (i = 0; i < ret.classes.length; i++) {
					retval+=ret.classes[i] + " ";
				}
				retval += "'>";
				//console.log(ret,retval);
				return retval;
			}
			function applyToDiv(ret) {
				for (x in ret.style) {
					_this.div.style[x] = ret.style[x];
				}
				retval=' ';
				for (i = 0; i < ret.classes.length; i++) {
					retval+=ret.classes[i] + " ";
				}
				_this.div.setAttribute("class", _this.div.getAttribute("class") + retval);
				//console.log(ret,retval);
			}
			for(key in overrides) {
				var match = overrides[key];
				var ret = _this.override_to_html(match);
				if(_this.isPath) {
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
			match = match.slice(1,-1); //Remove {,} tags.
			//console.log(match);
			options = match.split("\\").slice(1);	//Drop null match at beginning of string (before first '\')
			var ret = {style:{}, classes:[]};
			var transition = false;
			var transitionString = '';
			var transline = '';
			for (key in options) {
				var option = options[key].trim();
				if(transition) {
					transline += '\\' + option;
				} else {
					ret = _this.parse_override(option,ret);
				}
				if (option.slice(0,2) == "t(") {
					transition = true;
					transitionString = option.slice(2);
					transline = '';
				}
				if(option.slice(-1) == ")" && transline) {
					transline ="{" + transline.slice(0,-1)+"}";
					transition = false;
					_this.addTransition(transitionString,transline,_this.n_transitions);
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
				}
			}
			return _this.getSelfShadow(ret);
		}
		this.getSelfShadow = function(ret) {
				ret.style['stroke'] = 'rgba('+_this.style.c3r+','+_this.style.c3g+','+_this.style.c3b+','+_this.style.c3a+')';
				ret.style['stroke-width'] = _this.style.Outline/1+"px";
				ret.style['text-shadow'] = ((_this.style.Shadow  > 0) ? ("," + _this.style.Shadow + 'px '+_this.style.Shadow +'px 0px rgba('+_this.style.c4r+','+_this.style.c4g+','+_this.style.c4b+','+(_this.style.c4a * _this.style.c1a)+')') : 'none');
				return ret;
		}

		this.parse_override = function (option,ret) {
			var map = {
				"fn": function(arg,ret) {
					_this.style.Fontname=arg;
					ret.style["font-family"] = arg;
					return ret;
				},
				"fs": function(arg,ret) {
					_this.style.Fontsize = arg;
					ret.style["font-size"] = _this.style.Fontsize * fontscale + "px";
					return ret;
				},
				"fscx": function(arg,ret) {
					ret.style["font-size"] = (arg * _this.style.Fontsize * fontscale /100.0) + "px";
					return ret;
				},
				"fscy": function(arg,ret) {
					ret.style["font-size"] = (arg * _this.style.Fontsize * fontscale/100.0) + "px";
					return ret;
				},
				"frx": function(arg,ret) {
					_this.transforms["frx"] = "rotateX(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"fry": function(arg,ret) {
					_this.transforms["fry"] = "rotateY(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"frz": function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"fr": function(arg,ret) {
					_this.transforms["frz"] = "rotateZ(" + arg + "deg) ";
					_this.updateTransforms();
					return ret;
				},
				"fad(": function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var t1 = arg[0];
					var t2 = arg[1];
					_this.addFade(255,0,255,0,t1,(timeConvert(_this.get("End")) - timeConvert(_this.get("Start"))) * 1000 - t2,(timeConvert(_this.get("End")) - timeConvert(_this.get("Start"))) * 1000);
					return ret;
				},
				"fade(": function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var a1 = arg[0];
					var a2 = arg[1];
					var a3 = arg[2];
					var t1 = arg[3];
					var t2 = arg[4];
					var t3 = arg[5];
					var t4 = arg[6];
					_this.addFade(a1,a2,a3,t1,t2,t3,t4);
					return ret;
				},
				"bord": function(arg,ret) {
					_this.style.Outline = arg;
					return _this.getSelfShadow(ret);
				},
				"blur": function(arg,ret) {
					_this.style.Blur = arg;
					ret.style["filter"] = "blur(" + arg + "px)";
					return ret;
				},
				"c" : function(arg,ret) {
				//TODO _this.style - Go through and set relevant styles
					if(arg.substr(8,2) != "&") {
						_this.style.c1a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					_this.style.c1r=parseInt("0x"+arg.substr(6,2));
					_this.style.c1g=parseInt("0x"+arg.substr(4,2));
					_this.style.c1b=parseInt("0x"+arg.substr(2,2));
					ret.style['fill'] = 'rgba(' + _this.style.c1r + ',' + _this.style.c1g + ',' + _this.style.c1b + ',' + _this.style.c1a  +')';
					return _this.getSelfShadow(ret);
				},
				"1c" : function(arg,ret) {
				//TODO _this.style - Go through and set relevant styles
					if(arg.substr(8,2) != "&") {
						_this.style.c1a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					_this.style.c1r=parseInt("0x"+arg.substr(6,2));
					_this.style.c1g=parseInt("0x"+arg.substr(4,2));
					_this.style.c1b=parseInt("0x"+arg.substr(2,2));
					ret.style['fill'] = 'rgba(' + _this.style.c1r + ',' + _this.style.c1g + ',' + _this.style.c1b + ',' + _this.style.c1a  +')';
					return _this.getSelfShadow(ret);
				},
				"3c" : function(arg,ret) {
					if(arg.substr(8,2) != "&") {
						_this.style.c3a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					_this.style.c3r=parseInt("0x"+arg.substr(6,2));
					_this.style.c3g=parseInt("0x"+arg.substr(4,2));
					_this.style.c3b=parseInt("0x"+arg.substr(2,2));
					return _this.getSelfShadow(ret);
				},
				"alpha" : function(arg,ret) {
				//TODO _this.style - Go through and set relevant styles
					_this.style.c1a=1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c2a=1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c3a=1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					_this.style.c4a=1 - (parseInt("0x"+arg.substr(1,3))/255.0);
					ret.style['fill'] = 'rgba(' + _this.style.c1r + ',' + _this.style.c1g + ',' + _this.style.c1b + ',' + _this.style.c1a  +')';
					return _this.getSelfShadow(ret);
				},
				"1a" : function(arg,ret) {
				//TODO _this.style - Go through and set relevant styles
					_this.style.c1a=1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					ret.style['fill'] = 'rgba(' + _this.style.c1r + ',' + _this.style.c1g + ',' + _this.style.c1b + ',' + _this.style.c1a  +')';
					return _this.getSelfShadow(ret);
				},
				"3a" : function(arg,ret) {
					_this.style.c3a=1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					return _this.getSelfShadow(ret);
				},
				"pos(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var x = arg[0];
					var y = arg[1];
					_this.addMove(x,y,x,y);
					return ret;
				},
				"move(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var x1 = arg[0];
					var y1 = arg[1];
					var x2 = arg[2];
					var y2 = arg[3];
					var t1 = arg[4];
					var t2 = arg[5];
					_this.addMove(x1,y1,x2,y2,t1,t2)
					return ret;
				},
				"an" : function(arg,ret) {
					_this.style.Alignment = arg;
					return ret;
				},
				"p" : function(arg,ret) {
					_this.isPath = true;
					_this.style.outline = arg;
					div.style.fill = "none";
					div.style.stroke = 'rgba('+_this.style.c1r+','+_this.style.c1g+','+_this.style.c1b+','+_this.style.c1a+')';
					return ret;
				},
				"clip" : function(arg,ret) {
					return ret;
				},
				"r" : function(arg,ret) {
					var pos = _this.style.position;
					ret.classes.push(style_to_class(_this.data.Style));
					_this.style = JSON.parse(JSON.stringify(parent.style[_this.data.Style]));
					_this.style.position = pos;
					return ret;
				},
				"k" : function(arg,ret) {
					arg *=10;
					startTime = parseFloat(_this.karaokeTimer);
					endTime = parseFloat(_this.karaokeTimer) + parseFloat(arg);
					_this.addTransition(startTime + "," + startTime,"{\\_k}",_this.n_transitions);
					ret.style['fill'] = 'rgba('+_this.style.c2r+','+_this.style.c2g+','+_this.style.c2b+','+_this.style.c2a+')';
					ret.classes.push("transition"+_this.n_transitions);
					_this.n_transitions++;
					_this.karaokeTimer = endTime;
					return ret;
				},
				"kf" : function(arg,ret) {
					arg *=10;
					startTime = parseFloat(_this.karaokeTimer);
					endTime = parseFloat(_this.karaokeTimer) + parseFloat(arg);
					_this.addTransition(startTime + "," + endTime,"{\\_k}",_this.n_transitions);
					ret.style['fill'] = 'rgba('+_this.style.c2r+','+_this.style.c2g+','+_this.style.c2b+','+_this.style.c2a+')';
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
					ret.style['fill'] = 'rgba(' + _this.style.c1r + ',' + _this.style.c1g + ',' + _this.style.c1b + ',' + _this.style.c1a  +')';
					return ret;
				}
			}
			for(var i = option.length; i >= 0; i--) {
				if(map[option.slice(0,i)]) {
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
			if(!this.div) return;
			for(var key in _this.updates) {
				var callback = _this.updates[key];
				callback(_this,t * 1000);
			}
			for(var key in _this.callbacks) {
				var callback = _this.callbacks[key];
				if(callback["t"] < t * 1000)
				{
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

	function timeConvert(HMS) {
		var t = HMS.split(':');
		return t[0]*60*60 + t[1]* 60 + parseFloat(t[2]);
	}
	function process(captionGroup,time) {
//		document.querySelector("#caption_container").style.display = "none";
		var i=0;
		for(key in captionGroup) {
			var caption = captionGroup[key];
			i++;
			if(timeConvert(caption.get("Start")) < time && timeConvert(caption.get("End")) > time && !(caption.div && caption.div.parentNode)) {
				caption.start();
			}
			if(timeConvert(caption.get("Start")) < time && timeConvert(caption.get("End")) > time) {
				caption.update(time - timeConvert(caption.get("Start")));
			}
			if(timeConvert(caption.get("Start")) > (time) || timeConvert(caption.get("End")) < time && (caption.div && caption.div.parentNode)) {
				caption.stop();
				caption.cleanup();
			}
		}
//		document.querySelector("#caption_container").style.display = "block";
	}
	this.timeUpdate = function() {
		var lastTime = -1;
		time = video.currentTime;
		if(lastTime == time)
			return;
		lastTime = time;
		process(_this.captions,time);
	}

	this.renderCaptions = function(url) {
		var freq=new XMLHttpRequest();
		freq.open('get',url, true);
		freq.onreadystatechange = function() {
			if (freq.readyState != 4)  { return; }
			_this.init(freq.responseText);
		};
		freq.send();
	}

	this.resizeCaptions = function(timeout) {
		if(timeout === undefined) {
			timeout = 200;
		}
		if(_this.resizeRequest)
			return;
		_this.resizeRequest = setTimeout(function(){
			_this.resizeRequest = 0;
			if(!_this.assdata) {
				return; //We're not loaded, or deconstructed
			}
			_this.parse_head(_this.assdata.info);
			document.getElementById('caption_container').style.transform = "scale("+_this.scale+")";
			document.getElementById('caption_container').style.left = (window.innerWidth - video.offsetWidth) / (2) + "px";
			document.getElementById('caption_container').style.top = (window.innerHeight - video.offsetWidth * video.videoHeight / video.videoWidth) / (2) + "px";
		},timeout);
	}

	this.mainLoop = function() {
		if(_this.stopCaptions) return;
		if(video.paused) {
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
	this.init = function(text) {
		//video = document.querySelector("video");
		_this.assdata = ass2java(text);
		_this.update_titles_async(_this.assdata,addListeners);
		_this.stopCaptions = false;
		function addListeners() {
			video.addEventListener("pause",_this.pauseCaptions,false);
			window.addEventListener("resize",_this.resizeCaptions,false);
			document.addEventListener("mozfullscreenchange",_this.resizeCaptions,false);
			document.addEventListener("webkitfullscreenchange",_this.resizeCaptions,false);
			_this.resizeCaptions(0);
			requestAnimFrame(_this.mainLoop);
		}
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

	this.init_subs = function(subtitles) {
		_this.captions = [];
		var layers = [];
		for (key in subtitles) {
			//Use setTimeout to be asynchronous
			if(layers.indexOf(subtitles[key]["Layer"] * 1) == -1) {
				layers.push(subtitles[key]["Layer"] * 1);
			}
		}
		layers.sort(function(a,b) { return a-b; } );
		for(i=0;i<layers.length;i++) {
			if(!document.querySelector("#caption_container > #separator"+ layers[i])) {
				var d = document.createElement("text");
				d.setAttribute("id","separator"+ layers[i]);
				document.querySelector("#caption_container").appendChild(d);
			}
		}
		for (key in subtitles) {
			text = subtitles[key];
			//Use setTimeout to be asynchronous
			setTimeout(_this.captions.push.bind(_this.captions, new caption(text)),0);
		}
	}
	this.parse_head = function(info) {
		div = document.querySelector("#caption_container");
		div.setAttribute("height",info.PlayResY);
		div.setAttribute("width",info.PlayResX);
		_this.scale = Math.min(video.clientWidth/parseFloat(info.PlayResX),video.clientHeight/parseFloat(info.PlayResY));
	}

	function ass2java(asstext) {
		var captions = {};
		var assfile = asstext.split("\n");
		var last_tag = 0;
		var state = 0;
		for(var linecount = 0; linecount < assfile.length; linecount++) {
			assfile[linecount]=assfile[linecount].trim();
			if(assfile[linecount] == ('[Script Info]')) {
				parse_section(captions,state,assfile.slice(last_tag+1,linecount-1));
				state = 1;
				last_tag = linecount;
			}
			if(assfile[linecount] == ('[V4+ Styles]')) {
				parse_section(captions,state,assfile.slice(last_tag+1,linecount-1));
				state = 2;
				last_tag = linecount;
			}
			if(assfile[linecount] == ('[Events]')) {
				parse_section(captions,state,assfile.slice(last_tag+1,linecount-1));
				state = 3;
				last_tag = linecount;
			}
		}
		parse_section(captions,state,assfile.slice(last_tag+1,linecount));
		return captions;
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
				break;
			default:
				break;
		}
		return captions;
	}

	function parse_info(info_section) {
		var info = {};
		for(key in info_section) {
			var line = info_section[key];
			if(line.search(";") == 0)
				continue;
			var keyval = line.split(":");
			if(keyval.length != 2)
				continue;
			info[keyval[0]] = keyval[1].trim();
		}
		return info;
	}

	function parse_events(event_section) {
		var events = [];
		var header = event_section[0].replace("Format: ","");
		var map = header.split(", ");
		for(key in event_section) {
			var line = event_section[key];
			if(line.search("Dialogue: ") == -1)
				continue;
			var elems = line.replace("Dialogue: ","").split(",");
			var new_event = {};
			for(var i = 0; map[i] != "Text" && i < elems.length; i++) {
				new_event[map[i]] = elems[i];
			}
			if(map[i] == "Text") {
				new_event[map[i]] = elems.slice(i).join(",");
			}
			events.push(new_event);
		}
		return events;
	}

	function parse_styles(style_section) {
		var styles = {};
		var header = style_section[0].replace("Format: ","");
		var map = header.split(", ");
		for(key in style_section) {
			var line = style_section[key];
			if(line.search("Style: ") == -1)
				continue;
			var elems = line.replace("Style: ","").split(",");
			var new_style = {};
			for(var i = 0;i < elems.length; i++) {
				new_style[map[i]] = elems[i];
			}
			styles[new_style["Name"]] = new_style;
		}
		return styles;
	}

	this.write_styles = function(styles) {
		if(typeof(_this.style_css) === "undefined") {
			_this.style_css = document.createElement('style');
			_this.style_css.type = 'text/css';
			document.getElementsByTagName('head')[0].appendChild(_this.style_css);
		}
		_this.style_css.innerHTML = '';
		for(key in styles) {
			var style = styles[key];
			_this.style = styles;
			_this.style_css.innerHTML += "\n." + style_to_class(key) + " {\n" + style_to_css(style) + "}\n";
		}
	}

	function getOutlineShadow(px, colour) {
		var ret = '';
		var step=1;
		for(var i=-px;i<=px;i+=step) {
			for(var j=-px;j<=px;j+=step) {
				if(j*j + i*i <= px*px) {
					ret += i +"px " + j + "px 1px " + colour + ",\n";
				}
			}
		}
		return ret.slice(0,-2);
	}
	function style_to_css(style) {
		var ret = 'position:absolute;\n';
		if(typeof(style.Fontname) != "undefined"){
			ret += "font-family:" + style.Fontname + ";\n";
		}
		if(typeof(style.Fontsize) != "undefined"){
			ret += "font-size:" + (parseFloat(style.Fontsize) * fontscale).toFixed(2).toString() + "px;\n";
		}
		if((style.Italic) != 0){
			ret += "font-style:italic;\n";
		}
		if((style.Bold) != 0){
			ret += "font-weight:bold;\n";
		}

		style.c3r=parseInt("0x"+style.OutlineColour.substr(8,2));
		style.c3g=parseInt("0x"+style.OutlineColour.substr(6,2));
		style.c3b=parseInt("0x"+style.OutlineColour.substr(4,2));
		style.c3a=(255-parseInt("0x"+style.OutlineColour.substr(2,2)))/255;

		style.c4r=parseInt("0x"+style.BackColour.substr(8,2));
		style.c4g=parseInt("0x"+style.BackColour.substr(6,2));
		style.c4b=parseInt("0x"+style.BackColour.substr(4,2));
		style.c4a=(255-parseInt("0x"+style.BackColour.substr(2,2)))/255;

		style.c2r=parseInt("0x"+style.SecondaryColour.substr(8,2));
		style.c2g=parseInt("0x"+style.SecondaryColour.substr(6,2));
		style.c2b=parseInt("0x"+style.SecondaryColour.substr(4,2));
		style.c2a=(255-parseInt("0x"+style.SecondaryColour.substr(2,2)))/255;
		
		style.c1r=parseInt("0x"+style.PrimaryColour.substr(8,2));
		style.c1g=parseInt("0x"+style.PrimaryColour.substr(6,2));
		style.c1b=parseInt("0x"+style.PrimaryColour.substr(4,2));
		style.c1a=(255-parseInt("0x"+style.PrimaryColour.substr(2,2)))/255;
		
		ret+='stroke: rgba('+style.c3r+','+style.c3g+','+style.c3b+','+style.c3a+'); stroke-width: '+style.Outline/1+"px;";
		ret+='text-shadow: ' + ((style.Shadow  > 0) ? ("," + style.Shadow + 'px '+style.Shadow +'px 0px rgba('+style.c4r+','+style.c4g+','+style.c4b+','+(style.c4a * style.c1a)+')') : 'none') + ';';
		
		ret+='fill: rgba('+style.c1r+','+style.c1g+','+style.c1b+','+style.c1a+');\n';


		if(typeof(style.Alignment) != "undefined") {
			if ((style.Alignment == "9") || (style.Alignment == "6") || (style.Alignment == "3")) {
				ret+='text-align: right;\n';
			}
			if ((style.Alignment == "8") || (style.Alignment == "5") || (style.Alignment == "2")) {
				ret+='text-align: center;\n';
			}
			if ((style.Alignment == "7") || (style.Alignment == "4") || (style.Alignment == "1")) {
				ret+='text-align: left;\n';
			}

			if ((style.Alignment == "9") || (style.Alignment == "8") || (style.Alignment == "7")) {
				ret+='vertical-align: top;\n';
			}
			if ((style.Alignment == "6") || (style.Alignment == "5") || (style.Alignment == "4")) {
				ret+='vertical-align: middle;\n';
			}
			if ((style.Alignment == "1") || (style.Alignment == "2") || (style.Alignment == "3")) {
				ret+='vertical-align: bottom;\n';
			}
		}
//		width=video.clientWidth;
		/*if (style.MarginL != 0) {
			ret+='margin-left: '+style.MarginL +'px;\n';
			width -= style.MarginL;
		}
		//if (style.MarginR != 0) ret+='margin-right: -'+(style.MarginR+style.MarginL)+'px; ';
		if (style.MarginR != 0) {
			ret+='margin-right: '+(style.MarginR)+'px;\n';
			width -= style.MarginR;
		}
		ret+='width: ' + width + 'px;\n';*/
		if (style.MarginV != 0){
			ret+='margin-bottom: ' + (style.MarginV) +'px;\n';
			ret+='margin-top: ' + (style.MarginV) +'px;\n';
		} else {
			ret+='margin-top: 0px;\n'
			ret+='margin-bottom: 0px;\n'
		}

		return ret;
	}
	this.shutItDown = function() {
		video.removeEventListener("pause",_this.pauseCaptions,false);
		video.removeEventListener("play",_this.resumeCaptions,false);
		window.removeEventListener("resize",_this.resizeCaptions,false);
		document.removeEventListener("mozfullscreenchange",_this.resizeCaptions,false);
		document.removeEventListener("webkitfullscreenchange",_this.resizeCaptions,false);
		for(key in _this.captions) {
			var caption = _this.captions[key];
			clearTimeout(caption.startTimer);
			clearTimeout(caption.endTimer);
		}
		_this.captions = [];
		_this.stopCaptions = true;
		document.querySelector("#caption_container").innerHTML='';
	}
	var _this = this;
	this.renderCaptions(captionFile);
};

