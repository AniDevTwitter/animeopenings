/*
	JavaScript implementation of
	CoffeeScript implementation of
	Algorithm for Automatically Fitting Digitized Curves
	by Philip J. Schneider
	"Graphics Gems", Academic Press, 1990

	CoffeeScript Source: https://github.com/soswow/fit-curves/blob/master/src/fitCurves.coffee
	JavaScript Implementation by Yay295
	V1 Changes:
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
	V3 Changes:
	- Added strict mode.
	- Unrolled some loops.
	- "Inlined" some functions that were only called once.
*/

"use strict";

/*
	points - An array of points (ex. [[0,0],[0.25,5],[0.5,7],[0.75,3],[1,1]]) that reside on the
	curve to fit.

	return - An array of the four points required for a Cubic Bezier Curve.
*/
function fitCurve(points) {
	// math.js functions used in this function
	var add = (A,B) => [A[0]+B[0],A[1]+B[1]];
	var subtract = (A,B) => [A[0]-B[0],A[1]-B[1]];
	var multiply = (A,B) => [A[0]*B,A[1]*B];
	var divide = (A,B) => [A[0]/B,A[1]/B];
	var dot = (A,B) => A[0]*B[0]+A[1]*B[1];
	var norm = A => Math.sqrt((A[0]*A[0])+(A[1]*A[1]));

	var bezier = t => add(multiply([1,1], 3 * (1-t) * t * t), multiply([1,1], Math.pow(t,3)));
	var normalize = v => divide(v,norm(v));

	var leftTangent = normalize(points[1]);
	var rightTangent = normalize(subtract(points[3],points[4]));
	var i;

	var u = [0,0,0,0,0];
	u[1] = norm(subtract(points[1],points[0]));
	u[2] = u[1] + norm(subtract(points[2],points[1]));
	u[3] = u[2] + norm(subtract(points[3],points[2]));
	u[4] = u[3] + norm(subtract(points[4],points[3]));

	u[1] /= u[4];
	u[2] /= u[4];
	u[3] /= u[4];
	u[4] = 1;

	var A = [[0,0],[0,0]];
	var C = [0,0,0,0];
	var X = [0,0];

	for (i = 1; i < 5; ++i) {
		var p = u[i];
		A[0] = multiply(leftTangent, 3 * (1 - p) * (1 - p) * p);
		A[1] = multiply(rightTangent, 3 * (1 - p) * p * p);

		C[0] += dot(A[0],A[0]);
		C[1] += dot(A[0],A[1]);
		C[2] += dot(A[0],A[1]);
		C[3] += dot(A[1],A[1]);

		var tmp = subtract(points[i], bezier(u[i]));
		X[0] += dot(A[0],tmp);
		X[1] += dot(A[1],tmp);
	}

	var temp = C[0] * C[3] - C[2] * C[1];
	var alpha_l = (X[0] * C[3] - X[1] * C[1]) / temp;
	var alpha_r = (C[0] * X[1] - C[2] * X[0]) / temp;
	var epsilon = 1.0e-6 * Math.sqrt(2);

	if (alpha_l < epsilon || alpha_r < epsilon)
		alpha_l = alpha_r = Math.sqrt(2) / 3;

	return [[0,0], multiply(leftTangent, alpha_l), add([1,1], multiply(rightTangent, alpha_r)), [1,1]];
}
