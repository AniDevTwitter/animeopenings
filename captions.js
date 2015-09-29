window.requestAnimFrame = function(){
    return (
        window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function(/* function */ draw1){
            window.setTimeout(draw1, 0);
        }
    );
}();
captionRenderer = function(video,captionFile) {
	var fontscale = 1;
	var parent = this;
	function caption(data) {
		this.data = data;
		this.div = null;
		this.set = function (key,value) {
			self.data[key] = value;
		//	self.reload();
		}
		this.get = function(key) {
			return self.data[key] ? self.data[key] : "";
		}
		this.delete = function () {
			if(self.div== null)
				return;
			self.div.parentNode.removeChild(self.div);
		}
		this.loadData = function() {
			self.style = JSON.parse(JSON.stringify(parent.style[self.data.Style]));
			self.style.position = {};
		}
		this.reload = function() {
			self.callbacks = {};
			self.transitions = {};
			self.transforms = {};
			self.n_transitions = 0;
			self.loadData();
			self.div.className = style_to_class(self.data.Style);
			self.div.innerHTML = self.parse_text_line(self.data.Text);
			self.div.style["z-index"] = 9000 + 1 * this.get("Layer");
			self.updateDivPosition();
			self.updateAlignment();
			self.update_timings();
		}
		this.updateTransitions = function() {
			self.div.style.transition = "visibility 0s";
			for(key in self.transitions) {
				var transition = self.transitions[key];
				self.div.style.transition += "," + transition;
			}
			//console.log(self.div.style.transition);
		}
		this.updateTransforms = function() {
			self.div.style.transform = '';
			for(key in self.transforms) {
				var transform = self.transforms[key];
				self.div.style.transform += " " + transform;
			}

		}
		this.addMove = function(x1,y1,x2,y2,t1,t2) {
			if(t1 === undefined) t1=0;
			if(t2 === undefined) t2=(timeConvert(self.get("End")) - timeConvert(self.get("Start"))) * 1000;
			t1/=1000;
			t2/=1000;
			//console.log({x1,y1,x2,y2,t1,t2});
			self.div.style.position = "absolute";
			self.style.position.x = x1;
			self.style.position.y = y1;
			self.div.style.transition = "";
			self.updateDivPosition();
			self.updateAlignment();
			self.callbacks["move"] = {
				"f" :function(self)  {
					//console.log("Moving! " + t1 + " " + t2 + " " + x1 + " " + x2);
					self.transitions["movex"] = "left " + (t2-t1) + "s";
					self.transitions["movey"] = "top " + (t2-t1)+ "s";
					self.updateTransitions();
					self.style.position.x = x2;
					self.style.position.y = y2;
					self.updateDivPosition();
				},
				"t" : t1 * 1000
			}
		}
		this.addFade = function(a1,a2,a3,t1,t2,t3,t4) {
			self.transitions["opacity"] = "opacity " + (t2-t1)/1000 + "s";
			self.div.style.opacity = 1 - (a1/255.0);
			self.updateTransitions();
			var secondFade = function(self){
				self.transitions["opacity"] = "opacity " + (t4-t3)/1000 + "s";
				self.updateTransitions();
				self.div.style.opacity = 1 - (a3/255.0);
			};
			var firstFade = function(self){
				self.div.style.opacity = 1 - (a2/255.0);
			};

			self.callbacks["fade1"] = {"f" : firstFade, "t" : t1};
			self.callbacks["fade2"] = {"f" : secondFade, "t" : t3};
		}
		this.updateAlignment = function() {
			if(self.style.position.x) {
				if(self.transforms["aligny"]) {
					return;
				}
				if(self.style.Alignment == "1" || self.style.Alignment == "2" || self.style.Alignment == "3"){
					self.transforms["aligny"] = "translate(0,-100%)";
				}
				if(self.style.Alignment == "4" || self.style.Alignment == "5" || self.style.Alignment == "6"){
					self.transforms["aligny"] = "translate(0,-50%)";
				}
				if(self.style.Alignment == "7" || self.style.Alignment == "8" || self.style.Alignment == "9"){
					self.transforms["aligny"] = "translate(0,0)";
				}

				if(self.style.Alignment == "1" || self.style.Alignment == "4" || self.style.Alignment == "7"){
					self.transforms["alignx"] = "translate(0,0)";
				}
				if(self.style.Alignment == "2" || self.style.Alignment == "5" || self.style.Alignment == "8"){
					self.transforms["alignx"] = "translate(-50%,0)";
				}
				if(self.style.Alignment == "3" || self.style.Alignment == "6" || self.style.Alignment == "9"){
					self.transforms["alignx"] = "translate(-100%,0)";
				}
				self.updateTransforms();
				self.div.style.bottom='';
				self.div.style.width='';
			} else {

				if ((self.style.Alignment == "9") || (self.style.Alignment == "6") || (self.style.Alignment == "3")) {
					self.div.style.textAlign = "right";
				}
				if ((self.style.Alignment == "8") || (self.style.Alignment == "5") || (self.style.Alignment == "2")) {
					self.div.style.textAlign =  'center';
				}
				if ((self.style.Alignment == "7") || (self.style.Alignment == "4") || (self.style.Alignment == "1")) {
					self.div.style.textAlign = 'left';
				}

				if ((self.style.Alignment == "9") || (self.style.Alignment == "8") || (self.style.Alignment == "7")) {
					self.div.style.verticalAlign = "top";
				}
				if ((self.style.Alignment == "6") || (self.style.Alignment == "5") || (self.style.Alignment == "4")) {
					self.div.style.verticalAlign = "middle";
				}
				if ((self.style.Alignment == "1") || (self.style.Alignment == "2") || (self.style.Alignment == "3")) {
					self.div.style.verticalAlign = "bottom";
				}
			}

		}
		this.updateDivPosition = function() {
			if(self.style.position.x) {
				self.div.style.top = self.style.position.y + "px";
				self.div.style.left = self.style.position.x + "px";
			}
		}

		this.pepperYourAngus = function() {
			if(self.div != null) {
				return;
			}
			if(!time) time = 0;
			self.div = document.createElement('div');
			self.div.setAttribute("contentEditable","false");
			self.reload();
		}
		this.start = function(time) {
			self.pepperYourAngus();
			if(self.div.parentElement) {
				return;
			}
			document.getElementById("caption_container").appendChild(self.div);
			self.div.style.display = 'block';
			//console.log(self);
			for(key in self.callbacks) {
				var callback = self.callbacks[key];
				if(callback["ref"]) {
					clearTimeout(callback["ref"]);
				}
				callback["ref"] = setTimeout(callback["f"].bind(self,self),callback["t"] - (video.currentTime - timeConvert(self.get("Start"))) * 1000);
			}
		}
		this.stop = function() {
			if(!self.div || !self.div.parentElement) {
				return;
			}
			self.div.style.display = 'none';
			self.delete();
			for(key in self.callbacks) {
				var callback = self.callbacks[key];
				if(callback["ref"]) {
					clearTimeout(callback["ref"]);
				}
			}
		}
		this.cleanup = function() {
			self.stop();
			self.div = null;
		}
		this.getAnchorOffset = function() {
			var tmp = self.div.style.display;
			self.div.style.display = 'block';
			ret = {
				x : video.offsetWidth/2,
				y: 2 * self.div.offsetHeight/3
			};
			self.div.style.display = tmp;
			return ret;
		}
		this.update_timings = function() {

		}
		this.addTransition= function(times,options,trans_n) {
			times = times.split(",");
			var intime = times[0] ? times[0] : 0;
			var outtime = times[1] ? times[1] : (timeConvert(self.get("End")) - timeConvert(self.get("Start"))) * 1000;
			var callback = function(self){
				self.div.style.transition = "all 0s linear";
				self.updateDivPosition();
				self.transitions["bigguy"] = "all " + ((outtime - intime)/1000) + "s linear";
				self.updateTransitions();
				/*self.div.queryselector(".transition"+trans_n).style =*/ var retThing = self.override_to_html(options);
				var div = self.div.querySelector(".transition"+trans_n);
				div.style["transition"] = "all " + ((outtime - intime)/1000) + "s linear";
				for (x in retThing.style) {
					div.style[x] = retThing.style[x];
				}
				for (i in retThing.classes) {
					div.className += " " + retThing.classes[i];
				}
			};
			self.callbacks[trans_n] = {"f": callback, "t":intime};
			//console.log({intime,outtime, options});
		}
		this.parse_text_line = function (line) {
			line = line.replace(/</g,"&lt;");
			line = line.replace(/</g,"&gt;");
			line = line.replace(/\\h/g,"&nbsp;");
			line = line.replace(/\\N/g,"<br />");
			line = line.replace(/\\n/g,"\n");
			var overrides = line.match(/\{[^\}]*}/g);
			function cat(ret) {
				var retval="<span style='";
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
			for(key in overrides) {
				var match = overrides[key];
				line = line.replace(match,cat(self.override_to_html(match)));
				line = line + get_html_end_tags(match);
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
					ret = self.parse_override(option,ret);
				}
				if (option.slice(0,2) == "t(") {
					transition = true;
					transitionString = option.slice(2);
					transline = '';
				}
				if(option.slice(-1) == ")" && transline) {
					transline ="{" + transline.slice(0,-1)+"}";
					transition = false;
					self.addTransition(transitionString,transline,self.n_transitions);
					ret.classes.push("transition"+self.n_transitions);
					self.n_transitions++;
				}
			}
			return (ret);
		}
		this.getSelfShadow = function(ret) {
			if(ret.style['text-shadow'] == undefined)
				ret.style['text-shadow'] = ''
			ret.style['text-shadow'] = "0px 0px 0px rgba(" +self.style.c1r+','+self.style.c1g+','+self.style.c1b+','+self.style.c1a+")," + getOutlineShadow(self.style.Outline ,'rgba('+self.style.c3r+','+self.style.c3g+','+self.style.c3b+','+self.style.c3a+')') + ((self.style.Shadow  > 0) ? ("," + self.style.Shadow + 'px '+self.style.Shadow +'px 0px rgba('+self.style.c4r+','+self.style.c4g+','+self.style.c4b+','+(self.style.c4a * self.style.c1a)+')') : '');
			return ret;
		}

		this.parse_override = function (option,ret) {
			var map = {
				"fn": function(argi,ret) {
					self.style.Fontname=arg;
					ret.style["font-face"] = arg;
					return ret;
				},
				"fs": function(arg,ret) {
					self.style.Fontsize = arg;
					ret.style["font-size"] = self.style.Fontsize * fontscale + "px";
					return ret;
				},
				"fscx": function(arg,ret) {
					ret.style["font-size"] = (arg * self.style.Fontsize * fontscale /100.0) + "px";
					return ret;
				},
				"fscy": function(arg,ret) {
					ret.style["font-size"] = (arg * self.style.Fontsize * fontscale/100.0) + "px";
					return ret;
				},
				"frx": function(arg,ret) {
					if (!ret.style["transform"]) ret.style["transform"] = '';
					ret.style["transform"] += "rotateX(" + arg + "deg) ";
					return ret;
				},
				"fry": function(arg,ret) {
					if (!ret.style["transform"]) ret.style["transform"] = '';
					ret.style["transform"] += "rotateY(" + arg + "deg) ";
					return ret;
				},
				"fad(": function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var t1 = arg[0];
					var t2 = arg[1];
					self.addFade(255,0,255,0,t1,(timeConvert(self.get("End")) - timeConvert(self.get("Start"))) * 1000 - t2,(timeConvert(self.get("End")) - timeConvert(self.get("Start"))) * 1000);
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
					self.addFade(a1,a2,a3,t1,t2,t3,t4);
					return ret;
				},
				"bord": function(arg,ret) {
					self.style.Outline = arg;
					return self.getSelfShadow(ret);
				},
				"c" : function(arg,ret) {
				//TODO self.style - Go through and set relevant styles
					if(arg.substr(8,2) != "&") {
						self.style.c1a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					self.style.c1r=parseInt("0x"+arg.substr(6,2));
					self.style.c1g=parseInt("0x"+arg.substr(4,2));
					self.style.c1b=parseInt("0x"+arg.substr(2,2));
					ret.style['color'] = 'rgba(' + self.style.c1r + ',' + self.style.c1g + ',' + self.style.c1b + ',' + self.style.c1a  +')';
					return self.getSelfShadow(ret);
				},
				"1c" : function(arg,ret) {
				//TODO self.style - Go through and set relevant styles
					if(arg.substr(8,2) != "&") {
						self.style.c1a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					self.style.c1r=parseInt("0x"+arg.substr(6,2));
					self.style.c1g=parseInt("0x"+arg.substr(4,2));
					self.style.c1b=parseInt("0x"+arg.substr(2,2));
					ret.style['color'] = 'rgba(' + self.style.c1r + ',' + self.style.c1g + ',' + self.style.c1b + ',' + self.style.c1a  +')';
					return self.getSelfShadow(ret);
				},
				"3c" : function(arg,ret) {
					if(arg.substr(8,2) != "&") {
						self.style.c3a=1-(parseInt("0x"+arg.substr(2,2))/255.0);
						arg=arg.substr(2);
					}
					self.style.c3r=parseInt("0x"+arg.substr(6,2));
					self.style.c3g=parseInt("0x"+arg.substr(4,2));
					self.style.c3b=parseInt("0x"+arg.substr(2,2));
					return self.getSelfShadow(ret);
				},
				"alpha" : function(arg,ret) {
				//TODO self.style - Go through and set relevant styles
					self.style.c1a=1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					ret.style['color'] = 'rgba(' + self.style.c1r + ',' + self.style.c1g + ',' + self.style.c1b + ',' + self.style.c1a  +')';
					return self.getSelfShadow(ret);
				},
				"1a" : function(arg,ret) {
				//TODO self.style - Go through and set relevant styles
					self.style.c1a=1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					ret.style['color'] = 'rgba(' + self.style.c1r + ',' + self.style.c1g + ',' + self.style.c1b + ',' + self.style.c1a  +')';
					return self.getSelfShadow(ret);
				},
				"3a" : function(arg,ret) {
					self.style.c3a=1 - (parseInt("0x"+arg.slice(2,-1))/255.0);
					return self.getSelfShadow(ret);
				},
				"pos(" : function(arg,ret) {
					arg = arg.replace(")","").split(",");
					var x = arg[0];
					var y = arg[1];
					self.addMove(x,y,x,y);
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
					self.addMove(x1,y1,x2,y2,t1,t2)
					return ret;
				},
				"an" : function(arg,ret) {
					self.style.Alignment = arg;
					return ret;
				}
				
			}
			for(var i = option.length-1; i >= 0; i--) {
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
			return "</span>";
		}

		var self = this;
		self.loadData();
	}

	function style_to_class(text) {
		return "subtitle_" + text.replace(/ /g,"_");
	}

	function timeConvert(HMS) {
		var t = HMS.split(':');
		return t[0]*60*60 + t[1]* 60 + parseFloat(t[2]);
	}
	function process(captionGroup,time) {
		var i=0;
		for(key in captionGroup) {
			var caption = captionGroup[key];
			clearTimeout(caption.startTimer);
			caption.startTimer = 0;
			clearTimeout(caption.endTimer);
			caption.endTimer = 0;
			if(timeConvert(caption.get("Start")) < time && timeConvert(caption.get("End")) > time && !(caption.div && caption.div.parentElement)) {
				caption.pepperYourAngus();
				caption.start();
				continue;
			}
			if (timeConvert(caption.get("Start")) - 0.5 < (time) && timeConvert(caption.get("Start")) > time && !video.paused && !(caption.div && caption.div.parentElement)) {
				caption.pepperYourAngus();
				caption.startTimer = setTimeout(caption.start, (timeConvert(caption.get("Start")) - time) * 1000);
			}
			if (timeConvert(caption.get("End")) - 0.5 < time && time < timeConvert(caption.get("End"))&& !video.paused && (caption.div && caption.div.parentElement)) {
				caption.endTimer = setTimeout(caption.stop, (timeConvert(caption.get("End")) - time) * 1000);
			}
			if(timeConvert(caption.get("Start")) > (time) || timeConvert(caption.get("End")) < time && (caption.div && caption.div.parentElement)) {
				caption.stop();
			}
			if(timeConvert(caption.get("End")) < time && caption.div) {
				caption.cleanup();
			}
			i++;
		}
		console.log(i);
	}
	function timeUpdate() {
		time = video.currentTime;
		if(Math.abs(this.lastTime - time) < 0.25) {
			return;
		}
		this.lastTime = time;
		var timeslot = Math.round(time);
		process(self.captions,time);
	}

	this.renderCaptions = function(url) {
		var freq=new XMLHttpRequest();
		freq.open('get',url, true);
		freq.onreadystatechange = function() {
			if (freq.readyState != 4)  { return; }
			init(freq.responseText);
		};
		freq.send();
	}

	function resizeCaptions() {
		setTimeout(function(){
			parse_head(self.assdata.info);
			document.getElementById('caption_container').style.transform = "scale("+self.scale+")";
			if(self.scale > 1) {
				document.getElementById('caption_container').style["transform-origin"] = "50% 50% 0";
			} else {
				document.getElementById('caption_container').style["transform-origin"] = "0 50% 0";
			}
		},200);
	}

	function init(text) {
		//video = document.querySelector("video");
		self.assdata = ass2java(text);
		video.addEventListener("timeupdate",timeUpdate,false);
		window.addEventListener("resize",resizeCaptions,false);
		document.addEventListener("mozfullscreenchange",resizeCaptions,false);
		document.addEventListener("webkitfullscreenchange",resizeCaptions,false);
		parse_head(self.assdata.info);
		write_styles(self.assdata.styles);
		init_subs(self.assdata.events);
		resizeCaptions();
	}

	function update_titles(title_data) {
		parse_head(title_data.info);
		write_styles(title_data.styles);
		init_subs(title_data.events);
	}

	function init_subs(subtitles) {
		self.captions = [];
		for (key in subtitles) {
			text = subtitles[key];
			//Use setTimeout to be asynchronous
			setTimeout(self.captions.push.bind(self.captions,new caption(text)),0);
		}
	}
	function parse_head(info) {
		div = document.querySelector("#caption_container");
		div.style.height = info.PlayResY;
		div.style.width = info.PlayResX;
		self.scale = Math.min(video.clientWidth/parseFloat(info.PlayResX),video.clientHeight/parseFloat(info.PlayResY));
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

	function write_styles(styles) {
		if(typeof(self.style_css) === "undefined") {
			self.style_css = document.createElement('style');
			self.style_css.type = 'text/css';
			document.getElementsByTagName('head')[0].appendChild(self.style_css);
		}
		self.style_css.innerHTML = '';
		for(key in styles) {
			var style = styles[key];
			self.style = styles;
			self.style_css.innerHTML += "\n." + style_to_class(key) + " {\n" + style_to_css(style) + "}\n";
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
		
		style.c1r=parseInt("0x"+style.PrimaryColour.substr(8,2));
		style.c1g=parseInt("0x"+style.PrimaryColour.substr(6,2));
		style.c1b=parseInt("0x"+style.PrimaryColour.substr(4,2));
		style.c1a=(255-parseInt("0x"+style.PrimaryColour.substr(2,2)))/255;
		
		/*	if (navigator.userAgent.indexOf('WebKit/') > -1) {
			//webkit browsers support text stroke!
			ret+='-webkit-text-stroke-color: rgba('+c3r+','+c3g+','+c3b+','+c3a/255+');';
			ret+='-webkit-text-stroke-width: '+style.Outline+"px;";
			ret+='text-shadow: '+style.Shadow+'px '+style.Shadow+'px 0px rgba('+c4r+','+c4g+','+c4b+','+(c4a/255)+');';
		} else*/ {
			// workaround for text-stroke...
			ret+='text-shadow: \n'+"0px 0px 0px rgba(" +style.c1r+','+style.c1g+','+style.c1b+','+style.c1a+")," +  getOutlineShadow(style.Outline,'rgba('+style.c3r+','+style.c3g+','+style.c3b+','+style.c3a+')') + ',' + style.Shadow +'px '+style.Shadow+'px 0px rgba('+style.c4r+','+style.c4g+','+style.c4b+','+(style.c4a)+');' +'\n;';
		}
		ret+='color: rgba('+style.c1r+','+style.c1g+','+style.c1b+','+style.c1a+');\n';


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
		video.removeEventListener("timeupdate",timeUpdate);
		window.removeEventListener("resize",resizeCaptions);
		document.removeEventListener("mozfullscreenchange",resizeCaptions);
		document.removeEventListener("webkitfullscreenchange",resizeCaptions);
		for(key in self.captions) {
			var caption = self.captions[key];
			clearTimeout(caption.startTimer);
			clearTimeout(caption.endTimer);
		}
		self.captions = [];
		document.querySelector("#caption_container").innerHTML='';
	}
	self = this;
	this.renderCaptions(captionFile);
};

