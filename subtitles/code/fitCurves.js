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
	V2 Changes:
	- `points.length == 5`, `points[0] == [0,0]`, and `points[4] == [1,1]` because that's all I need.
	- All lodash functions have been removed.
	- The math.js library is no longer required.
	- `maxError` was removed becuase my testing gave the same result for any
		value, until it got too small and the function just failed.
*/

/*
	points - An array of points (ex. [[0,0],[0.25,5],[0.5,7],[0.75,3],[1,1]]) that reside on the
	curve to fit.

	return - An array of the four points required for a Cubic Bezier Curve.
*/
function fitCurve(points) {
	// math.js functions used in this file
	var add = (A,B) => [A[0]+B[0],A[1]+B[1]];
	var subtract = (A,B) => [A[0]-B[0],A[1]-B[1]];
	var multiply = (A,B) => [A[0]*B,A[1]*B];
	var divide = (A,B) => [A[0]/B,A[1]/B];
	var dot = (A,B) => A[0]*B[0]+A[1]*B[1];
	var norm = A => Math.sqrt((A[0]*A[0])+(A[1]*A[1]));

	var bezier = t => add(multiply([1,1], 3 * (1-t) * t * t), multiply([1,1], Math.pow(t,3)));

	function fitCubic(leftTangent, rightTangent) {
		function generateBezier(parameters, leftTangent, rightTangent) {
			var bezCurve = [[0,0], null, null, [1,1]];
			var A = [[[0,0],[0,0]],[[0,0],[0,0]],[[0,0],[0,0]],[[0,0],[0,0]],[[0,0],[0,0]]];

			for (var i = 0, len = 5; i < len; ++i) {
				var u = parameters[i];
				A[i][0] = multiply(leftTangent, 3 * (1 - u) * (1 - u) * u);
				A[i][1] = multiply(rightTangent, 3 * (1 - u) * u * u);
			}

			var C = [[0,0],[0,0]];
			var X = [0,0];

			for (var i = 0; i < 5; ++i) {
				C[0][0] += dot(A[i][0],A[i][0]);
				C[0][1] += dot(A[i][0],A[i][1]);
				C[1][0] += dot(A[i][0],A[i][1]);
				C[1][1] += dot(A[i][1],A[i][1]);

				var tmp = subtract(points[i], bezier(parameters[i]));
				X[0] += dot(A[i][0],tmp);
				X[1] += dot(A[i][1],tmp);
			}

			var det_C0_C1 = C[0][0] * C[1][1] - C[1][0] * C[0][1];
			var alpha_l = (X[0] * C[1][1] - X[1] * C[0][1]) / det_C0_C1;
			var alpha_r = (C[0][0] * X[1] - C[1][0] * X[0]) / det_C0_C1;
			var epsilon = 1.0e-6 * Math.sqrt(2);

			if (alpha_l < epsilon || alpha_r < epsilon) {
				bezCurve[1] = multiply(leftTangent, segLength / 3);
				bezCurve[2] = add([1,1], multiply(rightTangent, segLength / 3));
			} else {
				bezCurve[1] = multiply(leftTangent, alpha_l);
				bezCurve[2] = add([1,1], multiply(rightTangent, alpha_r));
			}

			return bezCurve;
		}

		var u = [0,0,0,0,0];
		for (var i = 1; i < 5; ++i)
			u[i] = u[i-1] + norm(subtract(points[i],points[i-1]));
		for (var i = 0; i < 5; ++i)
			u[i] /= u[4];

		return [generateBezier(u, leftTangent, rightTangent)];
	}

	var normalize = v => divide(v,norm(v));
	var leftTangent = normalize(points[1]);
	var rightTangent = normalize(subtract(points[3],points[4]));
	return fitCubic(leftTangent,rightTangent);
}
