/*
	JavaScript implementation of
	CoffeeScript implementation of
	Algorithm for Automatically Fitting Digitized Curves
	by Philip J. Schneider
	"Graphics Gems", Academic Press, 1990

	CoffeeScript Source: https://github.com/soswow/fit-curves/blob/master/src/fitCurves.coffee
	JavaScript Implementation by Yay295
	Changes:
	- The lodash library is no longer required.
	- The math.js library is still required.
	- Much better scoping.
	- It's not CoffeeScript.
*/

/*
	points - An array of points (ex. [[0,0],[1,5],[3,7]]) that reside on the
	curve to fit.
	
	maxError - How closely the returned Cubic Bezier Curve should fit to the
	given points. This should be a number greater than 0, with a lesser number
	giving a closer fit
	
	return - An array of the four points required for a Cubic Bezier Curve.
*/
function fitCurve(points,maxError) {
	// math.js functions used in this file
	var add = math.add;
	var chain = math.chain;
	var divide = math.divide;
	var dot = math.dot;
	var dotPow = math.dotPow;
	var multiply = math.multiply;
	var norm = math.norm;
	var subtract = math.subtract;
	var sum = math.sum;
	var zeros = math.zeros;

	// native js implementations of 'lodash' functions
	function last(array) {
		return array[array.length-1];
	}
	function zip(a1,a2) {
		var ret = [];
		for (var i = 0, len = a1.length; i < len; ++i)
			ret.push([a1[i],a2[i]]);
		return ret;
	}


	var bezier = {
		q: function(ctrlPoly,t) {
			return chain(multiply(Math.pow(1-t,3), ctrlPoly[0])).add(multiply(3 * Math.pow(1 - t, 2) * t, ctrlPoly[1])).add(multiply(3 * (1 - t) * Math.pow(t, 2), ctrlPoly[2])).add(multiply(Math.pow(t, 3), ctrlPoly[3])).done();
		},
		qprime: function(ctrlPoly,t) {
			return chain(multiply(3 * Math.pow(1-t,2), subtract(ctrlPoly[1], ctrlPoly[0]))).add(multiply(6 * (1 - t) * t, subtract(ctrlPoly[2], ctrlPoly[1]))).add(multiply(3 * Math.pow(t, 2), subtract(ctrlPoly[3], ctrlPoly[2]))).done();
		},
		qprimeprime: function(ctrlPoly,t) {
			return add(multiply(6 * (1-t), add(subtract(ctrlPoly[2], multiply(2, ctrlPoly[1])), ctrlPoly[0])), multiply(6 * t, add(subtract(ctrlPoly[3], multiply(2, ctrlPoly[2])), ctrlPoly[1])));
		}
	};

	function fitCubic(points, leftTangent, rightTangent, error) {
		if (points.length == 2) {
			var dist = norm(subtract(points[0], points[1])) / 3;
			return [[points[0], add(points[0], multiply(leftTangent, dist)), add(points[1], multiply(rightTangent, dist)), points[1]]];
		}


		function generateBezier(points, parameters, leftTangent, rightTangent) {
			var bezCurve = [points[0], null, null, last(points)];
			var A = zeros(parameters.length, 2, 2).valueOf();

			for (var i = 0, len = parameters.length; i < len; ++i) {
				var u = parameters[i];
				A[i][0] = multiply(leftTangent, 3 * (1 - u) * (1 - u) * u);
				A[i][1] = multiply(rightTangent, 3 * (1 - u) * u * u);
			}

			var C = [[0,0],[0,0]];
			var X = [0,0];
			var ref = zip(points, parameters);

			for (var i = 0, len = ref.length; i < len; ++i) {
				C[0][0] += dot(A[i][0],A[i][0]);
				C[0][1] += dot(A[i][0],A[i][1]);
				C[1][0] += dot(A[i][0],A[i][1]);
				C[1][1] += dot(A[i][1],A[i][1]);

				var tmp = subtract(ref[i][0], bezier.q([points[0], points[0], last(points), last(points)], ref[i][1]));

				X[0] += dot(A[i][0],tmp);
				X[1] += dot(A[i][1],tmp);
			}

			var det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
			var det_C0_X = C[0][0] * X[1] - C[1][0] * X[0];
			var det_X_C1 = X[0] * C[1][1] - X[1] * C[0][1];
			var alpha_l = det_C0_C1 === 0 ? 0 : det_X_C1 / det_C0_C1;
			var alpha_r = det_C0_C1 === 0 ? 0 : det_C0_X / det_C0_C1;
			var segLength = norm(subtract(points[0], last(points)));
			var epsilon = 1.0e-6 * segLength;

			if (alpha_l < epsilon || alpha_r < epsilon) {
				bezCurve[1] = add(bezCurve[0], multiply(leftTangent, segLength / 3));
				bezCurve[2] = add(bezCurve[3], multiply(rightTangent, segLength / 3));
			} else {
				bezCurve[1] = add(bezCurve[0], multiply(leftTangent, alpha_l));
				bezCurve[2] = add(bezCurve[3], multiply(rightTangent, alpha_r));
			}

			return bezCurve;
		}

		var u = [0];
		for (var i = 1, len = points.length; i < len; ++i)
			u.push(u[i-1] + norm(subtract(points[i],points[i-1])));
		for (var i = 0, len = u.length; i < len; ++i)
			u[i] /= last(u);


		function computeMaxError(points, bez, parameters) {
			var maxDist = 0;
			var splitPoint = points.length / 2;
			var ref = zip(points,parameters);

			for (var i = 0, len = ref.length; i < len; ++i) {
				var dist = Math.pow(norm(subtract(bezier.q(bez,ref[i][1]),ref[i][0])),2);
				if (dist > maxDist) {
					maxDist = dist;
					splitPoint = i;
				}
			}

			return [maxDist, splitPoint];
		}

		var bezCurve = generateBezier(points, u, leftTangent, rightTangent);
		var ref = computeMaxError(points, bezCurve, u);
		var maxError = ref[0];
		var splitPoint = ref[1];

		if (maxError < error) return [bezCurve];


		function reparameterize(bezier, points, parameters) {
			var ref = zip(points, parameters);
			var results = [];

			function newtonRaphsonRootFind(bez, point, u) {
				// Newton's root finding algorithm calculates f(x)=0 by reiterating x_n+1 = x_n - f(x_n)/f'(x_n)
				// We are trying to find curve parameter u for some point p that minimizes
				// the distance from that point to the curve. Distance point to curve is d=q(u)-p.
				// At minimum distance the point is perpendicular to the curve.
				// We are solving f = q(u)-p * q'(u) = 0 with f' = q'(u) * q'(u) + q(u)-p * q''(u)
				// gives u_n+1 = u_n - |q(u_n)-p * q'(u_n)| / |q'(u_n)**2 + q(u_n)-p * q''(u_n)|

				var qprime = bezier.qprime(bez,u);
				var numerator = sum(multiply(subtract(bezier.q(bez,u),point),qprime));
				var denominator = sum(add(dotPow(qprime,2),multiply(d,bezier.qprimeprime(bez,u))));

				return (!denominatior ? 0 : (u - numerator / denominator));
			}

			for (var i = 0, len = ref.length; i < len; ++i)
				results.push(newtonRaphsonRootFind(bezier, ref[i][0], ref[i][1]));

			return results;
		}

		if (maxError < error*error) {
			for (var i = 0; i < 20; ++i) {
				var uPrime = reparameterize(bezCurve, points, u);
				bezCurve = generateBezier(points, uPrime, leftTangent, rightTangent);
				var temp = computeMaxError(points, bezCurve, uPrime);
				maxError = temp[0], splitPoint = temp[1];

				if (maxError < error) return [bezCurve];

				u = uPrime;
			}
		}

		var centerTangent = normalize(subtract(points[splitPoint-1], points[splitPoint+1]));

		var beziers = beziers.concat(fitCubic(points.slice(0,splitPoint+1), leftTangent, centerTangent, error));
		beziers = beziers.concat(fitCubic(points.slice(splitPoint), multiply(centerTangent,-1), rightTangent, error));
		return beziers;
	}

	function normalize(v) {return divide(v,norm(v));}


	var leftTangent = normalize(subtract(points[1],points[0]));
	var rightTangent = normalize(subtract(points[points.length-2],last(points)));
	return fitCubic(points,leftTangent,rightTangent,maxError);
}
