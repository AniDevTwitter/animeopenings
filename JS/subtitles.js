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
											1	Use Border Style 1 (text has an outline)
											3	Use Border Style 3 (text has a background)
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
		let codes = keys.map(key => [].map.call(key, x => x.charCodeAt(0)));

		function get_next(root, code, i) {
			let num = code[i];
			if (num === undefined) root[NaN] = NaN;
			else root[num] = get_next(root[num] || {}, code, i + 1);
			return root;
		}
		let trie = {};
		for (let code of codes) {
			let num = code[0];
			trie[num] = get_next(trie[num] || {}, code, 1);
		}

		function to_conditional(root,i) {
			let codes = Object.keys(root);
			if (codes.length == 1) {
				if (isNaN(codes[0])) return [`return ${i};`];
				else return [
					`if (str.charCodeAt(${i}) === ${codes[0]}) {`,
						...to_conditional(root[codes[0]], i + 1).map(line => "\t" + line),
					"}"
				];
			} else {
				let has_end = false, lines = [`switch (str.charCodeAt(${i})) {`];
				for (let code of codes) {
					if (isNaN(code)) has_end = true;
					else lines.push(
						`\tcase ${code}:`,
						...to_conditional(root[code],i+1).map(line => "\t\t" + line),
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
	//                          1, 2, 3,       5, 6, 7,    9, 10, 11
	let SSA_ALIGNMENT_MAP = [0, 1, 2, 3, 0, 0, 7, 8, 9, 0, 4,  5,  6];

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
		var assdata, initRequest, rendererBorderStyle, splitLines, fontCSS, styleCSS, subFile, subtitles, collisions, reverseCollisions;

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
			"b" : function(arg,ret) {
				ret.style["font-weight"] = (arg && +arg) ? (arg == "1" ? "bold" : arg) : "inherit";
				this.cachedBBox = null;
			},
			"i" : function(arg,ret) {
				ret.style["font-style"] = (arg && +arg) ? "italic" : "inherit";
				this.cachedBBox = null;
			},
			"u" : function(arg,ret) {
				if (arg && +arg) {
					if (ret.style["text-decoration"]) ret.style["text-decoration"] = "underline line-through";
					else ret.style["text-decoration"] = "underline";
				} else {
					if (ret.style["text-decoration"].includes("line-through")) ret.style["text-decoration"] = "line-through";
					else ret.style["text-decoration"] = "initial";
				}
			},
			"s" : function(arg,ret) {
				if (arg && +arg) {
					if (ret.style["text-decoration"]) ret.style["text-decoration"] = "underline line-through";
					else ret.style["text-decoration"] = "line-through";
				} else {
					if (ret.style["text-decoration"].includes("underline")) ret.style["text-decoration"] = "underline";
					else ret.style["text-decoration"] = "initial";
				}
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
			"a" : function(arg) {
				if (typeof(this.style.Alignment) == "string") {
					if (arg == 0) arg = parseInt(renderer.styles[this.style.Name].Alignment,10);
					else arg = SSA_ALIGNMENT_MAP[parseInt(arg,10)];
					this.style.Alignment = arg;
					this.repositioned = true;
				}
			},
			"an" : function(arg) {
				if (typeof(this.style.Alignment) == "string") {
					if (arg == 0) arg = renderer.styles[this.style.Name].Alignment;
					this.style.Alignment = parseInt(arg,10);
					this.repositioned = true;
				}
			},
			"be" : function(arg) {
				this.style.Blur = arg;
			},
			"blur" : function(arg) {
				this.style.Blur = arg;
			},
			"bord" : function(arg) {
				this.style.Outline = arg;
				this.cachedBBox = null;
			},
			"xbord" : function(arg) {
				// ?
				this.cachedBBox = null;
			},
			"ybord" : function(arg) {
				// ?
				this.cachedBBox = null;
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
			"clip(" : function(arg) {
				if (!arg) return;

				arg = arg.slice(0,-1).split(",");
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();

				// Calculate Path
				let pathCode;
				if (arg.length == 4)
					pathCode = "M " + arg[0] + " " + arg[1] + " L " + arg[2] + " " + arg[1] + " " + arg[2] + " " + arg[3] + " " + arg[0] + " " + arg[3];
				else if (arg.length == 2)
					pathCode = pathASStoSVG(arg[1], arg[0]);
				else
					pathCode = pathASStoSVG(arg[0], 1);

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
			"iclip(" : function(arg) {
				if (!arg) return;

				arg = arg.slice(0,-1).split(",");
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();

				// Calculate Path
				let pathCode;
				if (arg.length == 4)
					pathCode += "M " + arg[0] + " " + arg[1] + " L " + arg[2] + " " + arg[1] + " " + arg[2] + " " + arg[3] + " " + arg[0] + " " + arg[3];
				else if (arg.length == 2)
					pathCode += pathASStoSVG(arg[1], arg[0]);
				else
					pathCode += pathASStoSVG(arg[0], 1);

				// Create Elements
				let path = createSVGElement("path");
					path.setAttribute("d",pathCode);
				let clipPath = createSVGElement("clipPath");
					clipPath.id = "clip" + counter;
					clipPath.appendChild(path);

				SC.getElementsByTagName("defs")[0].appendChild(clipPath);

				this.clip = {"type" : "clip-path", "num" : counter++};
			},
			"fad(" : function(arg) {
				arg = arg.slice(0,-1).split(",");
				var time = this.time.milliseconds;
				this.addFade(255,0,255,0,arg[0],time-arg[1],time);
			},
			"fade(" : function(arg) {
				arg = arg.slice(0,-1).split(",");
				this.addFade(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5],arg[6]);
			},
			"fax" : function(arg) {
				this.transforms["fax"] = "matrix(1,0," + arg + ",1,0,0)";
			},
			"fay" : function(arg) {
				this.transforms["fay"] = "matrix(1," + arg + ",0,1,0,0)";
			},
			"fn" : function(arg,ret) {
				this.style.Fontname = arg;
				ret.style["font-family"] = arg;
				ret.style["font-size"] = getFontSize(arg,this.style.Fontsize).size + "px";
				this.repositioned = true;
			},
			"fr" : function(arg) {
				map["frz"].call(this,arg);
			},
			"frx" : function(arg) {
				this.transforms["frx"] = "rotateX(" + arg + "deg)";
			},
			"fry" : function(arg) {
				this.transforms["fry"] = "rotateY(" + arg + "deg)";
			},
			"frz" : function(arg) {
				this.transforms["frz"] = "rotateZ(" + -(this.style.Angle + parseFloat(arg)) + "deg)";
			},
			"fs" : function(arg,ret) {
				var size;

				if (!arg || arg == "0")
					size = renderer.styles[this.style.Name].Fontsize;
				else if (arg.charAt(0) == "+" || arg.charAt(0) == "-")
					size = this.style.Fontsize * (1 + (parseInt(arg) / 10));
				else size = arg;

				this.style.Fontsize = size;
				ret.style["font-size"] = getFontSize(this.style.Fontname,size).size + "px";
				this.repositioned = true;
			},
			"fsc" : function(arg) {
				map["fscx"].call(this,arg,ret);
				map["fscy"].call(this,arg,ret);
			},
			"fscx" : function(arg) {
				if (!arg || arg == "0") arg = renderer.styles[this.style.Name].ScaleX;
				this.style.ScaleX = arg;
				this.transforms["fscx"] = "scaleX(" + arg / 100 + ")";
			},
			"fscy" : function(arg) {
				if (!arg || arg == "0") arg = renderer.styles[this.style.Name].ScaleY;
				this.style.ScaleY = arg;
				this.transforms["fscy"] = "scaleY(" + arg / 100 + ")";
			},
			"fsp" : function(arg,ret) {
				if (arg == "0") arg = this.style.Spacing;
				ret.style["letter-spacing"] = arg + "px";
				this.cachedBBox = null;
			},
			"k" : function(arg,ret) {
				setKaraokeColors.call(this,arg,ret,false);
			},
			"K" : function(arg,ret) {
				map["kf"].call(this,arg,ret);
			},
			"kf" : function(arg,ret) {
				// create gradient elements
				let startNode = createSVGElement("stop");
					startNode.setAttribute("offset",0);
					startNode.setAttribute("stop-color", "rgba(" + this.style.c1r + "," + this.style.c1g + "," + this.style.c1b + "," + this.style.c1a + ")");
				let endNode = createSVGElement("stop");
					endNode.setAttribute("stop-color", "rgba(" + this.style.c2r + "," + this.style.c2g + "," + this.style.c2b + "," + this.style.c2a + ")");
				let grad = createSVGElement("linearGradient");
					grad.appendChild(startNode);
					grad.appendChild(endNode);
					grad.id = "gradient" + counter;
				SC.getElementsByTagName("defs")[0].appendChild(grad);

				ret.style.fill = "url(#gradient" + counter + ")";

				if (this.karaokeTransitions) {
					// remove the previous \k or \ko transition
					let last = this.karaokeTransitions[this.karaokeTransitions.length-1];
					ret.classes = ret.classes.filter(str => !str.endsWith(last));
				}

				if (this.kf.length) {
					// remove the previous \kf transition
					let last = this.kf[this.kf.length-1];
					ret.classes = ret.classes.filter(str => !str.endsWith(last.num));
				}
				ret.classes.push("kf"+counter);

				let vars = {
					"startTime" : this.karaokeTimer,
					"endTime" : this.karaokeTimer + arg * 10,
					"num" : counter
				};
				this.kf.push(vars);

				++counter;
				this.karaokeTimer = vars.endTime;
			},
			"ko" : function(arg,ret) {
				setKaraokeColors.call(this,arg,ret,true);
			},
			"kt" : function(arg) {
				this.karaokeTimer += arg * 10;
			},
			"_k" : function(arg,ret) {
				let color = this["k"+arg];
				if (color.isko) this.style.c3a = color.o;
				else {
					ret.style.fill = "rgba(" + color.r + "," + color.g + "," + color.b + "," + color.a + ")";
					this.style.c1r = color.r;
					this.style.c1g = color.g;
					this.style.c1b = color.b;
					this.style.c1a = color.a;
				}
			},
			"move(" : function(arg) {
				arg = arg.slice(0,-1).split(",");
				this.addMove(arg[0],arg[1],arg[2],arg[3],arg[4],arg[5]);
			},
			"org(" : function(arg) {
				arg = arg.slice(0,-1).split(",");
				this.tOrg = arg[0] + "px " + arg[1] + "px";
			},
			"p" : function(arg,ret) {
				ret.hasPath = parseFloat(arg);
			},
			"pbo" : function(arg) {
				this.pathOffset.y = parseInt(arg,10);
			},
			"pos(" : function(arg) {
				arg = arg.slice(0,-1).split(",");
				this.style.position.x = parseFloat(arg[0]);
				this.style.position.y = parseFloat(arg[1]);
				this.repositioned = true;
			},
			"q" : function(arg) {
				// This isn't used by anything yet.
				// this.WrapStyle = arg ? parseInt(arg) : renderer.styles[this.style.Name].WrapStyle;
			},
			"r" : function(arg,ret) {
				var pos = this.style.position;
				var style = (!arg ? this.style.Name : (renderer.styles[arg] ? arg : this.style.Name));
				ret.classes.push("subtitle_" + style.replace(/ /g,"_"));
				this.style = JSON.parse(JSON.stringify(renderer.styles[style]));
				this.style.position = pos;
				this.repositioned = true;
			},
			"shad" : function(arg) {
				this.style.ShOffX = arg;
				this.style.ShOffY = arg;
			},
			"xshad" : function(arg) {
				this.style.ShOffX = arg;
				if (!this.style.ShOffY) this.style.ShOffY = 0;
			},
			"yshad" : function(arg) {
				if (!this.style.ShOffX) this.style.ShOffX = 0;
				this.style.ShOffY = arg;
			}
		};
		let compiled_trie = generate_compiled_trie(Object.keys(map));
		function setKaraokeColors(arg,ret,isko) { // for \k and \ko
			// color to start at
			this.karaokeColors = {
				"ko" : isko,
				"r" : this.style.c2r,
				"g" : this.style.c2g,
				"b" : this.style.c2b,
				"a" : this.style.c2a
			};

			// color to return to
			this["k"+counter] = {
				"ko" : isko,
				"r" : this.style.c1r,
				"g" : this.style.c1g,
				"b" : this.style.c1b,
				"a" : this.style.c1a,
				"o" : this.style.c3a
			};

			if (this.kf.length) {
				// remove the previous \kf transition
				let last = this.kf[this.kf.length-1];
				ret.classes = ret.classes.filter(str => !str.endsWith(last.num));
			}

			if (this.karaokeTransitions) {
				// remove the previous \k or \ko transition
				let last = this.karaokeTransitions[this.karaokeTransitions.length-1];
				ret.classes = ret.classes.filter(str => !str.endsWith(last));
				this.karaokeTransitions.push(counter);
			} else this.karaokeTransitions = [counter];

			this.addTransition(ret, this.karaokeTimer + "," + this.karaokeTimer, "\\_k" + counter, counter);
			this.karaokeTimer += arg * 10;
			++counter;
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

			path = path.toLowerCase();
			path = path.replace(/b/g,"C");   // cubic bézier curve to point 3 using point 1 and 2 as the control points
			path = path.replace(/l/g,"L");   // line-to <x>, <y>
			path = path.replace(/m/g,"Z M"); // move-to <x>, <y> (closing the shape first)
			path = path.replace(/n/g,"M");   // move-to <x>, <y> (without closing the shape)

			// explicitly add implicit "p" commands
			// before: p a b c d
			// after:  p a b p c d
			let rePathP1 = /p\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/g;
			let changes = true;
			while (changes) {
				changes = false;
				path = path.replace(rePathP1, (M,a,b,c,d) => {
					changes = true;
					return "p " + a + " " + b + " p " + c + " " + d;
				});
			}

			// extend b-spline to <x>, <y>
			// before: s x1 y1 x2 y2 x3 y3 p x4 y4
			// after:  s x1 y1 x2 y2 x2+2(x3-x2) y2+2(y3-y2) x4 y4
			let rePathP2 = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*p\s*/g;
			changes = true;
			while (changes) {
				changes = false;
				path = path.replace(rePathP2, (M,x2,y2,x3,y3) => {
					changes = true;
					[x2,y2,x3,y3] = [parseFloat(x2),parseFloat(y2),parseFloat(x3),parseFloat(y3)];
					return x2 + " " + y2 + " " + (x2 + 2 * (x3 - x2)) + " " + (y2 + 2 * (y3 - y2)) + " ";
				});
			}

			// 3rd degree uniform b-spline to point N, contains at least 3 coordinates
			// this is the same as "b" if there are only 3 coordinates
			// TODO - SVG doesn't have this. Figure out how to convert it to a series of Bézier curves.
			path = path.replace(/s/g,"C");

			// close b-spline
			// TODO - this is supposed to actually finish off the curve, not just draw a straight line to the start
			path = path.replace(/c/g,"Z");

			// remove redundant "Z"s at the start
			path = path.replace(/^(?:\s*Z\s*)*/,"");

			// scale path
			if (scale != 1) {
				scale = 1 << (scale - 1);
				path = path.replace(/\d+/g, M => parseFloat(M) / scale);
			}

			// close path at the end and return
			return path + " Z";
		}
		function getFontSize(font,size) {
			size = (+size).toFixed(2);

			if (!fontsizes[font]) {
				fontsizes[font] = {};
				let cssFontNameValue = "0 \"" + font.replace(/"/g,"\\\"") + "\"";
				if (document.fonts && !document.fonts.check(cssFontNameValue)) {
					document.fonts.load(cssFontNameValue).then(() => {
						fontsizes[font] = {};
						write_styles();
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

				finalE.remove();

				fontsizes[font][size] = {"size" : scaled, "height" : height};
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

			// This function checks if the given line collides with any others.

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
			let A = parseInt(line.style.Alignment,10);
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
					if (parseInt(collision[1].lineNum) != parseInt(line.lineNum) && timeOverlap(collision[1].time,line.time)) {
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
					if (parseInt(collision[0].lineNum) != parseInt(line.lineNum) && timeOverlap(collision[0].time,line.time)) {
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

				this.pathOffset.x = 0; // Horizontal Path Offset
				let ret = {"style": {}, "classes": [], "hasPath": 0};
				let match, overrideTextSplit = /({[^}]*})?([^{]*)/g;
				while ((match = overrideTextSplit.exec(line))[0]) {
					let [_,override,text] = match;

					// Parse the overrides, converting them to CSS attributes.
					if (override) override_to_css.call(this,override,ret);

					if (ret.hasPath) {
						// Convert ASS path to SVG path, storing the result.
						if (ret.hasPath + text in computedPaths === false)
							computedPaths[ret.hasPath+text] = pathASStoSVG(text,ret.hasPath);

						let P = createSVGElement("path");
							P.setAttribute("d",computedPaths[ret.hasPath+text]);
							P.classList.add(...this.div.classList, ...ret.classes);
							for (let s in ret.style) P.style[s] = ret.style[s];

						// SVG bounding boxes are not affected by transforms,
						// so we can get this here and it will never change.
						SC.appendChild(P);
						P.bbox = P.getBBox();
						P.remove();

						let A = this.style.Alignment;
						if (A % 3) { // 1, 2, 4, 5, 7, 8
							let offset = P.bbox.width;
							if ((A + 1) % 3 == 0) // 2, 5, 8
								offset /= 2;

							// This is saved here in case ScaleX changes later in the line.
							this.pathOffset.x = offset * this.style.ScaleX / 100;
						}

						this.path = P;
					}

					updateShadows.call(this,ret);

					let tspan = createSVGElement("tspan");
					for (let x in ret.style) tspan.style[x] = ret.style[x];
					if (ret.classes.length) tspan.classList.add(...ret.classes);
					if (!ret.hasPath) {
						if (this.pathOffset.x) {
							// Set the "dx" attribute offset for the first subsequent span only.
							tspan.setAttribute("dx",this.pathOffset.x);
							this.pathOffset.x = 0;
						}
						tspan.textContent = text || "\u200B";
					}
					toReturn.appendChild(tspan);
				}

				return toReturn;
			}
			function override_to_css(match,ret) {
				// Remove {,} tags and first "\", then split on the remaining "\".
				let options = match.slice(match.indexOf("\\")+1,-1).split("\\");

				let transition = 0;
				let transitionString = "";
				let transline = "";
				for (let opt of options) {
					if (transition) {
						transline += "\\" + opt;
						transition += opt.split("(").length - 1;
						transition -= opt.split(")").length - 1;
					} else if (opt.charAt(0) == "t" && opt.charAt(1) == "(") {
						++transition;
						transitionString = opt.slice(2,-1);
						transline = "";
					} else {
						let i = compiled_trie(opt);
						if (i) {
							let override = map[opt.slice(0,i)];
							let val = (opt.charAt(i) === "(" && opt.charAt(opt.length-1) === ")") ? opt.slice(i+1,-1) : opt.slice(i);
							override.call(this,val,ret);
						}
						// if i == 0: ¯\_(ツ)_/¯
					}

					if (transline && !transition) {
						this.addTransition(ret,transitionString,transline.slice(0,-1),counter);
						++counter;
					}
				}

				// update colors
				if (!ret.style.fill || (ret.style.fill && !ret.style.fill.startsWith("url("))) {
					if (this.karaokeColors && !this.karaokeColors.ko)
						ret.style.fill = "rgba(" + this.karaokeColors.r + "," + this.karaokeColors.g + "," + this.karaokeColors.b + "," + this.karaokeColors.a + ")";
					else
						ret.style.fill = "rgba(" + this.style.c1r + "," + this.style.c1g + "," + this.style.c1b + "," + this.style.c1a + ")";
				}
				ret.style.stroke = "rgba(" + this.style.c3r + "," + this.style.c3g + "," + this.style.c3b + "," + (this.karaokeColors && this.karaokeColors.ko ? 0 : this.style.c3a) + ")";
				ret.style["stroke-width"] = this.style.Outline + "px";
				this.karaokeColors = null;
			}

			function updateShadows(ret) {
				let RS = ret.style;
				let TS = this.style;

				let fillColor = RS.fill;
				let borderColor = RS.stroke;
				let shadowColor = "rgba(" + TS.c4r + "," + TS.c4g + "," + TS.c4b + "," + TS.c4a + ")";

				let noBorderBox = ((rendererBorderStyle || TS.BorderStyle) != 3);
				if (noBorderBox) { // Outline and Shadow
					this.box = null;
					this.updates.boxfade = null;
					this.div.style.filter = "";
					if (TS.Blur) // \be, \blur
						this.div.style.filter += "drop-shadow(0 0 " + TS.Blur + "px " + (TS.Outline ? borderColor : fillColor) + ") ";
					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						this.div.style.filter += "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
				} else { // Border Box
					let TBS = this.box.style;

					TBS.fill = borderColor;
					TBS.stroke = (TS.Outline ? borderColor : fillColor);
					TBS.strokeWidth = RS["stroke-width"];

					// Remove text border from lines that have a border box.
					RS["stroke-width"] = "0px";

					if (TS.Blur) // \be, \blur
						this.div.style.filter = "drop-shadow(0 0 " + TS.Blur + "px " + fillColor + ")";

					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						TBS.filter = "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
					else TBS.filter = "";
				}

				if (this.path) {
					this.path.style.filter = "";
					if (TS.Blur) // \be, \blur
						this.path.style.filter += "drop-shadow(0 0 " + TS.Blur + "px " + shadowColor + ") ";
					if (TS.ShOffX != 0 || TS.ShOffY != 0) // \shad, \xshad, \yshad
						this.path.style.filter += "drop-shadow(" + TS.ShOffX + "px " + TS.ShOffY + "px 0 " + shadowColor + ")";
				}
			}
			function updateDivPosition(TS,TD,A,Margin) {
				// This is called if alignment, position, font name, or font size change.

				// Get the (theoretical) pixel height of the current text.
				// The size used here is not affected by \fs overrides.
				let H = parseFloat(renderer.styles[TS.Name].Fontsize);

				// Alias this function because it's used a lot.
				let SA = TD.setAttribute.bind(TD);

				// The 'y' value is for the bottom of the div, not the top,
				// so we have to offset it by the height of the text.

				if (TS.position.x) {
					SA("x",TS.position.x);
					SA("y",TS.position.y);

					if (A > 6) SA("dy",H); // 7, 8, 9
					else if (A < 4) SA("dy",0); // 1, 2, 3
					else SA("dy",H/2); // 4, 5, 6

					if (A%3 == 0) SA("text-anchor","end"); // 3, 6, 9
					else if ((A+1)%3 == 0) SA("text-anchor","middle"); // 2, 5, 8
					else SA("text-anchor","start"); // 1, 4, 7
				} else {
					if (A > 6) { // 7, 8, 9
						SA("dy",H);
						SA("y",Margin.V);
					} else if (A < 4) { // 1, 2, 3
						SA("dy",0);
						SA("y",SC.getAttribute("height")-Margin.V);
					} else { // 4, 5, 6
						SA("dy",H/2);
						SA("y",SC.getAttribute("height")/2);
					}

					if (A%3 == 0) { // 3, 6, 9
						SA("text-anchor","end");
						SA("x",SC.getAttribute("width")-Margin.R);
					} else if ((A+1)%3 == 0) { // 2, 5, 8
						SA("text-anchor","middle");
						SA("x",((Margin.L-Margin.R)/2)+(SC.getAttribute("width")/2));
					} else { // 1, 4, 7
						SA("text-anchor","start");
						SA("x",Margin.L);
					}
				}
			}
			function updatePosition() {
				// Everything is positioned from its top-left corner. This location
				// is also used as the transform origin (if one isn't set). The text is
				// aligned by changing its apparent location, not it's x and y values.

				this.moved = true;

				let TS = this.style;
				let TSSX = TS.ScaleX / 100;
				let TSSY = TS.ScaleY / 100;
				let A = parseInt(TS.Alignment,10);
				let TD = this.div;

				if (TS.Angle && !this.transforms["frz"]) this.transforms["frz"] = "rotateZ(" + (-TS.Angle) + "deg)";
				if (TSSX != 1 && !this.transforms["fscx"])
					this.transforms["fscx"] = "scaleX(" + TSSX + ")";
				if (TSSY != 1 && !this.transforms["fscy"])
					this.transforms["fscy"] = "scaleY(" + TSSY + ")";

				let transforms = "";
				for (let key in this.transforms) transforms += " " + this.transforms[key];

				// Set div anchor and offset.
				if (this.repositioned) {
					updateDivPosition(TS,TD,A,this.Margin);
					this.repositioned = false;
					this.cachedBBox = null;
				}

				// This is the position of the div's anchor point.
				let divX = TD.getAttribute("x");
				let divY = TD.getAttribute("y");

				// This is the actual div position.
				let bbox = this.cachedBBox || (this.cachedBBox = TD.getBBox());
				if (bbox.width == 0) bbox.height = 0; // zero-width spaces still have a height
				let X = bbox.x;
				let Y = bbox.y;
				let W = bbox.width;
				let H = bbox.height;

				// Paths do not affect the origin location.
				let origin = this.tOrg;
				if (!origin) {
					let ox = X, oy = Y;

					if (A%3 == 0) ox += W; // 3, 6, 9
					else if ((A+1)%3 == 0) ox += W / 2; // 2, 5, 8

					if (A < 7) {
						if (A < 4) oy += H;
						else oy += H / 2;
					}

					origin = ox + "px " + oy + "px";
				}

				TD.style.transform = transforms;
				TD.style.transformOrigin = origin;
				if (this.box) {
					let TB = this.box;
					TB.style.transform = transforms;
					TB.style.transformOrigin = origin;

					let B = parseFloat(TB.style.strokeWidth);
					TB.setAttribute("x", X - B);
					TB.setAttribute("y", Y - B);
					TB.setAttribute("width", W + 2*B);
					TB.setAttribute("height", H + 2*B);
				}
				if (this.path) {
					// Paths should probably have their transformOrigin set, right?
					// let [tOrgX,tOrgY] = origin.split(" ").map(n => parseFloat(n));
					let px = parseFloat(divX), py = parseFloat(divY);

					if (A != 7) {
						let pBounds = this.path.bbox;

						if (A%3 == 0) px -= TSSX * (W + pBounds.width); // 3, 6, 9
						else if ((A+1)%3 == 0) px -= TSSX * (W + pBounds.width) / 2; // 2, 5, 8

						if (A < 7) py -= (TSSY * pBounds.height + this.pathOffset.y) / (A < 4 ? 1 : 2);
					}

					this.path.style.transform = "translate(" + px + "px," + py + "px)" + transforms;
				}
				if (this.kf.length) {
					let tt = "translate(" + divX + "px," + divY + "px)" + transforms + " translate(" + (-divX) + "px," + (-divY) + "px)";
					for (let vars of this.kf) SC.getElementById("gradient" + vars.num).setAttribute("gradient-transform", tt);
				}

				this.cachedBounds = null;
			};

			function transition(t,time) {
				// If the line has stopped displaying before the transition starts.
				if (!this.div) return;

				let ret = t.ret;
				let duration = t.duration;
				let options = t.options;
				let accel = t.accel;
				let id = t.id;

				// copy some starting ret style values
				let SRS = {
					"fill": ret.style.fill,
					"stroke": ret.style.stroke,
					"stroke-width": ret.style["stroke-width"]
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

				override_to_css.call(this,options+"}",ret);

				// check if the copied ret style values have changed
				let RSChanged = SRS.fill != ret.style.fill || SRS.stroke != ret.style.stroke || SRS["stroke-width"] != ret.style["stroke-width"];

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
				let divs = SC.getElementsByClassName("transition"+id);
				for (let div of divs) {
					div.style.transition = trans;
					for (let x in ret.style)
						div.style[x] = ret.style[x];
					div.classList.add(...ret.classes);
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

				if (RSChanged) updateShadows.call(this,ret);
				updatePosition.call(this);
			}
			function clearTransitions(id) {
				let divs = SC.getElementsByClassName("transition"+id);
				if (this.div) this.div.style.transition = "";
				for (let div of divs) div.style.transition = "";
				if (this.box) this.box.style.transition = "";
			}


			// The Subtitle 'Class'.
			function Subtitle(data,lineNum) {
				this.state = STATES.UNINITIALIZED;
				this.data = data;
				this.lineNum = lineNum;
				this.style = null;

				this.Margin = {"L" : (data.MarginL && parseInt(data.MarginL)) || renderer.styles[data.Style].MarginL,
							   "R" : (data.MarginR && parseInt(data.MarginR)) || renderer.styles[data.Style].MarginR,
							   "V" : (data.MarginV && parseInt(data.MarginV)) || renderer.styles[data.Style].MarginV};

				this.time = {"start" : timeConvert(data.Start), "end" : timeConvert(data.End)};
				this.time.milliseconds = (this.time.end - this.time.start) * 1000;

				// x is used to adjust the text position horizontally,
				// y is used to adjust the path position vertically
				this.pathOffset = {x:0,y:0};

				this.tOrg = "";
				this.cachedBBox = null; // also reset when `repositioned` is true
				this.cachedBounds = null;

				this.group = null;
				this.box = null;
				this.div = null;
				this.path = null;

				this.transitions = null;
				this.transforms = null;
				this.updates = null;

				// used by setKaraokeColors()
				this.kf = [];
				this.karaokeColors = null;
				this.karaokeTransitions = null;
				this.karaokeTimer = 0;

				this.clip = null; // used by \clip() and \iclip()

				this.visible = false;
				this.repositioned = true; // used for updateDivPosition()
				this.collisionsChecked = false; // used by checkCollisions()
				this.moved = false; // used in the main loop for handling splitLines
			}


			// These functions get the dimensions of the text relative to the window,
			// so make sure to remove the scaling on the SC before using them (and put it back after).
			Subtitle.prototype.width = function() { return this.getBounds().width; };
			Subtitle.prototype.height = function() { return this.getBounds().height; };
			Subtitle.prototype.getBounds = function() {
				if (!this.cachedBounds) {
					let range = new Range();
					range.selectNodeContents(this.div);
					let bounds = range.getBoundingClientRect();
						bounds.width += this.pathOffset.x;
					this.cachedBounds = bounds;
				}
				return this.cachedBounds;
			};
			Subtitle.prototype.getSplitLineBounds = function(lines) {
				if (!lines) lines = SC.querySelectorAll("g[id^=line" + this.lineNum + "]");

				let bounds = lines[0].line.getBounds();
				let extents = new DOMRect(bounds.x, bounds.y, bounds.width, bounds.height);

				for (let i = 1; i < lines.length; ++i) {
					bounds = lines[i].line.getBounds();
					extents.x = Math.min(extents.x, bounds.left);
					extents.y = Math.min(extents.y, bounds.top);
					extents.width = Math.max(extents.width, bounds.width);
					extents.height = Math.max(extents.height, bounds.height);
				}

				return extents;
			};

			Subtitle.prototype.init = function() {
				if (this.state == STATES.INITIALIZED) return;
				if (this.state == STATES.USED) this.clean();

				this.style = JSON.parse(JSON.stringify(renderer.styles[this.data.Style])); // deep clone

				this.div = createSVGElement("text");
				let TD = this.div;
					TD.classList.add("subtitle_" + this.data.Style);

				this.box = createSVGElement("rect");

				this.transitions = [];
				this.transforms = {};
				this.updates = {"fade":null,"boxfade":null,"move":null};
				this.style.position = {};

				if (this.Margin.L) TD.style["margin-left"] = this.Margin.L + "px";
				if (this.Margin.R) TD.style["margin-right"] = this.Margin.R + "px";
				if (this.Margin.V) {
					TD.style["margin-top"] = this.Margin.V + "px";
					TD.style["margin-bottom"] = this.Margin.V + "px";
				}

				TD.appendChild(parse_text_line.call(this,this.data.Text));

				this.group = createSVGElement("g");
				this.group.id = "line" + this.lineNum;
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

				this.repositioned = true;
				updatePosition.call(this);

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
				if (this.group) this.group.remove();
				for (let vars of this.kf) SC.getElementById("gradient" + vars.num).remove();
				if (this.clip) SC.getElementById("clip" + this.clip.num).remove();

				this.group = null;
				this.box = null;
				this.div = null;
				this.path = null;

				this.transitions = null;
				this.transforms = null;
				this.updates = null;

				this.kf = [];
				this.clip = null;
				this.cachedBounds = null;

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
				this.style.position = {"x" : parseFloat(x1), "y" : parseFloat(y1)};
				this.repositioned = true;
				this.updates.move = function(t) {
					if (t < t1) t = t1;
					if (t > t2) t = t2;
					let calc = Math.pow((t-t1)/(t2-t1),accel);
					let newPos = {"x" : parseFloat(x1) + (x2 - x1) * calc, "y" : parseFloat(y1) + (y2 - y1) * calc};
					if (this.style.position.x != newPos.x || this.style.position.y != newPos.y) {
						this.style.position = newPos;
						this.repositioned = true;
						updatePosition.call(this);
					}
				}.bind(this);
			};
			Subtitle.prototype.addTransition = function(ret,times,options,trans_n) {
				ret.classes.push("transition" + trans_n);
				times = times.split(",").map(parseFloat);
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

				while (options.includes("pos(")) {
					let pos = options.slice(options.indexOf("pos(")+4,options.indexOf(")")).split(",");
					options = options.replace(/\\pos\((\d|,)*\)/,"");
					this.addMove(this.style.position.x,this.style.position.y,pos[0],pos[1],intime,outtime,accel);
				}

				if (options) {
					let newTransition = {
						"time" : intime,
						"ret" : JSON.parse(JSON.stringify(ret)), // make a copy of the current values
						"duration" : outtime - intime,
						"options" : options,
						"accel" : accel,
						"id" : trans_n
					};

					// insert transitions sorted by start time
					let index = this.transitions.findIndex(t => t.time > intime);
					if (index == -1)
						this.transitions.push(newTransition);
					else
						this.transitions.splice(index,0,newTransition);
				}
			};


			return (data,lineNum) => new Subtitle(data,lineNum);
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
			var styles = {};
			var map = assfile[i].replace("Format:","").split(",").map(x => x.trim());
			for (++i; i < assfile.length; ++i) {
				var line = assfile[i] = assfile[i].trim();
				if (line.charAt(0) == "[") break;
				if (line.search("Style:") != 0) continue;
				var elems = line.replace("Style:","").split(",").map(x => x.trim());
				var new_style = {isV4Plus:isV4Plus};
				for (var j = 0; j < elems.length; ++j)
					new_style[map[j]] = elems[j];
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
				if (line.search("Dialogue:") != 0) continue;
				var elems = line.replace("Dialogue:","").trim().split(",");
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
		function ass2js(asstext) {
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
		function style_to_css(style) {
			let ret = "";
			if (style.Fontname) {
				if (style.Fontname.charAt(0) == "@") {
					style.Fontname = style.Fontname.slice(1);
					style.Vertical = true;
				}
			} else style.Fontname = "Arial";
			ret += "font-family: " + style.Fontname + ";\n";

			if (!style.Fontsize) style.Fontsize = 40;
			ret += "font-size: " + getFontSize(style.Fontname,style.Fontsize).size + "px;\n";

			if (+style.Bold) ret += "font-weight: bold;\n";
			if (+style.Italic) ret += "font-style: italic;\n";
			if (+style.Underline || +style.StrikeOut) {
				ret += "text-decoration:";
				if (+style.Underline) ret += " underline";
				if (+style.StrikeOut) ret += " line-through";
				ret += ";\n";
			}

			if (!style.ScaleX) style.ScaleX = 100;
			if (!style.ScaleY) style.ScaleY = 100;

			if (style.Spacing) ret += "letter-spacing: " + style.Spacing + "px;\n";
			else style.Spacing = "0";


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


			if (!style.Angle) style.Angle = 0;
			else style.Angle = parseFloat(style.Angle);
			if (style.Vertical) {
				style.Angle -= 270; // Why 270?
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

			ret += "fill: rgba(" + style.c1r + "," + style.c1g + "," + style.c1b + "," + style.c1a + ");\n";
			ret += "stroke: rgba(" + style.c3r + "," + style.c3g + "," + style.c3b + "," + style.c3a + ");\n";
			ret += "stroke-width: " + style.Outline + "px;\n";


			if (!style.Alignment) style.Alignment = "2";
			var N = parseInt(style.Alignment,10);
			if (!style.isV4Plus) N = SSA_ALIGNMENT_MAP[N];

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

			style.Justify = parseInt(style.Justify,10) || 0;


			style.MarginL = parseInt(style.MarginL,10) || 0;
			style.MarginR = parseInt(style.MarginR,10) || 0;
			style.MarginV = parseInt(style.MarginV,10) || 0;

			ret += "margin-top: " + style.MarginV + "px;\n";
			ret += "margin-bottom: " + style.MarginV + "px;\n";


			return ret;
		}
		function parse_head() {
			if (state != STATES.INITIALIZING) return;

			var info = JSON.parse(JSON.stringify(assdata.info));

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
		function write_fonts() {
			if (state != STATES.INITIALIZING || assdata.fonts == null) return;

			// Add the style HTML element.
			if (!fontCSS) {
				fontCSS = document.createElement("style");
				SC.insertBefore(fontCSS, SC.firstChild);
			}

			// Get a set of the names of all the fonts used by the styles.
			let styleFonts = new Set();
			for (let key in assdata.styles) {
				let style = assdata.styles[key];
				if (style.Fontname) {
					if (style.Fontname.charAt(0) == "@") {
						styleFonts.add(style.Fontname.slice(1));
					} else styleFonts.add(style.Fontname);
				}
			}
			styleFonts.delete("Arial");
			styleFonts.delete("ArialMT");

			let css = "";
			for (let font in assdata.fonts) {
				let fontdata = assdata.fonts[font];

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
		function write_styles() {
			if (state == STATES.UNINITIALIZED || state == STATES.RESTARTING_INIT) return;

			// Add the style HTML element.
			if (!styleCSS) {
				styleCSS = document.createElement("style");
				if (fontCSS) SC.insertBefore(styleCSS, fontCSS.nextElementSibling);
				else SC.insertBefore(styleCSS, SC.firstChild);
			}

			// Get the defined styles and create a default style.
			var styles = JSON.parse(JSON.stringify(assdata.styles));
			var Default = {
				Name: "Default",
				Outline: 2,
				MarginL: 10,
				MarginR: 10,
				MarginV: 20,
				Blur: 2
			};

			// Convert the style objects to CSS.
			var css = ".subtitle_Default {\n" + style_to_css(Default) + "}\n";
			for (var key in styles) css += "\n.subtitle_" + key + " {\n" + style_to_css(styles[key]) + "}\n";
			styleCSS.innerHTML = css;
			if (!styles.Default) styles.Default = Default;
			renderer.styles = styles;
		}
		function init_subs() {
			if (state != STATES.INITIALIZING) return;

			var subtitle_lines = JSON.parse(JSON.stringify(assdata.events));
			var line_num = assdata.events.line;
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

				// Check if there are line breaks, and remove soft breaks if they don't apply.
				// Yes, the ".*" in the second RegEx is deliberate.
				let hasLineBreaks = text.includes("\\N");
				let qWrap = text.match(/{[^}]*\\q[0-9][^}]*}/g), qWrapVal = renderer.WrapStyle;
				if (qWrap) qWrapVal = parseInt(/.*\\q([0-9])/.exec(qWrap[qWrap.length-1])[1],10);
				if (qWrapVal == 2) hasLineBreaks = hasLineBreaks || text.includes("\\n");
				else text = text.replace(/\\n/g,"");

				// Fix things that would be displayed incorrectly in HTML.
				text = text.replace(/</g,"&lt;");
				text = text.replace(/>/g,"&gt;");

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
				if (!line.Text.replace(/{[^}]*}/g,'')) return;


				// Things that can change within a line, but isn't allowed to be changed within a line in HTML/CSS/SVG.
				// \be, \blur, \bord, \fax, \fay, \fr, \frx, \fry, \frz, \fscx, \fscy, \shad, \xshad, and \yshad
				// Also check for paths because they're always problematic.
				var reProblemBlock = /{[^\\]*\\(?:(?:b(?:e|lur|ord))|(?:f(?:(?:(?:a|sc)[xy])|(?:r[xyz]?)))|(?:[xy]?shad)|(?:p(?:[1-9]|0\.[0-9]*[1-9])))[^}]*}/;
				var reProblem = /\\(?:(?:b(?:e|lur|ord))|(?:f(?:(?:(?:a|sc)[xy])|(?:r[xyz]?)))|(?:[xy]?shad)|(?:p(?:[1-9]|0\.[0-9]*[1-9])))/;

				// These lines kept in case I need them again.
				// \fax, \fr, \fry, \frz, and \fscx change the line width.
				// var reWidth = /\\f(?:(?:(?:a|sc)x)|(?:r[yz]?))[.\\\d}]/;
				// \be, \blur, \bord, \fay, \frx, \fscy, \shad, \xshad, and \yshad don't change the line width.
				// var reNoWidth = /\\(?:(?:b(?:e|lur|ord))|(?:f(?:ay|rx|scy))|(?:[xy]?shad))/;


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
						subtitles.push(NewSubtitle(newLine,num+"-"+(i+1)));
					}
				} else subtitles.push(NewSubtitle(line,num));
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
				assdata = ass2js(this.responseText);

				function templocal() {
					video.removeEventListener("loadedmetadata",templocal);

					if (state != STATES.INITIALIZING) {
						if (state == STATES.RESTARTING_INIT)
							addTask(renderer.init);
						return;
					}

					parse_head();
					write_fonts();
					write_styles();
					init_subs();
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
						if (!S.visible) S.start()
						S.update(time - S.time.start);
					} else if (S.visible) S.clean();
				}

				// Remove Container Scaling
				let scaling = removeContainerScaling();

				// Fix position of subtitle lines that had to be split,
				// and border boxes that no longer border their text.
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
							let totalWidth = spans.reduce((sum,span) => sum + span.width(), 0);
							let maxHeight;

							// Align the pieces relative to the previous piece.
							if (A%3 == 0) { // Right Alignment
								let prevAttr = spans[0].div.getAttribute("x") - totalWidth;
								let prevProp = spans[0].cachedBounds.x - totalWidth;
								maxHeight = 0;
								for (let span of spans) {
									span.div.setAttribute("x", prevAttr += span.width());
									span.cachedBounds.x = prevProp += span.width();
									maxHeight = Math.max(maxHeight,span.height());
								}
							} else if ((A+1)%3 == 0) { // Middle Alignment
								let pWidth = spans[0].width();
								maxHeight = spans[0].height();
								spans[0].div.setAttribute("x", spans[0].div.getAttribute("x") - (totalWidth - pWidth) / 2);
								spans[0].cachedBounds.x = spans[0].cachedBounds.x - (totalWidth - pWidth) / 2;
								for (let i = 1; i < spans.length; ++i) {
									let cWidth = spans[i].width();
									spans[i].div.setAttribute("x", parseFloat(spans[i-1].div.getAttribute("x")) + (pWidth + cWidth) / 2);
									spans[i].cachedBounds.x = spans[i-1].cachedBounds.x + (pWidth + cWidth) / 2;
									pWidth = cWidth;
									maxHeight = Math.max(maxHeight,spans[i].height());
								}
							} else { // Left Alignment
								let prevAttr = spans[0].div.getAttribute("x") - spans[0].width();
								let prevProp = spans[0].cachedBounds.x - spans[0].width();
								maxHeight = 0;
								for (let span of spans) {
									span.div.setAttribute("x", prevAttr += span.width());
									span.cachedBounds.x = prevProp += span.width();
									maxHeight = Math.max(maxHeight,span.height());
								}
							}

							widths.push(totalWidth);
							heights.push(maxHeight);
						}


						// Justify
						if (J && (A-J)%3 != 0) {
							let maxWidth = Math.max(...widths);

							lines = subtitles.slice(L.line,L.line+L.pieces);
							for (let i = 0; i < L.breaks.length; ++i) {
								let amount = L.breaks[i];
								let spans = lines.splice(0,amount);
								let widthDifference = maxWidth - widths[i];

								if (widthDifference) {
									if ((J == 1 && A%3 == 2) || (J == 2 && A%3 == 0)) { // To Left From Center or To Center From Right
										for (let span of spans) {
											span.div.setAttribute("x", parseFloat(span.div.getAttribute("x")) - (widthDifference / 2));
											span.cachedBounds.x -= (widthDifference / 2);
										}
									} else if (J == 1 && A%3 == 0) { // To Left From Right
										for (let span of spans) {
											span.div.setAttribute("x", parseFloat(span.div.getAttribute("x")) - widthDifference);
											span.cachedBounds.x -= widthDifference;
										}
									} else if ((J == 3 && A%3 == 2) || (J == 2 && A%3 == 1)) { // To Right From Center or To Center From Left
										for (let span of spans) {
											span.div.setAttribute("x", parseFloat(span.div.getAttribute("x")) + (widthDifference / 2));
											span.cachedBounds.x += (widthDifference / 2);
										}
									} else /*if (J == 3 && A%3 == 1)*/ { // To Right From Left
										for (let span of spans) {
											span.div.setAttribute("x", parseFloat(span.div.getAttribute("x")) + widthDifference);
											span.cachedBounds.x += widthDifference;
										}
									}
								}
							}
						}


						// Align Vertically
						lines = subtitles.slice(L.line,L.line+L.pieces);
						if (true) { // So that this block can be collapsed.
							let spans = lines.splice(0,L.breaks[0]);

							// Calculate the first span's alignment.
							let yPos = 0;
							// Nothing to do for top alignment.
							if (A<7) { // Middle and Bottom Alignment
								if (A>3) yPos += heights[0] - heights.reduce((sum,height) => sum + height, 0) / 2;
								else yPos -= heights.reduce((sum,height) => sum + height, -heights[0]);
							}

							let yPosAttr = yPos + parseFloat(spans[0].div.getAttribute("y"));
							let yPosProp = yPos + spans[0].cachedBounds.y;

							// Align the first span.
							if (A<7) {
								for (let span of spans) {
									span.div.setAttribute("y", yPosAttr);
									span.cachedBounds.y = yPosProp;
								}
							}

							// Align the pieces relative to the previous span.
							for (let j = 1; j < L.breaks.length; ++j) {
								yPosAttr += heights[j-1];
								yPosProp += heights[j-1];
								spans = lines.splice(0,L.breaks[j]);
								for (let span of spans) {
									span.div.setAttribute("y", yPosAttr);
									span.cachedBounds.y = yPosProp;
								}
							}
						}


						// Fix Border Boxes (if they exist)
						lines = subtitles.slice(L.line,L.line+L.pieces);
						if (lines[0].box) {
							let extents = {
								left: parseFloat(SC.getAttribute("width")),
								right: 0,
								top: parseFloat(SC.getAttribute("height")),
								bottom: 0
							};

							// find extents of the entire line
							for (let line of lines) {
								let bbox = line.div.getBBox();
								extents.left = Math.min(extents.left, bbox.x);
								extents.right = Math.max(extents.right, bbox.x + bbox.width);
								extents.top = Math.min(extents.top, bbox.y);
								extents.bottom = Math.max(extents.bottom, bbox.y + bbox.height);

								// hide all boxes
								line.box.style.display = "none";
							}

							// use the first box for all of the pieces
							let firstBox = lines[0].box;
							firstBox.style.display = "";
							firstBox.style.transform = "";
							firstBox.style.transformOrigin = "";
							let B = parseFloat(firstBox.style.strokeWidth);
							firstBox.setAttribute("x", extents.left - B);
							firstBox.setAttribute("y", extents.top - B);
							firstBox.setAttribute("width", (extents.right - extents.left) + 2*B);
							firstBox.setAttribute("height", (extents.bottom - extents.top) + 2*B);
						}
					}
				}

				// Check for collisions and reposition lines if necessary.
				for (let layer in collisions.upper) {
					for (let collision of collisions.upper[layer]) {
						if (collision[0] && collision[1] && collision[0].visible && collision[1].visible) {
							let splitLines1 = SC.querySelectorAll("g[id^=line" + collision[1].lineNum + "]");
							let B0 = collision[0].getSplitLineBounds(), B1 = collision[1].getSplitLineBounds(splitLines1);
							if (boundsOverlap(B0,B1)) {
								let overlap = B0.bottom - B1.top;
								for (let group of splitLines1) {
									let line = group.line;
									line.div.setAttribute("y", parseFloat(line.div.getAttribute("y")) + overlap);
									line.cachedBounds.y += overlap;
									if (line.box) line.box.setAttribute("y", parseFloat(line.box.getAttribute("y")) + overlap);
									if (line.path) {
										// update transform
										// update transform-origin
									}
								}
							}
						}
					}
				}
				for (let layer in collisions.lower) {
					for (let collision of collisions.lower[layer]) {
						if (collision[0] && collision[1] && collision[0].visible && collision[1].visible) {
							let splitLines1 = SC.querySelectorAll("g[id^=line" + collision[1].lineNum + "]");
							let B0 = collision[0].getSplitLineBounds(), B1 = collision[1].getSplitLineBounds(splitLines1);
							if (boundsOverlap(B0,B1)) {
								let overlap = B0.bottom - B1.top;
								for (let group of splitLines1) {
									let line = group.line;
									line.div.setAttribute("y", parseFloat(line.div.getAttribute("y")) - overlap);
									line.cachedBounds.y -= overlap;
									if (line.box) line.box.setAttribute("y", parseFloat(line.box.getAttribute("y")) - overlap);
									if (line.path) {
										// update transform
										// update transform-origin
									}
								}
							}
						}
					}
				}

				// Re-apply Container Scaling
				reApplyContainerScaling(scaling);
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
