// A full list of supported features can be found here: https://github.com/AniDevTwitter/animeopenings/wiki/Subtitle-Features

/* List of Methods
Name				Arguments				Description
add					video[,filepath[,show]]	Adds subtitles to the given <video> element. Can also set the subtitle file to use and start showing it.
remove				video					Removes subtitles from the given <video> element.
show				video					Makes the subtitles associated with the given <video> element visible.
hide				video					Hides the subtitles associated with the given <video> element.
visible				video					Whether or not the subtitles associated with the given <video> element are currently visible.
setSubtitleFile		video,filepath			Sets/Changes the subtitle file to use for the given <video> element.
setBorderStyle		video,style				Sets the Border Style of the lines in the subtitle file used by the given <video> element.
											0	Use the styles specified in the subtitle file.
											1	Use Border Style 1 (text has an outline and a shadow)
											3	Use Border Style 3 (text outline becomes a background which has a shadow)
											4	Use Border Style 4 (text has an outline and its shadow becomes a background)
reload				video					Reloads the subtitle file used by the given <video> element.
*/

let SubtitleManager = (function() {
	"use strict";

	// from https://github.com/Yay295/fitCurves
	function fitCurve(points) {
		var add = (A,B) => [A[0]+B[0],A[1]+B[1]];
		var subtract = (A,B) => [A[0]-B[0],A[1]-B[1]];
		var multiply = (A,B) => [A[0]*B,A[1]*B];
		var divide = (A,B) => [A[0]/B,A[1]/B];
		var dot = (A,B) => A[0]*B[0]+A[1]*B[1];
		var norm = A => Math.sqrt((A[0]*A[0])+(A[1]*A[1]));
		var normalize = v => divide(v,norm(v));

		function bezier(ctrlPoly,t) {
			let tx = 1 - t;
			return	add(add(multiply(ctrlPoly[0], tx * tx * tx), multiply(ctrlPoly[1], 3 * tx * tx * t)), add(multiply(ctrlPoly[2], 3 * tx * t * t), multiply(ctrlPoly[3], t * t * t)));
		}

		points = points.filter((point,i) => (i === 0 || !(point[0] === points[i-1][0] && point[1] === points[i-1][1])));
		var len = points.length;
		if (len < 2) return [];

		var leftTangent = normalize(subtract(points[1],points[0]));
		var rightTangent = normalize(subtract(points[len-2],points[len-1]));
		if (len === 2) {
			var dist = norm(subtract(points[0], points[1])) / 3;
			return [points[0], add(points[0], multiply(leftTangent, dist)), add(points[1], multiply(rightTangent, dist)), points[1]];
		}

		var u = [0];
		for (let i = 1; i < len; ++i)
			u.push(u[i-1] + norm(subtract(points[i],points[i-1])));
		for (let i = 0; i < len; ++i)
			u[i] /= u[len-1];

		var bezCurve = [points[0], points[0], points[len-1], points[len-1]];
		var C = [0,0,0,0];
		var X = [0,0];

		for (let i = 0; i < len; ++i) {
			var ui = u[i];
			var ux = 1 - ui;
			var A = multiply(leftTangent, 3 * ux * ux * ui);
			var B = multiply(rightTangent, 3 * ux * ui * ui);

			C[0] += dot(A,A);
			C[1] += dot(A,B);
			C[2] += dot(A,B);
			C[3] += dot(B,B);

			var tmp = subtract(points[i],bezier(bezCurve,ui));
			X[0] += dot(A,tmp);
			X[1] += dot(B,tmp);
		}

		var det_C0_C1 = (C[0] * C[3]) - (C[2] * C[1]);
		var det_C0_X  = (C[0] * X[1]) - (C[2] * X[0]);
		var det_X_C1  = (X[0] * C[3]) - (X[1] * C[1]);
		var alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
		var alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;
		var segLength = norm(subtract(points[0], points[len-1]));
		var epsilon = 1.0e-6 * segLength;

		if (alpha_l < epsilon || alpha_r < epsilon)
			alpha_l = alpha_r = segLength / 3;
		bezCurve[1] = add(bezCurve[0], multiply(leftTangent, alpha_l));
		bezCurve[2] = add(bezCurve[3], multiply(rightTangent, alpha_r));

		return bezCurve;
	}
	// from https://github.com/Yay295/Compiled-Trie
	function generate_compiled_trie(keys) {
		let codes = keys.map(key => [].map.call(key, c => c.charCodeAt(0)));

		function get_next(root, code, i) {
			let num = code[i];
			if (num === undefined) root.set(NaN, NaN);
			else root.set(num, get_next(root.has(num) ? root.get(num) : new Map(), code, i + 1));
			return root;
		}
		let trie = new Map();
		for (let code of codes) {
			let num = code[0];
			trie.set(num, get_next(trie.has(num) ? trie.get(num) : new Map(), code, 1));
		}

		function to_conditional(root,i) {
			if (root.size == 1) {
				let [key,value] = root.entries().next().value;
				if (isNaN(key)) return [`return ${i};`];
				else return [
					`if (str.charCodeAt(${i}) === ${key}) {`,
						...to_conditional(value, i + 1).map(line => "\t" + line),
					"}"
				];
			} else {
				let has_end = false, lines = [`switch (str.charCodeAt(${i})) {`];
				for (let [code,value] of root) {
					if (isNaN(code)) has_end = true;
					else lines.push(
						`\tcase ${code}:`,
						...to_conditional(value,i+1).map(line => "\t\t" + line),
						"\t\tbreak;"
					);
				}
				if (has_end) lines.push("\tdefault:",`\t\treturn ${i};`);
				lines.push("}");
				return lines;
			}
		}
		let code = to_conditional(trie,0).join("\n");

		return new Function("str", "\"use strict;\"\n\n" + code + "\n\nreturn 0;");
	}
	function colorToARGB(color) {
		let hex;

		if (color.startsWith('&H')) {
			// Remove '&H' at start and '&' at end.
			hex = color.replace(/[&H]/gi,"");

			// Pad left with zeros.
			hex = ("00000000" + hex).slice(-8);
		} else {
			// Convert signed decimal to unsigned decimal to hex.
			hex = (color >>> 0).toString(16).toUpperCase();

			// If it's an odd length, add a '0' to the start.
			if (hex.length % 2 == 1)
				hex = "0" + hex;

			// Pad it on the right to 6 digits.
			hex = hex.padEnd(6,"0");
		}

		// Parse string.
		let a = 1 - (parseInt(hex.substr(0,2),16) / 255);
		let r = parseInt(hex.substr(6,2),16);
		let g = parseInt(hex.substr(4,2),16);
		let b = parseInt(hex.substr(2,2),16);

		return [a,r,g,b];
	}

	// Map to convert SSAv4 alignment values to ASSv4+ values.
	//                          1, 2, 3,    5, 6, 7,    9, 10, 11
	let SSA_ALIGNMENT_MAP = [0, 1, 2, 3, 0, 7, 8, 9, 0, 4,  5,  6];

	// Alias for creating SVG elements.
	let createSVGElement = document.createElementNS.bind(document,"http://www.w3.org/2000/svg");

	function Renderer(SC,video) {
		// SC == Subtitle Container
		// video == <video> element

		var counter = 1;
		var computedPaths = {};
		var fontsizes = {};
		var lastTime = -1;
		var renderer = this;
		var TimeOffset, PlaybackSpeed, ScaledBorderAndShadow;
		var initRequest, rendererBorderStyle, splitLines, fontCSS, styleCSS, subFile, subtitles, collisions, reverseCollisions;

		var STATES = Object.freeze({UNINITIALIZED: 1, INITIALIZING: 2, RESTARTING_INIT: 3, INITIALIZED: 4, USED: 5});
		var state = STATES.UNINITIALIZED;
		var paused = true;


		// Functions to help manage when things are executed in the event loop.
		let [addTask, addMicrotask, addAnimationTask] = (function() {
			// Use this instead of setTimeout(func,0) to get around the 4ms delay.
			// https://dbaron.org/log/20100309-faster-timeouts
			// Modified to use Message Channels.
			let timeouts = [];
			let channel = new MessageChannel();
			channel.port1.onmessage = evt => timeouts.length > 0 ? timeouts.shift()() : null;
			let addTask = func => channel.port2.postMessage(timeouts.push(func));

			// Fulfilled promises create microtasks.
			let promise = Promise.resolve(true);
			let addMicrotask = func => promise = promise.then(func);

			// We can just use requestAnimationFrame to create an animation task.

			return [addTask, addMicrotask, window.requestAnimationFrame];
		})();

		// Handles subtitle line overrides.
		// Must be `call`ed from a Subtitle with `this`.
		let map = {
			"b" : function(arg,data) {
				data.style["font-weight"] = +arg ? (arg == "1" ? "bold" : arg) : "inherit";
				this.cachedBBox.width = this.cachedBBox.width && NaN;
			},
			"i" : function(arg,data) {
				this.style.Italic = !!+arg;
				let style, height, metrics = getFontSize(this.style.Fontname,this.style.Fontsize);
				if (this.style.Italic) {
					style = "italic";
					height = metrics.iheight;
				} else {
					style = "inherit";
					height = metrics.height;
				}
				data.style["font-style"] = style;
				this.cachedBBox.width = this.cachedBBox.width && NaN;
				this.cachedBBox.height = height;
			},
			"u" : function(arg,data) {
				let RSTD = data.style["text-decoration"], newVal;
				if (+arg)
					newVal = RSTD ? "underline line-through" : "underline";
				else
					newVal = RSTD.includes("line-through") ? "line-through" : "initial";
				data.style["text-decoration"] = newVal;
			},
			"s" : function(arg,data) {
				let RSTD = data.style["text-decoration"], newVal;
				if (+arg)
					newVal = RSTD ? "underline line-through" : "line-through";
				else
					newVal = RSTD.includes("underline") ? "underline" : "initial";
				data.style["text-decoration"] = newVal;
			},
			"alpha" : function(arg) {
				if (!arg) {
					var pStyle = renderer.styles[this.style.Name];
					this.style.c1a = pStyle.c1a;
					this.style.c2a = pStyle.c2a;
					this.style.c3a = pStyle.c3a;
					this.style.c4a = pStyle.c4a;
				} else {
					arg = arg.slice(2,-1); // remove 'H' and '&'s
					var a = 1 - (parseInt(arg,16) / 255);
					this.style.c1a = a; // primary fill
					this.style.c2a = a; // secondary fill (for karaoke)
					this.style.c3a = a; // border
					this.style.c4a = a; // shadow
				}
			},
			"1a" : function(arg) {
				this.style.c1a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			},
			"2a" : function(arg) {
				this.style.c2a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			},
			"3a" : function(arg) {
				this.style.c3a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			},
			"4a" : function(arg) {
				this.style.c4a = 1 - (parseInt(arg.slice(2,-1),16) / 255);
			},
			"a" : function() {
				// This is handled in the init() function for the Subtitle object.
			},
			"an" : function() {
				// This is handled in the init() function for the Subtitle object.
			},
			"be" : function(arg) {
				this.style.Blur = arg;
			},
			"blur" : function(arg) {
				this.style.Blur = arg;
			},
			"bord" : function(arg) {
				this.style.Outline = arg;
			},
			"xbord" : function(arg) {
				// ?
			},
			"ybord" : function(arg) {
				// ?
			},
			"c" : function(arg) {
				map["1c"].call(this,arg);
			},
			"1c" : function(arg) {
				var dummy;
				[dummy, this.style.c1r, this.style.c1g, this.style.c1b] = colorToARGB(arg);
			},
			"2c" : function(arg) {
				var dummy;
				[dummy, this.style.c2r, this.style.c2g, this.style.c2b] = colorToARGB(arg);
			},
			"3c" : function(arg) {
				var dummy;
				[dummy, this.style.c3r, this.style.c3g, this.style.c3b] = colorToARGB(arg);
			},
			"4c" : function(arg) {
				var dummy;
				[dummy, this.style.c4r, this.style.c4g, this.style.c4b] = colorToARGB(arg);
			},
			"clip" : function(arg) {
				if (!arg) return;

				arg = arg.split(",");
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();

				// Calculate Path
				let pathCode;
				if (arg.length == 4)
					pathCode = `M ${arg[0]} ${arg[1]} L ${arg[2]} ${arg[1]} ${arg[2]} ${arg[3]} ${arg[0]} ${arg[3]}`;
				else if (arg.length == 2)
					pathCode = pathASStoSVG(arg[1], arg[0]).path;
				else
					pathCode = pathASStoSVG(arg[0], 1).path;

				// Create Elements
				let path = createSVGElement("path");
					path.setAttribute("d",pathCode);
				let mask = createSVGElement("mask");
					mask.id = "clip" + counter;
					mask.setAttribute("maskUnits","userSpaceOnUse");
					mask.appendChild(path);

				SC.getElementsByTagName("defs")[0].appendChild(mask);

				this.clip = {"type" : "mask", "num" : counter++};
			},
			"iclip" : function(arg) {
				if (!arg) return;

				arg = arg.split(",");
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();

				// Calculate Path
				let pathCode;
				if (arg.length == 4)
					pathCode = `M ${arg[0]} ${arg[1]} L ${arg[2]} ${arg[1]} ${arg[2]} ${arg[3]} ${arg[0]} ${arg[3]}`;
				else if (arg.length == 2)
					pathCode = pathASStoSVG(arg[1], arg[0]).path;
				else
					pathCode = pathASStoSVG(arg[0], 1).path;

				// Create Elements
				let path = createSVGElement("path");
					path.setAttribute("d",pathCode);
				let clipPath = createSVGElement("clipPath");
					clipPath.id = "clip" + counter;
					clipPath.appendChild(path);

				SC.getElementsByTagName("defs")[0].appendChild(clipPath);

				this.clip = {"type" : "clip-path", "num" : counter++};
			},
			"fad" : function(arg) {
				let [fin,fout] = arg.split(",").map(parseFloat);
				let time = this.time.milliseconds;
				this.addFade(255,0,255,0,fin,time-fout,time);
			},
			"fade" : function(arg) {
				this.addFade(...arg.split(",").map(parseFloat));
			},
			"fax" : function(arg) {
				this.transforms.fax = Math.tanh(arg);
			},
			"fay" : function(arg) {
				this.transforms.fay = Math.tanh(arg);
			},
			"fn" : function(arg,data) {
				let metrics = getFontSize(arg,this.style.Fontsize);
				this.style.Fontname = arg;
				data.style["font-family"] = arg;
				data.style["font-size"] = metrics.size + "px";
				this.cachedBBox.width = this.cachedBBox.width && NaN;
				this.cachedBBox.height = this.style.Italic ? metrics.iheight : metrics.height;
			},
			"fr" : function(arg) {
				map["frz"].call(this,arg);
			},
			"frx" : function(arg) {
				this.transforms.frx = parseFloat(arg);
			},
			"fry" : function(arg) {
				this.transforms.fry = parseFloat(arg);
			},
			"frz" : function(arg) {
				this.transforms.frz = -(this.style.Angle + parseFloat(arg));
			},
			"fs" : function(arg,data) {
				var size;

				if (!arg || arg == "0")
					size = renderer.styles[this.style.Name].Fontsize;
				else if (arg.charAt(0) == "+" || arg.charAt(0) == "-")
					size = this.style.Fontsize * (1 + (parseInt(arg) / 10));
				else size = arg;

				this.style.Fontsize = size;
				let metrics = getFontSize(this.style.Fontname,size);
				data.style["font-size"] = metrics.size + "px";
				this.cachedBBox.width = this.cachedBBox.width && NaN;
				this.cachedBBox.height = this.style.Italic ? metrics.iheight : metrics.height;
			},
			"fsc" : function(arg) {
				map.fscx.call(this,arg);
				map.fscy.call(this,arg);
			},
			"fscx" : function(arg) {
				if (!arg || arg == "0") arg = renderer.styles[this.style.Name].ScaleX;
				this.style.ScaleX = arg;
				this.transforms.fscx = arg / 100;
			},
			"fscy" : function(arg) {
				if (!arg || arg == "0") arg = renderer.styles[this.style.Name].ScaleY;
				this.style.ScaleY = arg;
				this.transforms.fscy = arg / 100;
			},
			"fsp" : function(arg) {
				this.style.Spacing = parseFloat(arg);
				this.cachedBBox.width = this.cachedBBox.width && NaN;
			},
			"k" : function(arg,data) {
				setKaraokeColors.call(this,arg,data,"k");
			},
			"K" : function(arg,data) {
				map["kf"].call(this,arg,data);
			},
			"kf" : function(arg,data) {
				// create gradient elements
				let startNode = createSVGElement("stop");
					startNode.setAttribute("offset",0);
					startNode.setAttribute("stop-color", `rgba(${this.style.c1r},${this.style.c1g},${this.style.c1b},${this.style.c1a})`);
				let endNode = createSVGElement("stop");
					endNode.setAttribute("stop-color", `rgba(${this.style.c2r},${this.style.c2g},${this.style.c2b},${this.style.c2a})`);
				let grad = createSVGElement("linearGradient");
					grad.appendChild(startNode);
					grad.appendChild(endNode);
					grad.id = "gradient" + counter;
				SC.getElementsByTagName("defs")[0].appendChild(grad);

				data.style.fill = "url(#gradient" + counter + ")";

				if (this.karaokeTransitions) {
					// remove the previous \k or \ko transition
					let last = this.karaokeTransitions[this.karaokeTransitions.length-1];
					data.classes = data.classes.filter(str => !str.endsWith(last));
				}

				if (this.kf.length) {
					// remove the previous \kf transition
					let last = this.kf[this.kf.length-1];
					data.classes = data.classes.filter(str => !str.endsWith(last.num));
				}
				data.classes.push("kf"+counter);

				let vars = {
					"startTime" : this.karaokeTimer,
					"endTime" : this.karaokeTimer + arg * 10,
					"num" : counter
				};
				this.kf.push(vars);

				++counter;
				this.karaokeTimer = vars.endTime;
			},
			"ko" : function(arg,data) {
				setKaraokeColors.call(this,arg,data,"ko");
			},
			"kt" : function(arg) {
				this.karaokeTimer += arg * 10;
			},
			"_k" : function(arg,data) {
				let color = this["k"+arg];
				if (color.type == "ko") this.style.c3a = color.o;
				else {
					data.style.fill = `rgba(${color.r},${color.g},${color.b},${color.a})`;
					this.style.c1r = color.r;
					this.style.c1g = color.g;
					this.style.c1b = color.b;
					this.style.c1a = color.a;
				}
			},
			"move" : function(arg) {
				this.addMove(...arg.split(",").map(parseFloat));
			},
			"org" : function(arg) {
				let [x,y] = arg.split(",").map(parseFloat);
				this.transforms.rotOrg = {x,y};
			},
			"p" : function(arg,data) {
				data.hasPath = parseFloat(arg);
			},
			"pbo" : function(arg) {
				this.pathOffset = parseInt(arg,10);
			},
			"pos" : function(arg) {
				let [x,y] = arg.split(",").map(parseFloat);
				this.style.position = {x,y};
			},
			"q" : function() {
				// Since wrap style applies to the entire line, and it affects
				// how line breaks are handled, this override is handled by
				// createSubtitle() in init_subs().
			},
			"r" : function(arg,data) {
				var pos = this.style.position;
				var style = (!arg ? this.style.Name : (renderer.styles[arg] ? arg : this.style.Name));

				data.classes.push("subtitle_" + style.replace(/ /g,"_"));
				this.style = JSON.parse(JSON.stringify(renderer.styles[style]));
				this.style.position = pos;

				let metrics = getFontSize(this.style.Fontname,this.style.Fontsize);
				this.cachedBBox.width = this.cachedBBox.width && NaN;
				this.cachedBBox.height = this.style.Italic ? metrics.iheight : metrics.height;
			},
			"shad" : function(arg) {
				this.style.ShOffX = arg;
				this.style.ShOffY = arg;
			},
			"t" : function(arg,data) {
				// Add Transition CSS Class (so the elements can be found later)
				data.classes.push("transition" + counter);

				// Split Arguments
				let first_slash = arg.indexOf("\\");
				let times = arg.slice(0,first_slash).trim().slice(0,-1).split(",").map(parseFloat);
				let overrides = arg.slice(first_slash);

				// Parse Timing Arguments
				var intime, outtime, accel = 1;
				switch (times.length) {
					case 3:
						accel = times[2];
					case 2:
						outtime = times[1];
						intime = times[0];
						break;
					case 1:
						if (times[0]) accel = times[0];
						outtime = this.time.milliseconds;
						intime = 0;
				}

				// Handle \pos() Transitions
				while (overrides.includes("pos(")) {
					let pos = overrides.slice(overrides.indexOf("pos(")+4,overrides.indexOf(")")).split(",").map(parseFloat);
					overrides = overrides.replace(/\\pos\((\d|,)*\)/,"");
					this.addMove(this.style.position.x,this.style.position.y,pos[0],pos[1],intime,outtime,accel);
				}

				// Handle Other Transitions
				if (overrides) {
					let newTransition = {
						"time" : intime,
						"data" : JSON.parse(JSON.stringify(data)), // make a copy of the current values
						"duration" : outtime - intime,
						"overrides" : overrides,
						"accel" : accel,
						"id" : counter
					};

					// Insert Transitions Sorted by Start Time
					let index = this.transitions.findIndex(t => t.time > intime);
					if (index == -1)
						this.transitions.push(newTransition);
					else
						this.transitions.splice(index,0,newTransition);
				}

				++counter;
			},
			"xshad" : function(arg) {
				this.style.ShOffX = arg;
			},
			"yshad" : function(arg) {
				this.style.ShOffY = arg;
			}
		};
		let compiled_trie = generate_compiled_trie(Object.keys(map));
		function setKaraokeColors(arg,data,type) { // for \k and \ko
			// karaoke type
			data.karaokeType = type;

			// color to transition to
			this["k"+counter] = {
				"type" : type,
				"r" : this.style.c1r,
				"g" : this.style.c1g,
				"b" : this.style.c1b,
				"a" : this.style.c1a,
				"o" : this.style.c3a
			};

			if (this.kf.length) {
				// remove the previous \kf transition
				let last = this.kf[this.kf.length-1];
				data.classes = data.classes.filter(str => !str.endsWith(last.num));
			}

			if (this.karaokeTransitions) {
				// remove the previous \k or \ko transition
				let last = this.karaokeTransitions[this.karaokeTransitions.length-1];
				data.classes = data.classes.filter(str => !str.endsWith(last));
				this.karaokeTransitions.push(counter);
			} else this.karaokeTransitions = [counter];

			map.t.call(this, `${this.karaokeTimer},${this.karaokeTimer}\\_k${counter}`, data);
			this.karaokeTimer += arg * 10;
		}
		function updatekf(time, index, vars) {
			if (!vars.start) {
				vars.node = SC.querySelector(".kf" + vars.num);
				if (!vars.node) {
					let last = this.kf.pop();
					if (last !== vars)
						this.kf[index] = last;
					return;
				}

				// Remove Container Scaling
				let scaling = removeContainerScaling();

				let range = document.createRange();
				range.selectNode(vars.node);
				let eSize = range.getBoundingClientRect();
				range.selectNodeContents(this.div);
				let pSize = range.getBoundingClientRect();
				vars.start = (eSize.left - pSize.left) / pSize.width;
				vars.frac = eSize.width / pSize.width;
				vars.gradStop = SC.getElementById("gradient" + vars.num).firstChild;

				// Re-apply Container Scaling
				reApplyContainerScaling(scaling);
			}

			vars.node.style.fill = "url(#gradient" + vars.num + ")";
			if (time <= vars.startTime) vars.gradStop.setAttribute("offset", vars.start);
			else if (vars.startTime < time && time < vars.endTime) {
				let val = vars.start + vars.frac * (time - vars.startTime) / (vars.endTime - vars.startTime);
				vars.gradStop.setAttribute("offset", val);
			} else vars.gradStop.setAttribute("offset", vars.start + vars.frac);
		};

		function timeConvert(HMS) {
			var t = HMS.split(":");
			return t[0]*3600 + t[1]*60 + parseFloat(t[2]);
		}
		function pathASStoSVG(path,scale) {
			// This function converts an ASS style path to a SVG style path.

			// Check if this path has already been converted.
			let pathID = scale + path;
			if (pathID in computedPaths !== false)
				return computedPaths[pathID];

			path = path.toLowerCase();
			path = path.replace(/b/g,"C");   // cubic bézier curve to point 3 using point 1 and 2 as the control points
			path = path.replace(/l/g,"L");   // line-to <x>, <y>
			path = path.replace(/m/g,"Z M"); // move-to <x>, <y> (closing the shape first)
			path = path.replace(/n/g,"M");   // move-to <x>, <y> (without closing the shape)

			// extend b-spline to <x>, <y>
			// The "p" command is only supposed to be used after an "s" command,
			// but since the "s" command can actually take any number of points,
			// we can just remove all "p" commands and nothing will change.
			// In the same manner, an "s" command that immediately follows
			// another "s" command can also be removed.
			path = path.replace(/p/g,"");
			let changes = true;
			while (changes) {
				changes = false;
				path = path.replace(/s([\d\s.-]*)s/g, (M,points) => {
					changes = true;
					return "s" + points;
				});
			}

			// close b-spline
			// Since these are at least third degree b-splines, this can be
			// done by copying the starting location and the first two points
			// to the end of the spline.
			// before: x0 y0 s x1 y1 x2 y2 ... c
			// after:  x0 y0 s x1 y1 x2 y2 ... x0 y0 x1 y1 x2 y2
			changes = true;
			while (changes) {
				changes = false;
				path = path.replace(/(-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s*)s((?:\s*-?\d+(?:\.\d+)?){4})([\d\s.-]*)c/g, (M,xy0,xy12,rest) => {
					changes = true;
					return xy0 + "s" + xy12 + rest + " " + xy0 + " " + xy12;
				});
			}

			// 3rd degree uniform b-spline
			// SVG doesn't have this, so we have convert them to a series of
			// Bézier curves.
			//   x0 y0 s x1 y1 x2 y2 x3 y3 x4 y4 x5 y5
			//   |-----------------------| Bézier 1
			//           |---------------------| Bézier 2
			//                 |---------------------| Bézier 3
			// Since the start point for a Bézier is different from a spline,
			// we also need to add a move before the first Bézier and after the
			// last Bézier. However, the bounding box of b-splines is different
			// from that of an equivalent Bézier curve, so we also have to keep
			// track of the extents of the spline.
			let extents;
			function basisToBézier(p) {
				// The input points should be in the same order as this.
				return [
					/* x0 */ (p[0] + 4 * p[2] + p[4]) / 6,
					/* y0 */ (p[1] + 4 * p[3] + p[5]) / 6,
					/* x1 */ (4 * p[2] + 2 * p[4]) / 6,
					/* y1 */ (4 * p[3] + 2 * p[5]) / 6,
					/* x2 */ (2 * p[2] + 4 * p[4]) / 6,
					/* y2 */ (2 * p[3] + 4 * p[5]) / 6,
					/* x3 */ (p[2] + 4 * p[4] + p[6]) / 6,
					/* y3 */ (p[3] + 4 * p[5] + p[7]) / 6
				];
			}
			changes = true;
			while (changes) {
				changes = false;
				path = path.replace(/(-?\d+(?:\.\d+)?\s+-?\d+(?:\.\d+)?\s*)s((?:\s*-?\d+(?:\.\d+)?)+)/g, (M,start,rest) => {
					changes = true;

					let points = (start + " " + rest).split(/\s+/).map(parseFloat);

					// Calculate the "extents" of this spline. The path may be larger than this, but it will not be smaller.
					if (!extents) {
						extents = {
							"left": points[0],
							"top": points[1],
							"right": points[0],
							"bottom": points[1]
						};
					}
					for (let i = 0; i < points.length; i += 2) {
						extents.left = Math.min(extents.left, points[i]);
						extents.top = Math.min(extents.top, points[i+1]);
						extents.right = Math.max(extents.right, points[i]);
						extents.bottom = Math.max(extents.bottom, points[i+1]);
					}

					// Convert the b-spline to a series of Bézier curves.
					let replacement = "";
					for (let i = 0; i < points.length - 6; i += 2) {
						let bez_pts = basisToBézier(points.slice(i,i+8));
						let bez_str = " C " + bez_pts.slice(2).join(" ");
						replacement += replacement ? bez_str : `M ${bez_pts[0]} ${bez_pts[1]}${bez_str}`;
					}

					// The start and end points need to stay the same, with the replacement Bézier curves in between.
					return `${points[0]} ${points[1]} ${replacement} M ${points[points.length-2]} ${points[points.length-1]}`;
				});
			}

			// remove redundant "Z"s at the start and spaces in the middle
			path = path.replace(/^(?:\s*Z\s*)*/,"").replace(/\s+/g," ");

			// scale path
			if (scale != 1) {
				scale = 1 << (scale - 1);
				path = path.replace(/-?\d+(?:\.\d+)?/g, M => parseFloat(M) / scale);
				if (extents) {
					extents.top *= scale;
					extents.left *= scale;
					extents.bottom *= scale;
					extents.right *= scale;
				}
			}

			// Close the path at the end, save it to the cache, and return the data.
			return computedPaths[pathID] = {"path": path + " Z", "extents": extents};
		}
		function getFontSize(font,size) {
			size = (+size).toFixed(2);

			if (!fontsizes[font]) {
				fontsizes[font] = {};
				let cssFontNameValue = "0 \"" + font.replace(/"/g,"\\\"") + "\"";
				if (document.fonts && !document.fonts.check(cssFontNameValue)) {
					document.fonts.load(cssFontNameValue).then(() => {
						fontsizes[font] = {};
						write_styles(renderer.styles);
					});
				}
			}

			if (!fontsizes[font][size]) {
				var sampleText = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
				var smallE = createSVGElement("text");
					smallE.style.display = "block";
					smallE.style.fontFamily = font;
					smallE.style.fontSize = 100 + "px";
					smallE.style.opacity = 0;
					smallE.textContent = sampleText;
				var bigE = createSVGElement("text");
					bigE.style.display = "block";
					bigE.style.fontFamily = font;
					bigE.style.fontSize = 300 + "px";
					bigE.style.opacity = 0;
					bigE.textContent = sampleText;

				SC.appendChild(smallE);
				SC.appendChild(bigE);
				var scale = (200 / (bigE.getBBox().height - smallE.getBBox().height));
				smallE.remove();
				bigE.remove();

				let scaled = size * (scale >= 1 ? 1 / scale : scale);

				var finalE = createSVGElement("text");
					finalE.style.display = "block";
					finalE.style.fontFamily = font;
					finalE.style.fontSize = scaled + "px";
					finalE.style.opacity = 0;
					finalE.textContent = sampleText;
				SC.appendChild(finalE);
				let height = finalE.getBBox().height;

				let i = 10, diff = height - size;
				while (i --> 0 && Math.abs(diff) > 0.1) {
					scaled -= diff / 2;
					finalE.style.fontSize = scaled + "px";
					height = finalE.getBBox().height;
					diff = height - size;
				}

				finalE.fontStyle = "italic";
				let iheight = finalE.getBBox().height;

				finalE.remove();

				fontsizes[font][size] = {"size" : scaled, "height" : height, "iheight" : iheight};
			}

			return fontsizes[font][size];
		}

		function timeOverlap(T1,T2) {
			return (T1.start <= T2.start && T2.start < T1.end) || (T1.start < T2.end && T2.end <= T1.end);
		}
		function boundsOverlap(B1,B2) {
			return B1.left < B2.right && B1.right > B2.left && B1.top < B2.bottom && B1.bottom > B2.top;
		}
		function checkCollisions(line) {
			if (state != STATES.INITIALIZED || line.state != STATES.INITIALIZED || line.collisionsChecked)
				return;

			// This function checks if the given line might collide with any
			// others. It doesn't check bounding boxes, so it might not.

			/* Lines do not collide if:
				They use \t(), \pos(), \mov(), or \move().
				They are not on the same alignment "level".
					-> top (789), middle (456), bottom (123)
					libass tries, but messes it up if this happens. "top" lines
					are pushed down, but "middle" and "bottom" lines are pushed
					up. Because of this I've put "top" lines in the "upper"
					group, and "middle" and "bottom" lines in the "lower" group.
					There's really not much we could actually do about it if
					"upper" and "lower" subtitles collided, so I've decided to
					just ignore those collisions to improve performance.
				They are not on the same layer.
				They do not occur at the same time.
			*/

			// Check for \t(), \pos(), and \move().
			if (/{[^}]*\\(?:t|pos|move)\([^)]*\)[^}]*}/.test(line.data.Text))
				return;

			// Get the alignment group that this line belongs to.
			let A = line.style.Alignment;
			let alignmentGroup = (A > 6) ? collisions.upper : collisions.lower;

			// Get the layer group that this line belongs to.
			if (line.data.Layer in alignmentGroup === false)
				alignmentGroup[line.data.Layer] = [];
			let layerGroup = alignmentGroup[line.data.Layer];

			// Check if this line collides with any we've already seen.
			let toAdd = [], checked = new Set();
			if (reverseCollisions) {
				for (let collision of layerGroup) {
					if (checked.has(collision[1])) continue;
					if (collision[1].lineNum != line.lineNum && timeOverlap(collision[1].time,line.time)) {
						if (collision[0])
							toAdd.unshift([line,collision[1]]);
						else
							collision[0] = line;
					}
					checked.add(collision[1]);
				}
				alignmentGroup[line.data.Layer] = [[null,line]].concat(toAdd,layerGroup);
			} else {
				for (let collision of layerGroup) {
					if (checked.has(collision[0])) continue;
					if (collision[0].lineNum != line.lineNum && timeOverlap(collision[0].time,line.time)) {
						if (collision[1])
							toAdd.push([collision[0],line]);
						else
							collision[1] = line;
					}
					checked.add(collision[0]);
				}
				alignmentGroup[line.data.Layer] = layerGroup.concat(toAdd,[[line,null]]);
			}

			// So we don't do this again.
			line.collisionsChecked = true;
		}

		function removeContainerScaling() {
			let ret = {
				"width" : SC.style.width,
				"height" : SC.style.height
			};
			SC.style.width = "";
			SC.style.height = "";
			return ret;
		}
		function reApplyContainerScaling(scaling) {
			SC.style.width = scaling.width;
			SC.style.height = scaling.height;
		}


		let NewSubtitle = (function() {
			// These functions are `call`ed from other functions.
			function parse_text_line(line) {
				this.karaokeTimer = 0;

				let toReturn = document.createDocumentFragment();

				let tspan_data = {"style": {}, "classes": [], "hasPath": 0};
				let match, overrideTextSplit = /(?:{([^}]*)})?([^{]*)/g;
				while ((match = overrideTextSplit.exec(line))[0]) {
					let [_,overrides,text] = match;

					// Parse the overrides, converting them to CSS attributes.
					if (overrides) override_to_css.call(this,overrides,tspan_data);

					if (tspan_data.hasPath) {
						// Convert ASS path to SVG path.
						let converted = pathASStoSVG(text,tspan_data.hasPath);

						let P = createSVGElement("path");
							P.setAttribute("d",converted.path);
							P.classList.add(...this.div.classList, ...tspan_data.classes);
							for (let s in tspan_data.style) P.style[s] = tspan_data.style[s];

						// SVG bounding boxes are not affected by transforms,
						// so we can get this here and it will never change.
						SC.appendChild(P);
						P.bbox = P.getBBox();
						P.remove();

						// Modify path bbox based on the extents (possibly) returned by `pathASStoSVG()`.
						if (converted.extents) {
							let e = converted.extents;

							e.left = Math.min(e.left, P.bbox.x);
							e.top = Math.min(e.top, P.bbox.y);
							e.right = Math.max(e.right, P.bbox.x + P.bbox.width);
							e.bottom = Math.max(e.bottom, P.bbox.y + P.bbox.height);

							P.bbox.x = e.left;
							P.bbox.y = e.top;
							P.bbox.width = e.right - e.left;
							P.bbox.height = e.bottom - e.top;
						}

						let A = this.style.Alignment;
						if (A % 3) { // 1, 2, 4, 5, 7, 8
							let offset = P.bbox.width;
							if ((A + 1) % 3 == 0) // 2, 5, 8
								offset /= 2;
						}

						this.path = P;
					}

					updateShadows.call(this,tspan_data);

					let tspan = createSVGElement("tspan");
					for (let x in tspan_data.style) tspan.style[x] = tspan_data.style[x];
					if (tspan_data.classes.length) tspan.classList.add(...tspan_data.classes);
					if (!tspan_data.hasPath) tspan.textContent = text;
					toReturn.appendChild(tspan);
				}

				return toReturn;
			}
			function override_to_css(override_block,tspan_data) {
				tspan_data.karaokeType = "";

				let match, overreg = /\\([^\\\(]+(?:\([^\)]*(?:\([^\)]*\)[^\)]*)*[^\)]*\)?\))?)/g;
				while (match = overreg.exec(override_block)) {
					let opt = match[1];
					let i = compiled_trie(opt);
					if (i) {
						let override = map[opt.slice(0,i)];
						let val = (opt.charAt(i) === "(" && opt.charAt(opt.length-1) === ")") ? opt.slice(i+1,-1) : opt.slice(i);
						override.call(this,val,tspan_data);
					}
					// if i == 0: ¯\_(ツ)_/¯
				}

				// update colors
				if (!tspan_data.style.fill || (tspan_data.style.fill && !tspan_data.style.fill.startsWith("url("))) {
					if (tspan_data.karaokeType == "k")
						tspan_data.style.fill = `rgba(${this.style.c2r},${this.style.c2g},${this.style.c2b},${this.style.c2a})`;
					else
						tspan_data.style.fill = `rgba(${this.style.c1r},${this.style.c1g},${this.style.c1b},${this.style.c1a})`;
				}
				tspan_data.style.stroke = "rgba(" + this.style.c3r + "," + this.style.c3g + "," + this.style.c3b + "," + (tspan_data.karaokeType == "ko" ? 0 : this.style.c3a) + ")";
				tspan_data.style["stroke-width"] = this.style.Outline + "px";
			}

			function updateShadows(tspan_data) {
				let DS = tspan_data.style;
				let TS = this.style;

				let fillColor = DS.fill;
				let borderColor = DS.stroke;
				let shadowColor = "rgba(" + TS.c4r + "," + TS.c4g + "," + TS.c4b + "," + TS.c4a + ")";

				let BorderStyle = rendererBorderStyle || TS.BorderStyle;
				if (BorderStyle == 3) { // Outline as Border Box
					let TBS = this.box.style;

					TBS.fill = borderColor;
					TBS.stroke = borderColor;
					TBS.strokeWidth = DS["stroke-width"];

					// Remove text border from lines that have a border box.
					DS["stroke-width"] = "0px";

					if (TS.Blur) // \be, \blur
						this.div.style.filter = "drop-shadow(0 0 " + TS.Blur + "px " + fillColor + ")";

					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						TBS.filter = "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
					else TBS.filter = "";
				} else if (BorderStyle == 4) { // Shadow as Border Box
					// Only the first piece in a splitline will have this element for border style 4.
					if (this.box) {
						let TBS = this.box.style;

						TBS.fill = shadowColor;
						TBS.stroke = shadowColor;
						TBS.strokeWidth = DS["stroke-width"];
						TBS.filter = "";

						if (TS.Blur) // \be, \blur
							this.div.style.filter = "drop-shadow(0 0 " + TS.Blur + "px " + (TS.Outline ? borderColor : fillColor) + ")";
					}
				} else {
					this.div.style.filter = "";
					if (TS.Blur) // \be, \blur
						this.div.style.filter += "drop-shadow(0 0 " + TS.Blur + "px " + (TS.Outline ? borderColor : fillColor) + ") ";
					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						this.div.style.filter += "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
				}

				if (this.path) {
					this.path.style.filter = "";
					if (TS.Blur) // \be, \blur
						this.path.style.filter += "drop-shadow(0 0 " + TS.Blur + "px " + shadowColor + ") ";
					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						this.path.style.filter += "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
				}
			}

			function transition(t,time) {
				// If the line has stopped displaying before the transition starts.
				if (!this.div) return;

				let data = t.data;
				let duration = t.duration;
				let accel = t.accel;

				// copy some starting style values
				let SRS = {
					"fill": data.style.fill,
					"stroke": data.style.stroke,
					"stroke-width": data.style["stroke-width"]
				};

				// copy starting colors
				let startColors, endColors, updateGradients = this.kf.length && duration;
				if (updateGradients) {
					startColors = {
						primary: {
							r: this.style.c1r,
							g: this.style.c1g,
							b: this.style.c1b,
							a: this.style.c1a
						},
						secondary: {
							r: this.style.c2r,
							g: this.style.c2g,
							b: this.style.c2b,
							a: this.style.c2a
						},
						border: {
							r: this.style.c3r,
							g: this.style.c3g,
							b: this.style.c3b,
							a: this.style.c3a
						},
						shadow: {
							r: this.style.c4r,
							g: this.style.c4g,
							b: this.style.c4b,
							a: this.style.c4a
						}
					};
				}

				override_to_css.call(this,t.overrides,data);

				// check if the copied style values have changed
				let RSChanged = SRS.fill != data.style.fill || SRS.stroke != data.style.stroke || SRS["stroke-width"] != data.style["stroke-width"];

				// copy ending colors
				if (updateGradients) {
					endColors = {
						primary: {
							r: this.style.c1r,
							g: this.style.c1g,
							b: this.style.c1b,
							a: this.style.c1a
						},
						secondary: {
							r: this.style.c2r,
							g: this.style.c2g,
							b: this.style.c2b,
							a: this.style.c2a
						},
						border: {
							r: this.style.c3r,
							g: this.style.c3g,
							b: this.style.c3b,
							a: this.style.c3a
						},
						shadow: {
							r: this.style.c4r,
							g: this.style.c4g,
							b: this.style.c4b,
							a: this.style.c4a
						}
					};
				}


				let trans = "all " + duration + "ms ";

				// add transition timing function
				if (accel == 1) trans += "linear";
				else {
					let CBC = fitCurve([[0,0],[0.25,Math.pow(0.25,accel)],[0.5,Math.pow(0.5,accel)],[0.75,Math.pow(0.75,accel)],[1,1]]);
					// cubic-bezier(x1, y1, x2, y2)
					trans += "cubic-bezier(" + CBC[1][0] + "," + CBC[1][1] + "," + CBC[2][0] + "," + CBC[2][1] + ")";
				}

				// add transition delay
				trans += " " + (t.time - time) + "ms";


				// add transition to elements
				this.div.style.transition = trans; // for transitions that can only be applied to the entire line
				let divs = SC.getElementsByClassName("transition"+t.id);
				for (let div of divs) {
					div.style.transition = trans;
					for (let x in data.style)
						div.style[x] = data.style[x];
					div.classList.add(...data.classes);
				}
				if (this.box) this.box.style.transition = trans;

				// update \kf color gradients
				if (updateGradients) {
					let sameColor = (start,end) => (start.r == end.r && start.g == end.g && start.b == end.b && start.a == end.a);
					let pColorChanged = !sameColor(startColors.primary, endColors.primary);
					let sColorChanged = !sameColor(startColors.secondary, endColors.secondary);
					if (pColorChanged || sColorChanged) {
						let p1 = startColors.primary, s1 = startColors.secondary;
						let p2 = endColors.primary, s2 = endColors.secondary;
						let before = "<animate attributeName='stop-color' from='rgba(";
						let after = ")' dur='" + duration + "ms' fill='freeze' />";
						let anim1 = before + [p1.r, p1.g, p1.b, p1.a].join() + ")' to='rgba(" + [p2.r, p2.g, p2.b, p2.a].join() + after;
						let anim2 = before + [s1.r, s1.g, s1.b, s1.a].join() + ")' to='rgba(" + [s2.r, s2.g, s2.b, s2.a].join() + after;
						for (let vars of this.kf) {
							let stop = SC.getElementById("gradient" + vars.num).children;
							if (pColorChanged) stop[0].innerHTML = anim1;
							if (sColorChanged) stop[1].innerHTML = anim2;
						}
					}
				}

				if (RSChanged) updateShadows.call(this,data);
				this.updatePosition();
			}
			function clearTransitions(id) {
				let divs = SC.getElementsByClassName("transition"+id);
				if (this.div) this.div.style.transition = "";
				for (let div of divs) div.style.transition = "";
				if (this.box) this.box.style.transition = "";
			}


			// The Subtitle 'Class'.
			function Subtitle(data,lineNum,linePiece) {
				this.state = STATES.UNINITIALIZED;
				this.data = data;
				this.lineNum = lineNum;
				this.linePiece = linePiece;
				this.style = null;

				this.Margin = {"L" : (data.MarginL && parseInt(data.MarginL)) || renderer.styles[data.Style].MarginL,
							   "R" : (data.MarginR && parseInt(data.MarginR)) || renderer.styles[data.Style].MarginR,
							   "V" : (data.MarginV && parseInt(data.MarginV)) || renderer.styles[data.Style].MarginV};

				this.time = {"start" : timeConvert(data.Start), "end" : timeConvert(data.End)};
				this.time.milliseconds = (this.time.end - this.time.start) * 1000;

				// These are used for lines that have been split, for handling
				// collisions, and for offsetting paths with \pbo.
				this.splitLineOffset = {x:0,y:0};
				this.collisionOffset = 0; // vertical offset only
				this.pathOffset = 0; // vertical offset only

				this.cachedBBox = {width:NaN,height:NaN};
				this.cachedBounds = {
					top: 0,
					left: 0,
					bottom: 0,
					right: 0
				};

				this.group = null;
				this.box = null;
				this.div = null;
				this.path = null;

				this.transitions = null;
				this.transforms = null;
				this.updates = null;

				// used by setKaraokeColors()
				this.kf = [];
				this.karaokeTransitions = null;
				this.karaokeTimer = 0;

				this.clip = null; // used by \clip() and \iclip()

				this.visible = false;
				this.collisionsChecked = false; // used by checkCollisions()
				this.moved = false; // used in the main loop for handling splitLines
			}


			Subtitle.prototype.width = function() { return this.cachedBounds.right - this.cachedBounds.left; };
			Subtitle.prototype.height = function() { return this.cachedBounds.bottom - this.cachedBounds.top; };
			Subtitle.prototype.getSplitLineBounds = function(lines) {
				if (!lines) lines = SC.querySelectorAll(`g[id^=line${this.lineNum}-]`);

				let bounds = lines[0].line.cachedBounds;
				let extents = {
					top: bounds.top,
					left: bounds.left,
					bottom: bounds.bottom,
					right: bounds.right
				};

				for (let i = 1; i < lines.length; ++i) {
					bounds = lines[i].line.cachedBounds;
					extents.top = Math.min(extents.top, bounds.top);
					extents.left = Math.min(extents.left, bounds.left);
					extents.bottom = Math.max(extents.bottom, bounds.bottom);
					extents.right = Math.max(extents.right, bounds.right);
				}

				return extents;
			};

			Subtitle.prototype.init = function() {
				if (this.state == STATES.INITIALIZED) return;
				if (this.state == STATES.USED) this.clean();

				this.style = JSON.parse(JSON.stringify(renderer.styles[this.data.Style])); // deep clone
				this.collisionOffset = 0;

				// Parse alignment here because it applies to the entire line and should only appear once,
				// but if it appears more than once, only the first instance counts.
				let alignment = /{[^}]*?\\(an?)(\d\d?)[^}]*}/.exec(this.data.Text);
				if (alignment) {
					let val = parseInt(alignment[2]);
					if (val)
						this.style.Alignment = (alignment[1] == "a" ? SSA_ALIGNMENT_MAP[val] : val);
				}

				this.div = createSVGElement("text");
				let TD = this.div;
					TD.classList.add("subtitle_" + this.data.Style);

				// For Microsoft Edge
				if (window.CSS && CSS.supports && !CSS.supports("dominant-baseline","text-after-edge"))
					TD.setAttribute("dy","0.75em");

				let BorderStyle = rendererBorderStyle || this.style.BorderStyle;
				if (BorderStyle == 3 || (BorderStyle == 4 && this.linePiece < 2))
					this.box = createSVGElement("rect");

				this.transitions = [];
				this.transforms = {"fax":0,"fay":0,"frx":0,"fry":0,"frz":0,"fscx":1,"fscy":1,"rotOrg":null};
				this.updates = {"fade":null,"boxfade":null,"move":null};
				this.style.position = null;

				if (this.Margin.L) TD.style["margin-left"] = this.Margin.L + "px";
				if (this.Margin.R) TD.style["margin-right"] = this.Margin.R + "px";
				if (this.Margin.V) {
					TD.style["margin-top"] = this.Margin.V + "px";
					TD.style["margin-bottom"] = this.Margin.V + "px";
				}

				TD.appendChild(parse_text_line.call(this,this.data.Text));

				this.group = createSVGElement("g");
				this.group.id = `line${this.lineNum}-${this.linePiece}`;
				this.group.appendChild(TD);
				this.group.line = this;

				if (this.box) this.group.insertBefore(this.box,TD);
				if (this.path) this.group.insertBefore(this.path,TD);
				if (this.clip) this.group.setAttribute(this.clip.type, "url(#clip" + this.clip.num + ")");

				this.state = STATES.INITIALIZED;

				checkCollisions(this);
			};
			Subtitle.prototype.start = function() {
				if (this.state != STATES.INITIALIZED) return;
				SC.getElementById("layer" + this.data.Layer).appendChild(this.group);

				this.updatePosition();

				this.visible = true;
				this.state = STATES.USED;
			};
			Subtitle.prototype.update = function(t) {
				if (this.state != STATES.USED) return;

				let time = t * 1000;

				if (this.updates.fade) this.updates.fade(time);
				if (this.updates.boxfade) this.updates.boxfade(time);
				if (this.updates.move) this.updates.move(time);
				for (let i = 0; i < this.kf.length; ++i)
					updatekf.call(this, time, i, this.kf[i]);

				while (this.transitions.length && this.transitions[0].time <= time) {
					// Only one transition can be done each frame.
					let t = this.transitions.shift();

					// Add the transition to the microtask queue. This makes
					// sure it starts during the current animation frame.
					addMicrotask(transition.bind(this,t,time));

					// Remove all those transitions so they don't affect anything else.
					// It wouldn't affect other transitions, but it could affect updates.
					// Changing the transition timing doesn't affect currently running
					// transitions, so this is okay to do. We do have to let the animation
					// actually start first though, so we can't do it immediately.
					if (t.time + t.duration < time) {
						addAnimationTask(clearTransitions.bind(this,t.id));
						break;
					}
				}
			};
			Subtitle.prototype.clean = function() {
				if (this.group) {
					this.group.remove();
					this.group.line = null;
				}
				for (let vars of this.kf) SC.getElementById("gradient" + vars.num).remove();
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();
				this.clip = null;

				this.group = null;
				this.box = null;
				this.div = null;
				this.path = null;

				this.transitions = null;
				this.transforms = null;
				this.updates = null;

				this.kf = [];
				this.karaokeTransitions = null;
				this.karaokeTimer = 0;

				this.visible = false;

				this.state = STATES.UNINITIALIZED;
			};

			Subtitle.prototype.addFade = function(a1,a2,a3,t1,t2,t3,t4) {
				function fade(e,t) {
					if (t <= t1) e.style.opacity = o1;
					else if (t1 < t && t < t2) e.style.opacity = o1 + (o2-o1) * (t-t1) / (t2-t1);
					else if (t2 < t && t < t3) e.style.opacity = o2;
					else if (t3 < t && t < t4) e.style.opacity = o2 + (o3-o2) * (t-t3) / (t4-t3);
					else e.style.opacity = o3;
				}
				var o1 = 1 - a1/255;
				var o2 = 1 - a2/255;
				var o3 = 1 - a3/255;
				this.div.style.opacity = o1; // Prevent flickering at the start.
				this.updates.fade = fade.bind(this,this.div);
				if (this.box) {
					this.box.style.opacity = o1; // Prevent flickering at the start.
					this.updates.boxfade = fade.bind(this,this.box);
				}
			};
			Subtitle.prototype.addMove = function(x1,y1,x2,y2,t1,t2,accel) {
				if (t1 === undefined) t1 = 0;
				if (t2 === undefined) t2 = this.time.milliseconds;
				if (accel === undefined) accel = 1;

				this.style.position = {x:x1,y:y1};

				this.updates.move = function(t) {
					if (t < t1) t = t1;
					if (t > t2) t = t2;

					let calc = Math.pow((t-t1)/(t2-t1),accel);
					let newX = x1 + (x2 - x1) * calc;
					let newY = y1 + (y2 - y1) * calc;

					if (this.style.position.x != newX || this.style.position.y != newY) {
						this.style.position.x = newX;
						this.style.position.y = newY;
						this.updatePosition();
					}
				}.bind(this);
			};

			Subtitle.prototype.updatePosition = function() {
				// For positioning, imagine a box surrounding the paths and the text. That box is
				// positioned and transformed relative to the video, and the paths and text are
				// positioned relative to the box.

				this.moved = true;

				let TS = this.style;
				let A = TS.Alignment;
				let TD = this.div;
				let TT = this.transforms;

				if (TS.Angle && !TT.frz) TT.frz = -TS.Angle;

				// This is the position of the anchor.
				let position = TS.position;
				if (!position) {
					let x, y;

					if (A%3 == 0) // 3, 6, 9
						x = SC.getAttribute("width") - this.Margin.R;
					else if ((A+1)%3 == 0) // 2, 5, 8
						x = this.Margin.L + (SC.getAttribute("width") - this.Margin.L - this.Margin.R) / 2;
					else // 1, 4, 7
						x = this.Margin.L;

					if (A > 6) // 7, 8, 9
						y = this.Margin.V;
					else if (A < 4) // 1, 2, 3
						y = SC.getAttribute("height") - this.Margin.V;
					else // 4, 5, 6
						y = SC.getAttribute("height") / 2;

					position = {x,y};
				}
				position.x += this.splitLineOffset.x;
				position.y += this.splitLineOffset.y + this.collisionOffset;

				// This is the actual div/path position.
				let tbox = this.cachedBBox, metrics = getFontSize(TS.Fontname,TS.Fontsize);
				if (isNaN(tbox.width)) {
					tbox.width = TD.getComputedTextLength();
					if (TS.Spacing)
						tbox.width += TD.textContent.length * TS.Spacing;
					if (tbox.width == 0)
						tbox.height = (TS.Italic ? metrics.iheight : metrics.height) / 2;
				}
				if (isNaN(tbox.height))
					tbox.height = TS.Italic ? metrics.iheight : metrics.height;
				let pbox = this.path ? this.path.bbox : {width:0,height:0};
				let bbox = {
					"width": tbox.width + pbox.width,
					"height": Math.max(tbox.height, pbox.height)
				};

				// Calculate anchor offset.
				let anchor = {x:0,y:0};
				if (A%3 != 1) {
					anchor.x = bbox.width; // 3, 6, 9
					if (A%3 == 2) // 2, 5, 8
						anchor.x /= 2;
				}
				if (A < 7) {
					// If there is no text, its height is ignored for the anchor offset.
					let height = tbox.width ? bbox.height : pbox.height;
					anchor.y = height; // 1, 2, 3
					if (A > 3) // 4, 5, 6
						anchor.y /= 2;
				}

				// If there is a path, the text needs to be shifted to make room.
				let shift = {x:0,y:0};
				if (this.path && tbox.width) {
					shift.x = pbox.width;
					if (pbox.height > tbox.height)
						shift.y = pbox.height - tbox.height;
				}

				// Transforms happen in reverse order.
				// The origin only affects rotations.
				let origin = TT.rotOrg || {x:0,y:0};
				let t = {
					toAnchor: `translate(${-anchor.x}px,${-anchor.y}px)`,	/* translate to anchor position */
					scale: `scale(${TT.fscx},${TT.fscy})`,
					toRotOrg: `translate(${-origin.x}px,${-origin.y}px)`,	/* move to rotation origin */
					rotate: `rotateZ(${TT.frz}deg) rotateY(${TT.fry}deg) rotateX(${TT.frx}deg)`,
					fromRotOrg: `translate(${origin.x}px,${origin.y}px)`,	/* move from rotation origin */
					skew: `skew(${TT.fax}rad,${TT.fay}rad)`,				/* aka shear */
					translate: `translate(${position.x}px,${position.y}px)`	/* translate to position */
				};

				let transforms = `${t.translate} ${t.skew} ${t.fromRotOrg} ${t.rotate} ${t.toRotOrg} ${t.scale} ${t.toAnchor}`;
				let textTransforms = (shift.x || shift.y) ? `${transforms} translate(${shift.x}px,${shift.y}px)` : transforms;

				// The main div is positioned using its x and y attributes so that it's
				// easier to debug where it is on screen when the browser highlights it.
				// This does mean we have to add an extra translation though.
				TD.style.transform = `${textTransforms} translate(${anchor.x - position.x}px,${anchor.y - position.y}px)`;
				TD.setAttribute("x", position.x - anchor.x);
				TD.setAttribute("y", position.y - anchor.y);
				if (TS.Spacing && tbox.width)
					TD.setAttribute("dx", "0 " + ` ${TS.Spacing}`.repeat(TD.textContent.length - 1));
				if (this.box) {
					// This box is only behind the text; it does not go behind a path. The border
					// of the box straddles the bounding box, with half of it "inside" the box, and
					// half "outside". This means that we need to increase the size of the box by
					// one borders' breadth, and we need to offset the box by half that.
					let TB = this.box;
					let B = parseFloat(TB.style.strokeWidth);
					TB.style.transform = textTransforms;
					TB.setAttribute("x", -B / 2);
					TB.setAttribute("y", -B / 2);
					TB.setAttribute("width", tbox.width + B);
					TB.setAttribute("height", tbox.height + B);
				}
				if (this.path) {
					let textOffset = 0;
					if (A < 7 && tbox.width && tbox.height > pbox.height) {
						textOffset = tbox.height - pbox.height;
						if (A > 3) textOffset /= 2;
					}
					// `this.pathOffset` should probably be in here too, but it seems to give the wrong result.
					this.path.style.transform = `${transforms} translateY(${textOffset}px)`;
				}
				for (let vars of this.kf) SC.getElementById("gradient" + vars.num).setAttribute("gradient-transform", textTransforms);

				// Calculate the full bounding box after transforms. Rotations
				// are ignored because they're unnecessary for this purpose,
				// and they would make it more difficult to compare bounds.
				// https://code-industry.net/masterpdfeditor-help/transformation-matrix/
				function calc(x,y) {
					return {
						x: TT.fscx * x + Math.tan(TT.fay * Math.PI / 180) * y - anchor.x,
						y: Math.tan(TT.fax * Math.PI / 180) * x + TT.fscy * y - anchor.y
					};
				}
				let tl = calc(position.x, position.y);
				let br = calc(position.x + bbox.width, position.y + bbox.height);
				this.cachedBounds.top = tl.y;
				this.cachedBounds.left = tl.x;
				this.cachedBounds.bottom = br.y;
				this.cachedBounds.right = br.x;
			};

			return (data,lineNum,linePiece) => new Subtitle(data,lineNum,linePiece);
		})();


		// Read subtitle file into JavaScript objects.
		function parse_info(assfile,i) {
			var info = {};
			for (; i < assfile.length; ++i) {
				var line = assfile[i] = assfile[i].trim();
				if (line) {
					if (line.charAt(0) == "[") break;
					if (line.charAt(0) == "!" || line.charAt(0) == ";") continue;
					var keyval = line.split(":");
					if (keyval.length != 2) continue;
					info[keyval[0].trim()] = keyval[1].trim();
				}
			}
			return [info,i-1];
		}
		function parse_styles(assfile,i,isV4Plus) {
			// The first line should be the format line. If it's not, assume the default.
			let format_map, line = assfile[i] = assfile[i].trim();
			if (line.startsWith("Format:"))
				format_map = line.slice(7).split(",").map(x => x.trim());
			else
				format_map = ["Fontname","Fontsize","PrimaryColour","SecondaryColour","OutlineColour","BackColour","Bold","Italic","Underline","StrikeOut","ScaleX","ScaleY","Spacing","Angle","BorderStyle","Outline","Shadow","Alignment","MarginL","MarginR","MarginV","Encoding","Blur","Justify"];

			let styles = {};
			for (++i; i < assfile.length; ++i) {
				line = assfile[i] = assfile[i].trim();
				if (line.charAt(0) == "[") break;
				if (!line.startsWith("Style:")) continue;

				// Split the style line into its values.
				let values = line.slice(6).split(",").map(x => x.trim());

				// Convert the array of values into an object using the format map.
				let new_style = {isV4Plus:isV4Plus};
				for (let j = 0; j < values.length; ++j)
					new_style[format_map[j]] = values[j];
				new_style.Name = new_style.Name.replace(/[^_a-zA-Z0-9-]/g,"_");

				styles[new_style.Name] = new_style;
			}
			return [styles,i-1];
		}
		function parse_events(assfile,i) {
			var events = []; events.line = i + 1;
			var map = assfile[i].replace("Format:","").split(",").map(x => x.trim());
			for (++i; i < assfile.length; ++i) {
				var line = assfile[i] = assfile[i].trim();
				if (line.charAt(0) == "[") break;
				if (!line.startsWith("Dialogue:")) continue;

				var elems = line.slice(9).trim().split(",");
				var j, new_event = {};
				for (j = 0; map[j] != "Text" && j < map.length; ++j)
					new_event[map[j]] = elems[j];
				new_event.Style = new_event.Style.replace(/[^_a-zA-Z0-9-]/g,"_");
				if (map[j] == "Text") new_event.Text = elems.slice(j).join(",");

				events.push(new_event);
			}
			return [events,i-1];
		}
		function parse_fonts(assfile,i) {
			let fonts = {}, currFontName;
			for (; i < assfile.length; ++i) {
				let line = assfile[i];
				if (line.charAt(0) == "[") break;
				if (line.startsWith("fontname")) {
					let fontdata = "", fontname = line.split(":")[1].trim();
					for (++i; i < assfile.length; ++i) {
						let line = assfile[i];
						// The encoding used for the font ensures
						// there are no lowercase letters.
						if (/[a-z]/.test(line)) {
							--i;
							break;
						}
						fontdata += line;
					}
					fonts[fontname] = fontdata;
				}
			}

			// Decode the fonts.
			for (let fontname in fonts) {
				let fontdata = fonts[fontname];

				let end = fontdata.slice(-1 * (fontdata.length % 4));
				if (end) fontdata = fontdata.slice(0, -1 * end.length);

				let decoded = "";
				for (let i = 0; i < fontdata.length; i += 4) {
					let bits = [fontdata[i],fontdata[i+1],fontdata[i+2],fontdata[i+3]].map(c => c.charCodeAt() - 33);
					let word = (bits[0] << 18) | (bits[1] << 12) | (bits[2] << 6) | bits[3];
					decoded += String.fromCharCode((word >> 16) & 0xFF, (word >> 8) & 0xFF, word & 0xFF);
				}

				if (end.length == 3) {
					let bits = [end[0],end[1],end[2]].map(c => c.charCodeAt() - 33);
					let word = (((bits[0] << 12) | (bits[1] << 6) | bits[2]) / 0x10000) | 0;
					decoded += String.fromCharCode((word >> 16) & 0xFF, (word >> 8) & 0xFF);
				} else if (end.length == 2) {
					let bits = [end[0],end[1]].map(c => c.charCodeAt() - 33);
					let word = (((bits[0] << 6) | bits[1]) / 0x100) | 0;
					decoded += String.fromCharCode((word >> 16) & 0xFF);
				}

				fonts[fontname] = decoded;
			}

			// Set fonts to null if there were no fonts.
			fonts = (() => {
				for (let f in fonts)
					return fonts;
				return null;
			})();

			return [fonts,i-1];
		}
		function parse_ass_file(asstext) {
			var assdata = {styles:{}};
			var assfile = asstext.split(/\r\n|\r|\n/g);
			for (var i = 0; i < assfile.length; ++i) {
				var line = assfile[i] = assfile[i].trim();
				if (line && line.charAt(0) == "[") {
					if (line == "[Script Info]")
						[assdata.info,i] = parse_info(assfile,i+1);
					else if (line.includes("Styles"))
						[assdata.styles,i] = parse_styles(assfile,i+1,line.includes("+"));
					else if (line == "[Events]")
						[assdata.events,i] = parse_events(assfile,i+1);
					else if (line == "[Fonts]")
						[assdata.fonts,i] = parse_fonts(assfile,i+1);
				}
			}
			return assdata;
		}

		// Convert parsed subtitle file into HTML/CSS/SVG.
		function parse_head(info) {
			if (state != STATES.INITIALIZING) return;

			// Parse/Calculate width and height.
			var width = 0, height = 0;
			if (info.PlayResX) width = parseFloat(info.PlayResX);
			if (info.PlayResY) height = parseFloat(info.PlayResY);
			if (width <= 0 && height <= 0) {
				width = 384;
				height = 288;
			} else {
				if (height <= 0)
					height = (width == 1280 ? 1024 : Math.max(1, width * 3 / 4));
				else if (width <= 0)
					width = (height == 1024 ? 1280 : Math.max(1, height * 4 / 3));
			}

			SC.setAttribute("viewBox", "0 0 " + width + " " + height);
			SC.setAttribute("height", height);
			SC.setAttribute("width", width);

			ScaledBorderAndShadow = info.ScaledBorderAndShadow ? Boolean(info.ScaledBorderAndShadow.toLowerCase() == "yes" || parseInt(info.ScaledBorderAndShadow)) : true;
			TimeOffset = parseFloat(info.TimeOffset) || 0;
			PlaybackSpeed = (100 / info.Timer) || 1;
			renderer.WrapStyle = (info.WrapStyle ? parseInt(info.WrapStyle) : 2);
			reverseCollisions = info.Collisions && info.Collisions.toLowerCase() == "reverse";
		}
		function write_fonts(fonts,styles) {
			if (state != STATES.INITIALIZING || fonts == null) return;

			// Add the style HTML element.
			if (!fontCSS) {
				fontCSS = document.createElement("style");
				SC.insertBefore(fontCSS, SC.firstChild);
			}

			// Get a set of the names of all the fonts used by the styles.
			let styleFonts = new Set();
			for (let key in styles) {
				let style = styles[key];
				if (style.Fontname) {
					if (style.Fontname.charAt(0) == "@") {
						styleFonts.add(style.Fontname.slice(1));
					} else styleFonts.add(style.Fontname);
				}
			}
			styleFonts.delete("Arial");
			styleFonts.delete("ArialMT");

			let css = "";
			for (let font in fonts) {
				let fontdata = fonts[font];

				// Try to get the font filename and extension.
				let fontname = font, submime = "*";
				if (font.endsWith(".ttf") || font.endsWith(".ttc")) {
					fontname = font.slice(0,-4);
					submime = "ttf";
				} else if (font.endsWith(".otf") || font.endsWith(".eot")) {
					fontname = font.slice(0,-4);
					submime = "otf";
				}

				// If the current fontname isn't used by any style,
				// check for one of the style fonts in the font data.
				if (!styleFonts.has(fontname)) {
					for (let name of styleFonts) {
						if (fontdata.includes(name)) {
							fontname = name;
							break;
						}
					}
				}

				// Create the font-face CSS.
				css += "@font-face {\n";
				css += "  font-family: \"" + fontname + "\";\n";
				css += "  src: url(data:font/" + submime + ";charset=utf-8;base64," + btoa(fontdata) + ");\n";
				css += "}\n\n";
			}

			fontCSS.innerHTML = css;
		}
		function write_styles(styles) {
			if (state == STATES.UNINITIALIZED || state == STATES.RESTARTING_INIT) return;

			function set_style_defaults(style) {
				// If the font name starts with "@" it is supposed to be displayed vertically.
				style.Vertical = false;
				if (style.Fontname) {
					if (style.Fontname.charAt(0) == "@") {
						style.Fontname = style.Fontname.slice(1);
						style.Vertical = true;
					}
				} else style.Fontname = "Arial";
				style.Fontsize = parseInt(style.Fontsize,10) || 40;

				// Set default colors.
				style.PrimaryColour = style.PrimaryColour || "&HFFFFFF"; // white
				style.SecondaryColour = style.SecondaryColour || "&HFF0000"; // blue
				style.OutlineColour = style.OutlineColour || style.TertiaryColour || "&H000000"; // black
				style.BackColour = style.BackColour || "&H000000"; // black

				// Parse hex colors.
				[style.c1a, style.c1r, style.c1g, style.c1b] = colorToARGB(style.PrimaryColour);
				[style.c2a, style.c2r, style.c2g, style.c2b] = colorToARGB(style.SecondaryColour);
				[style.c3a, style.c3r, style.c3g, style.c3b] = colorToARGB(style.OutlineColour);
				[style.c4a, style.c4r, style.c4g, style.c4b] = colorToARGB(style.BackColour);

				style.Bold = parseInt(style.Bold,10) || 0;
				style.Italic = Boolean(parseInt(style.Italic,10));
				style.Underline = Boolean(parseInt(style.Underline,10));
				style.StrikeOut = Boolean(parseInt(style.StrikeOut,10));

				style.ScaleX = parseFloat(style.ScaleX) || 100;
				style.ScaleY = parseFloat(style.ScaleY) || 100;

				style.Spacing = parseFloat(style.Spacing) || 0;
				style.Angle = parseFloat(style.Angle) || 0;
				if (style.Vertical) style.Angle -= 270; // Why 270?

				style.BorderStyle = parseInt(style.BorderStyle,10) || 1;
				style.Outline = parseFloat(style.Outline) || 0;
				style.Shadow = parseFloat(style.Shadow) || 0;
				if (style.Shadow) {
					if (style.Outline == 0) style.Outline = 1;
					style.ShOffX = style.Shadow;
					style.ShOffY = style.Shadow;
				} else {
					style.ShOffX = 0;
					style.ShOffY = 0;
				}

				style.Alignment = parseInt(style.Alignment,10) || 2;
				if (!style.isV4Plus) style.Alignment = SSA_ALIGNMENT_MAP[style.Alignment];
				delete style.isV4Plus;

				style.MarginL = parseFloat(style.MarginL) || 0;
				style.MarginR = parseFloat(style.MarginR) || 0;
				style.MarginV = parseFloat(style.MarginV) || 0;

				delete style.Encoding;

				style.Blur = parseFloat(style.Blur) || 0;
				style.Justify = Boolean(parseInt(style.Justify,10));

				// Clone the object and freeze it.
				return Object.freeze(JSON.parse(JSON.stringify(style)));
			}
			function style_to_css(style) {
				let css = `font-family: ${style.Fontname};\n`;
				css += `font-size: ${getFontSize(style.Fontname,style.Fontsize).size}px;\n`;

				if (style.Bold) css += "font-weight: bold;\n";
				if (style.Italic) css += "font-style: italic;\n";
				if (style.Underline || style.StrikeOut) {
					css += "text-decoration:";
					if (style.Underline) css += " underline";
					if (style.StrikeOut) css += " line-through";
					css += ";\n";
				}

				if (style.Vertical)
					css += "writing-mode: vertical-rl;\n";

				css += `fill: rgba(${style.c1r},${style.c1g},${style.c1b},${style.c1a});\n`;
				css += `stroke: rgba(${style.c3r},${style.c3g},${style.c3b},${style.c3a});\n`;
				css += `stroke-width: ${style.Outline}px;\n`;
				css += `margin: ${style.MarginV}px ${style.MarginR}px ${style.MarginV}px ${style.MarginL}px;\n`;

				return css;
			}

			// Add the style HTML element.
			if (!styleCSS) {
				styleCSS = document.createElement("style");
				if (fontCSS) SC.insertBefore(styleCSS, fontCSS.nextElementSibling);
				else SC.insertBefore(styleCSS, SC.firstChild);
			}

			// This is NOT the same as set_style_defaults().
			if (!styles.Default) {
				styles.Default = {
					Name: "Default",
					Outline: 2,
					MarginL: 10,
					MarginR: 10,
					MarginV: 20,
					Blur: 2
				};
			}

			// Set the style object defaults and convert them to CSS.
			let css = "";
			for (let name in styles) {
				if (!Object.isFrozen(styles[name]))
					styles[name] = set_style_defaults(styles[name]);
				css += `\n.subtitle_${name} {\n${style_to_css(styles[name])}}\n`;
			}
			styleCSS.innerHTML = css.slice(1,-1);
			renderer.styles = Object.freeze(styles);
		}
		function init_subs(subtitle_lines) {
			if (state != STATES.INITIALIZING) return;

			var line_num = subtitle_lines.line;
			var layers = {};
			splitLines = [];
			subtitles = [];
			collisions = {"upper": {}, "lower": {}};

			function createSubtitle(line,num) {
				// If the line's style isn't defined, set it to the default.
				if (line.Style in renderer.styles === false)
					line.Style = "Default";

				// For combining adjacent override blocks.
				var reAdjacentBlocks = /({[^}]*)}{([^}]*})/g;
				var combineAdjacentBlocks = text => text.replace(reAdjacentBlocks,"$1$2").replace(reAdjacentBlocks,"$1$2");

				var text = line.Text;

				// Remove whitespace at the start and end, and handle '\h'.
				text = text.trim();
				text = text.replace(/\\h/g," ");

				// Check if there are line breaks, and replace soft breaks with spaces if they don't apply. Yes, the
				// ".*" in the second RegEx is deliberate. Since \q affects the entire line, there should only be one.
				// If there are more, the last one is applied.
				let hasLineBreaks = text.includes("\\N");
				let qWrap = text.match(/{[^}]*\\q[0-9][^}]*}/g), qWrapVal = renderer.WrapStyle;
				if (qWrap) qWrapVal = parseInt(/.*\\q([0-9])/.exec(qWrap[qWrap.length-1])[1],10);
				if (qWrapVal == 2) hasLineBreaks = hasLineBreaks || text.includes("\\n");
				else text = text.replace(/\\n/g," ");

				// Combine adjacent override blocks.
				text = combineAdjacentBlocks(text);

				// Remove empty override blocks.
				text = text.replace(/{}/g,"");

				let reMulKar1 = /\\(?:K|(?:k[fo]?))(\d+(?:\.\d+)?)(.*?)(\\(?:K|(?:k[fo]?))\d+(?:\.\d+)?)/;
				let reMulKar2 = /\\kt(\d+(?:\.\d+)?)(.*?)\\kt(\d+(?:\.\d+)?)/;
				let changes;
				text = text.replace(/{[^}]*}/g, match => { // match = {...}
					// Fix multiple karaoke effects in one override.
					do {
						changes = false;
						match = match.replace(reMulKar1, (M,a,b,c) => {
							changes = true;
							return "\\kt" + a + c + b;
						});
					} while (changes);

					// Combine subsequent \kt overrides.
					do {
						changes = false;
						match = match.replace(reMulKar2, (M,a,b,c) => {
							changes = true;
							return "\\kt" + (parseFloat(a) + parseFloat(c)) + b;
						});
					} while (changes);

					// Fix nested \t() overrides. Part 2 is duplicated since it could overlap.
					match = match.replace(/\\t([^(])/g, "\\t($1"); // ensure open paren
					match = match.replace(/\\t([^)]*)\\t/g, "\\t$1)\\t"); // ensure close paren
					match = match.replace(/\\t([^)]*)\\t/g, "\\t$1)\\t"); // ensure close paren
					match = match.replace(/\\t([^)]*)\)+/g, "\\t$1)"); // remove duplicate close parens

					return match;
				});

				// If the line doesn't start with an override, add one.
				if (text.charAt(0) != "{") text = "{}" + text;

				line.Text = text;


				// Remove all of the override blocks and check if there's anything left. If not, return.
				if (!line.Text.replace(/{[^}]*}/g,"")) return;


				// Things that can change within a line, but isn't allowed to be changed within a line in HTML/CSS/SVG,
				// as well and things that can change the size of the text, and the start of paths.
				// Can't Change Within a Line: \be, \blur, \bord, \fax, \fay, \fr, \frx, \fry, \frz, \fs, \fsc, \fscx, \fscy, \fsp, \r, \shad, \xshad, and \yshad
				// Affects Text Size: \b, \i, \fax, \fay, \fn, \fs, \fsc, \fscx, \fscy, \fsp, and \r
				var reProblemBlock = /{[^\\]*\\(?:i|b(?:e|lur|ord)?|f(?:a[xy]|n|r[xyz]?|s(?:c[xy]?|p)?)|r|[xy]?shad|p(?:[1-9]|0\.[0-9]*[1-9]))[^}]*}/;
				var reProblem = /\\(?:i|b(?:e|lur|ord)?|f(?:a[xy]|n|r[xyz]?|s(?:c[xy]?|p)?)|r|[xy]?shad|p(?:[1-9]|0\.[0-9]*[1-9]))/;


				// Check for a line break anywhere, or one of the problematic overrides after the first block.
				if (hasLineBreaks || reProblemBlock.test(line.Text.slice(line.Text.indexOf("}")))) {
					// Split on newlines, then into block-text pairs, then split the pair.
					var pieces = line.Text.split(/\\[Nn]/g).map(x => combineAdjacentBlocks("{}"+x).split("{").slice(1).map(y => y.split("}")));

					// 'megablock' is the concatenation of every previous override in the line. It is prepended
					// to each new line so that they don't lose any overrides that might affect them. 'safe' is
					// an array of the new lines to create. 'breaks' is an array of the number of new lines that
					// make up each actual line.
					let megablock = "{", safe = [""], breaks = [];

					// Merge subtitle line pieces into non-problematic strings. Each piece can still have more
					// than one block in it, but problematic blocks will start a new piece. For example, a block
					// that is scaled differently will start a piece and every other block in that piece must have
					// the same scale. If the scale changes again, it will start a new piece. This also ensures
					// that paths will always be at the start of a piece, simplifying size calculations.
					for (let piece of pieces) {
						let sCount = safe.length;
						for (let block of piece) {
							megablock += block[0];
							if (safe[0] && reProblem.test(block[0])) safe.push(megablock + "}" + block[1]);
							else safe[safe.length-1] += "{" + block[0] + "}" + block[1];
						}
						breaks.push(1 + safe.length - sCount);
						safe.push(megablock + "}");
					}

					safe = safe.slice(0,-1).map(combineAdjacentBlocks);
					splitLines.push({line:subtitles.length,pieces:safe.length,breaks:breaks});

					// Create subtitle objects.
					for (let newLine, i = 0; i < safe.length; ++i) {
						newLine = JSON.parse(JSON.stringify(line));
						newLine.Text = safe[i];
						subtitles.push(NewSubtitle(newLine,num,i+1));
					}
				} else subtitles.push(NewSubtitle(line,num,0));
			}

			for (var line of subtitle_lines) {
				layers[line.Layer] = true;
				createSubtitle(line,line_num++);
			}

			for (var layer of Object.keys(layers)) {
				var d = createSVGElement("g");
					d.id = "layer" + layer;
				SC.appendChild(d);
			}
		}

		this.running = () => !paused;
		this.pause = function() {
			paused = true;
		};
		this.resume = function() {
			paused = false;
			if (state == STATES.UNINITIALIZED) renderer.init();
			else if (state == STATES.INITIALIZED) addAnimationTask(mainLoop);
		};
		this.resize = function() {
			if (state != STATES.INITIALIZED) return;

			if (video.videoWidth / video.videoHeight > video.clientWidth / video.clientHeight) { // letterboxed top and bottom
				var activeVideoHeight = video.clientWidth * video.videoHeight / video.videoWidth;
				SC.style.width = "100%";
				SC.style.height = activeVideoHeight + "px";
				SC.style.margin = ((video.clientHeight - activeVideoHeight) / 2) + "px 0px";
			} else { // letterboxed left and right
				var activeVideoWidth = video.clientHeight * video.videoWidth / video.videoHeight;
				SC.style.width = activeVideoWidth + "px";
				SC.style.height = "100%";
				SC.style.margin = "0px " + ((video.clientWidth - activeVideoWidth) / 2) + "px";
			}
		};

		this.setBorderStyle = x => (rendererBorderStyle = parseInt(x,10));
		this.addEventListeners = function() {
			if (state != STATES.INITIALIZED) return;
			video.addEventListener("pause",renderer.pause);
			video.addEventListener("play",renderer.resume);
			window.addEventListener("resize",renderer.resize);
			document.addEventListener("mozfullscreenchange",renderer.resize);
			document.addEventListener("webkitfullscreenchange",renderer.resize);
		};
		this.removeEventListeners = function() {
			video.removeEventListener("pause",renderer.pause);
			video.removeEventListener("play",renderer.resume);
			window.removeEventListener("resize",renderer.resize);
			document.removeEventListener("mozfullscreenchange",renderer.resize);
			document.removeEventListener("webkitfullscreenchange",renderer.resize);
		};

		this.setSubFile = function(file) {
			if (subFile == file) return;

			subFile = file;

			switch (state) {
				case STATES.UNINITIALIZED:
					// Nothing's been done, so there's nothing to do.
					break;
				case STATES.INITIALIZING:
					// Since we have a new file now, we'll need to re-initialize everything.
					state = STATES.RESTARTING_INIT;
					break;
				case STATES.RESTARTING_INIT:
					// We're already restarting, so we don't have to do anything here.
					break;
				case STATES.INITIALIZED:
					// We will need to re-initialize before using the new file.
					state = STATES.UNINITIALIZED;
					break;
			}
		};
		this.init = function() {
			if (!subFile) return;

			// If we're already initializing, cancel that one and restart.
			if (state == STATES.INITIALIZING) {
				state = STATES.RESTARTING_INIT;
				initRequest.abort();
				addTask(renderer.init);
				return;
			}

			state = STATES.INITIALIZING;

			initRequest = new XMLHttpRequest();
			initRequest.open("get",subFile,true);
			initRequest.onreadystatechange = function() {
				if (this.readyState != 4 || !this.responseText) return;
				if (state != STATES.INITIALIZING) {
					if (state == STATES.RESTARTING_INIT)
						addTask(renderer.init);
					return;
				}

				renderer.clean();
				state = STATES.INITIALIZING;
				let assdata = parse_ass_file(this.responseText);

				function templocal() {
					video.removeEventListener("loadedmetadata",templocal);

					if (state != STATES.INITIALIZING) {
						if (state == STATES.RESTARTING_INIT)
							addTask(renderer.init);
						return;
					}

					parse_head(assdata.info);
					write_fonts(assdata.fonts,assdata.styles);
					write_styles(assdata.styles);
					init_subs(assdata.events);
					state = STATES.INITIALIZED;
					addTask(renderer.resize);
					addTask(renderer.addEventListeners);
					addAnimationTask(mainLoop);
				}

				// Wait for video metadata to be loaded.
				if (video.readyState) templocal();
				else video.addEventListener("loadedmetadata",templocal);
			};
			initRequest.send();
		};
		this.clean = function() {
			renderer.removeEventListeners();
			if (subtitles) for (let S of subtitles) S.clean();
			splitLines = [];
			subtitles = [];
			collisions = {"upper": {}, "lower": {}};
			SC.innerHTML = "<defs></defs>";
			fontCSS = null;
			styleCSS = null;
			state = STATES.UNINITIALIZED;
		};

		function mainLoop() {
			if (video.paused) renderer.pause();
			if (paused || state != STATES.INITIALIZED) return;

			var time = video.currentTime + TimeOffset;
			if (Math.abs(time-lastTime) >= 0.01) {
				lastTime = time;

				// Display Subtitles
				for (var S of subtitles) {
					if (S.state == STATES.UNINITIALIZED && S.time.start <= time + 3) {
						addTask(S.init.bind(S)); // Initialize subtitles early so they're ready.
						S.state = STATES.INITIALIZING;
					} else if (S.time.start <= time && time <= S.time.end) {
						// Don't start and update on the same frame. The SVG
						// elements need to be drawn once in their original
						// state before applying a new transition.
						if (!S.visible) S.start()
						else S.update(time - S.time.start);
					} else if (S.visible) S.clean();
				}

				// Fix position of subtitle lines that had to be split.
				for (let L of splitLines) {
					if (subtitles[L.line].visible && subtitles[L.line].moved) {
						subtitles[L.line].moved = false;


						let A = parseInt(subtitles[L.line].style.Alignment,10);
						let J = subtitles[L.line].style.Justify;
						let widths = [], heights = [], lines;


						// Align Horizontally
						lines = subtitles.slice(L.line,L.line+L.pieces);
						for (let amount of L.breaks) {
							let spans = lines.splice(0,amount);
							let totalWidth = 0, maxHeight = 0;

							// Align the pieces relative to the previous piece.
							if (A%3 == 1) { // Left Alignment
								for (let span of spans) {
									span.splitLineOffset.x = totalWidth;
									totalWidth += span.width();
									maxHeight = Math.max(maxHeight,span.height());
								}
							} else if (A%3 == 2) { // Middle Alignment
								totalWidth = spans.reduce((sum,span) => sum + span.width(), 0);
								let accumOffset = 0;
								for (let span of spans) {
									let sw = span.width();
									span.splitLineOffset.x = accumOffset + (sw - totalWidth) / 2;
									accumOffset += sw;
									maxHeight = Math.max(maxHeight,span.height());
								}
							} else { // Right Alignment
								totalWidth = spans.reduce((sum,span) => sum + span.width(), 0);
								let accumOffset = 0;
								for (let span of spans) {
									accumOffset += span.width();
									span.splitLineOffset.x = accumOffset - totalWidth;
									maxHeight = Math.max(maxHeight,span.height());
								}
							}

							widths.push(totalWidth);
							heights.push(maxHeight);
						}


						// Justify
						// https://github.com/libass/libass/pull/241
						if (J && (A-J)%3 != 0) {
							let maxWidth = Math.max(...widths);
							lines = subtitles.slice(L.line,L.line+L.pieces);
							for (let i = 0; i < L.breaks.length; ++i) {
								let offset = maxWidth - widths[i];
								if (offset) {
									if ((J == 1 && A%3 == 2) || (J == 2 && A%3 == 0)) // To Left From Center or To Center From Right
										offset /= -2;
									else if (J == 1 && A%3 == 0) // To Left From Right
										offset = -offset;
									else if ((J == 3 && A%3 == 2) || (J == 2 && A%3 == 1)) // To Right From Center or To Center From Left
										offset /= 2;
									// else if (J == 3 && A%3 == 1) // To Right From Left
										// offset = offset;

									let spans = lines.splice(0,L.breaks[i]);
									for (let span of spans)
										span.splitLineOffset.x += offset;
								}
							}
						}


						// Align Vertically
						lines = subtitles.slice(L.line,L.line+L.pieces);
						if (true) { // So that this block can be collapsed.
							let totalHeight = heights.reduce((sum,height) => sum + height, 0);

							let lineOffset = 0;
							if (A < 7) {
								lineOffset = heights[0] - totalHeight;
								if (A > 3) lineOffset /= 2;
							}

							for (let i = 0; i < L.breaks.length; ++i) {
								let lineHeight = heights[i];
								let spans = lines.splice(0,L.breaks[i]);
								for (let span of spans)
									span.splitLineOffset.y = lineOffset + lineHeight - span.height();
								lineOffset += lineHeight;
							}
						}


						// Apply Changes
						lines = subtitles.slice(L.line,L.line+L.pieces);
						for (let line of lines) line.updatePosition();


						// Merge Border Boxes (for border style 4)
						let BorderStyle = rendererBorderStyle || lines[0].style.BorderStyle;
						if (BorderStyle == 4) {
							let bounds = lines[0].getSplitLineBounds();

							// use the first box for all of the pieces
							let box = lines[0].box;
							box.style.transform = ""; // rotations are not applied
							let B = parseFloat(box.style.strokeWidth);
							box.setAttribute("x", bounds.left - B / 2);
							box.setAttribute("y", bounds.top - B / 2);
							box.setAttribute("width", (bounds.right - bounds.left) + B);
							box.setAttribute("height", (bounds.bottom - bounds.top) + B);
						}
					}
				}

				// Check for collisions and reposition lines if necessary.
				for (let region of ["upper","lower"]) {
					// Collisions are split into upper and lower regions for
					// performance reasons, and because we can't actually do
					// anything if lines from those two regions collide. Layers
					// also don't collide, so we can split on them too.
					for (let layer in collisions[region]) {
						// While looping through the potential collisions in a
						// layer, if any of them collide, we need to go back
						// search again. The handles the case where lines B and
						// C collide with line A and are offset, which then
						// causes lines B and C to collide.
						let anyCollisions = true;
						while (anyCollisions) {
							anyCollisions = false;
							for (let collision of collisions[region][layer]) {
								if (collision[0] && collision[1] && collision[0].visible && collision[1].visible) {
									let splitLines1 = SC.querySelectorAll(`g[id^=line${collision[1].lineNum}-]`);
									let B0 = collision[0].getSplitLineBounds(), B1 = collision[1].getSplitLineBounds(splitLines1);
									if (boundsOverlap(B0,B1)) {
										let overlap = region == "upper" ? B1.bottom - B0.top : B0.top - B1.bottom;
										for (let group of splitLines1) {
											group.line.collisionOffset += overlap;
											group.line.updatePosition();
											anyCollisions = true;
										}
									}
								}
							}
						}
					}
				}
			}

			addAnimationTask(mainLoop);
		}
	}


	/* Subtitle Object
		video:		the <video> element
		container:	the <svg> element
		renderer:	the Renderer object
	*/
	let subtitles = []; // array of all subtitle objects
	let SubtitleManager = {}; // object to return

	SubtitleManager.add = function(video,filepath,show) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (!SubtitleObject) {
			let SC = createSVGElement("svg");
				SC.classList.add("subtitle_container");
			video.parentElement.appendChild(SC);

			SubtitleObject = {
				video: video,
				container: SC,
				renderer: new Renderer(SC,video)
			};
			subtitles.push(SubtitleObject);
		}

		if (filepath) {
			SubtitleObject.renderer.setSubFile(filepath);
			if (show) {
				SubtitleObject.renderer.init();
				SubtitleObject.renderer.resume();
			}
		}
		SubtitleObject.container.style.display = SubtitleObject.renderer.running() ? "" : "none";
	};

	SubtitleManager.remove = function(video) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) {
			SubtitleObject.renderer.clean();
			SubtitleObject.container.remove();
			subtitles.splice(subtitles.indexOf(SubtitleObject),1);
		}
	};

	SubtitleManager.show = function(video) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) {
			SubtitleObject.renderer.resume();
			SubtitleObject.renderer.addEventListeners();
			SubtitleObject.container.style.display = "";
		}
	};

	SubtitleManager.hide = function(video) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) {
			SubtitleObject.container.style.display = "none";
			SubtitleObject.renderer.removeEventListeners();
			SubtitleObject.renderer.pause();
		}
	};

	SubtitleManager.visible = function(video) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		return SubtitleObject ? SubtitleObject.container.style.display != "none" : false;
	};

	SubtitleManager.setSubtitleFile = function(video,filepath) {
		if (!filepath) return;
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) SubtitleObject.renderer.setSubFile(filepath);
	};

	SubtitleManager.setBorderStyle = function(video,style) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) SubtitleObject.renderer.setBorderStyle(style || 0);
	};

	SubtitleManager.reload = function(video) {
		let SubtitleObject = subtitles.find(S => video == S.video);
		if (SubtitleObject) SubtitleObject.renderer.init();
	};

	return SubtitleManager;
})();
