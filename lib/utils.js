(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root, require('./base'));
	};
})(function(root, D) {
	'use strict';

	/**
	* Devoir Utility Functions
	*
	* @parent devoir
	* @namespace utils
	*/

	/**
	* Snap any number to specified grid
	*
	* @parent devoir.utils
	* @function snapToGrid
	* @param {Number} {num} Number to snap
	* @param {Number} {segmentSize} Grid size to snap to
	* @param {String} {[func="round"]} Math rounding function. Can be one of "floor", "round", or "ceil", or any function that takes a single Number as an argument and returns a Number
	* @return {Number} Returns 'num' snapped to closest 'segmentSize' based on math function 'func'
	*/
	function snapToGrid(num, segmentSize, _func) {
		var func = _func;
		if (!func)
			func = Math.round;

		if (instanceOf(func, 'string'))
			func = Math[func];

		return func(segmentSize * func(num / segmentSize));
	};

	/**
	* Insert a string at a position into another string
	*
	* @parent devoir.utils
	* @function spliceStr
	* @param {String} {str1} String to insert into
	* @param {String} {str2} String to insert
	* @param {String} {index} Index to insert at (0 will insert at beginning)
	* @return {String} Return str1 with str2 inserted at specified index
	*/
	function spliceStr(str1, str2, index) {
		var parts = [str1.substring(0, index), str2, str1.substring(index)];
		return parts.join('');
	}

	/**
	* Check to see if object is any of the specified data types.
	*
	* @parent devoir.utils
	* @function instanceOf
	* @param {Object} {obj} Object to check
	* @param {String|Constructor} {types...} Data type(s) to check against
	* @return {Boolean} True if object matches any one of *types*, false if not.
	*/
	function instanceOf(obj) {
		function testType(obj, _val) {
			if (obj === undefined || obj === null)
				return false;

			var val = _val,
					typeOf = (typeof obj);

			if (val === String)
				val = 'string';
			else if (val === Number)
				val = 'number';
			else if (val === Boolean)
				val = 'boolean';
			else if (val === Function)
				val = 'function';
			else if (val === Array)
				val = 'array';
			else if (val === Object)
				val = 'object';

			if (val === 'number' && (isNaN(obj) || !isFinite(obj)))
				return false;

			if (val === typeOf)
				return true;

			if (val === 'number' && obj instanceof Number)
				return true;

			if (val === 'string' && obj instanceof String)
				return true;

			if (val === 'boolean' && obj instanceof Boolean)
				return true;

			if (val === 'function' && obj instanceof Function)
				return true;

			if (val === 'array' && obj instanceof Array)
				return true;

			if (val instanceof Function && obj instanceof val)
				return true;

			return false;
		}

		for (var i = 1, len = arguments.length; i < len; i++) {
			if (testType(obj, arguments[i]) === true)
				return true;
		}

		return false;
	};

	/**
	* Check to see if an Object, Array, or String is empty, null or undefined.
	*	A string that is nothing but whitespace is considered empty. If the Object
	*	is a Number, return true if it isNaN or !isFinite 
	*
	* @parent devoir.utils
	* @function noe
	* @param {Object|String|Array} {[args]} Arguments to check
	* @return {Boolean} True if all arguments are 'null or empty', false otherwise.
	*/
	function noe() {
		for (var i = 0, len = arguments.length; i < len; i++) {
			var val = arguments[i];
			if (val === undefined || val === null)
				return true;

			if ((typeof val === 'string' || val instanceof String) && !val.match(/\S/))
				return true;

			if ((typeof val === 'number' || val instanceof Number) && (isNaN(val) || !isFinite(val)))
				return true;

			if (typeof val === 'object') {
				if (sizeOf(val) == 0)
					return true;
			}
		}

		return false;
	};

	/**
	* Return the size of an Object, Array or String. Size is ascertained in the following manner:<br>
	* 1. If the object passed in has a "size" function, this will be called and the value returned will be the "size".
	* 2. If the object is an Array or a String, return the "length"
	* 3. If the object contains a "length" property, return that as the "size"
	* 4. If the object is an instance of Object, return the number of "keys" the plain object contains
	* 5. Otherwise return 0
	*
	* @parent devoir.utils
	* @function sizeOf
	* @param {Object|String|Array} {obj} Object, Array, or String to report size on
	* @return {Number} Size / length of object
	*/
	function sizeOf(obj) {
		if (obj === undefined || obj === null)
			return 0;

		if (obj.size instanceof Function)
			return obj.size();
		
		if ((obj instanceof Array) || (typeof obj === 'string') || (obj instanceof String))
			return obj.length;

		if (obj.length !== undefined && obj.length !== null)
			return obj.length;

		if (obj instanceof Object)
			return Object.keys(obj).length;

		return 0;
	};

	/**
	* Generate a random UID (Unique ID).
	*
	* @parent devoir.utils
	* @function generateUID
	* @return {String} Returns 32 character UID
	*/
	//Specials thanks to broofa and Jeff Ward for the following function
	//http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
	function generateUID() {
		var n = D.now();
		var d0 = (Math.random()*n*0xffffffff)|0;
		var d1 = (Math.random()*n*0xffffffff)|0;
		var d2 = (Math.random()*n*0xffffffff)|0;
		var d3 = (Math.random()*n*0xffffffff)|0;
		var uuid = [lut[d0&0xff],lut[d0>>8&0xff],lut[d0>>16&0xff],lut[d0>>24&0xff],
			lut[d1&0xff],lut[d1>>8&0xff],lut[d1>>16&0x0f|0x40],lut[d1>>24&0xff],
			lut[d2&0x3f|0x80],lut[d2>>8&0xff],lut[d2>>16&0xff],lut[d2>>24&0xff],
			lut[d3&0xff],lut[d3>>8&0xff],lut[d3>>16&0xff],lut[d3>>24&0xff]];
		return uuid.join('');
	};

	/**
	* Walk an object, calling a callback for each property. If callback returns 'false' the walk will be aborted.
	*
	* @parent devoir.utils
	* @function walk
	* @param {Object} {data} Object to walk
	* @param {Function} {callback} Callback to be called for every property on the object tree
	* @return {Boolean|undefined} False if walk was canceled (from callback). Undefined otherwise.
	*/

	/**
	* Callback for 'walk' function @@devoir.utils.walk
	*
	* @parent devoir.utils
	* @function walk.callback
	* @param {String} {thisPath} full key path in dot notation (i.e. 'property.child.name')
	* @param {Object} {value} Current property value
	* @param {String} {key} Key name of current property
	* @param {Object} {data} Current property parent object
	* @return {Boolean|undefined} False if walk was canceled (from callback). Undefined otherwise.
	*/
	function walk(data, callback, path, parentData, originalData, parentContext, depth, visitedIDMap) {
		if (!(callback instanceof Function))
			return;

		if (!data)
			return;

		if (typeof data !== 'object')
			return;

		if (!visitedIDMap)
			visitedIDMap = {};

		if (originalData === undefined)
			originalData = data;

		if (path === undefined)
			path = '';

		if (!depth)
			depth = 0;

		if (depth > 64)
			throw new Error('Maximum walk depth exceeded');

		var context = {
			parent: parentContext
		};

		for (var k in data) {
			if (!data.hasOwnProperty(k)) continue;
			var thisPath;

			if (data instanceof Array)
				thisPath = path + '[' + k + ']';
			else {
				thisPath = (path) ? [path, k].join('.') : k;
			}

			var v = data[k];
			if (v !== null && typeof v === 'object') {
				var objectID = D.id(v);
				if (visitedIDMap[objectID]) //No infinite recursion
					continue;

				visitedIDMap[objectID] = v;
				if (root.walk(v, callback, thisPath, data, originalData, context, depth + 1, visitedIDMap) === false)
					return false;
			}

			context.depth = depth;
			context.scope = data;
			context.parentScope = parentData;
			context.originalData = originalData;
			context.fullPath = thisPath;
			if (callback.apply(context, [thisPath, v, k, data, parentData, originalData, depth]) === false)
				return false;
		}
	};

	/**
	* Extract part from regular expression match on string, or return a default value if no match is found.
	*
	* @parent devoir.utils
	* @function extract
	* @param {String} {str} String to match against
	* @param {String|RegExp} {regExp} Regular expression to match/capture
	* @param {Number} {index} Index into captures to return (starts at 1)
	* @param {*} {[defaultValue=undefined]} If match fails, return this value instead
	* @param {String} {[opts="im"]} Flags for RegExp, this only applies if *regExp* argument is a String. See RegExp on MDN for flags.
	* @return {String} Captured value at *index*, or *defaultValue* on failure to match
	*/
	function extract(str, regExp, index, defaultValue, opts) {
		if (!root.instanceOf(str, 'string'))
			return defaultValue;

		if (root.instanceOf(regExp, 'string'))
			regExp = new RegExp(regExp, (opts) ? opts : "im");

		var parts = str.match(regExp);
		if (!parts)
			return defaultValue;

		if (!parts[index])
			return defaultValue;

		return parts[index];
	};

	/**
	* Capitalize the first letter of the first word, or optionally capitalize
	* the first letter of every word if 'allWords' argument is true.
	*
	* @parent devoir.utils
	* @function prettify
	* @param {String} {tempStr} String to modify
	* @param {Boolean} {[allWords=false]} If true, capitalize the first letter of EVERY word
		(instead of just the first)
	* @return {String} 'tempStr', made 'pretty'
	*/
	function prettify(tempStr, allWords) {
		if (root.noe(tempStr))
			return '';

		if (allWords) {
			return ('' + tempStr).replace(/\b(\w)/gi, function(a, x) { return '' + x.toUpperCase(); });
		} else {
			return ('' + tempStr).replace(/^([^\w]*)(\w)/gi, function(a, x, y) { return x + y.toUpperCase(); });
		}
	}

	/**
	* Flatten an object where the returned object's keys are full path notation, i.e:
		{
			my: {},
			my.path: {},
			my.path.to: {},
			my.path.to.key: [],
			my.path.to.key[0]: 'Derp',
			my.path.to.key[1]: 'Hello'
		}
	*
	* @parent devoir.utils
	* @function flatten
	* @param {Object} {obj} Object to flatten
	* @param {Number} {[maxDepth]} If specified, don't traverse any deeper than this number of levels
	* @return {Object} Flattened object
	*/
	function flatten(obj, maxDepth) {
		var ref = {};
		root.walk(obj, function(path, v, k) {
			if (maxDepth && this.depth <= maxDepth)
				ref[path] = v;
			else if (!maxDepth)
				ref[path] = v;
		});
		return ref;
	}

	/**
	* Enumerate over an array and derive a result
	*
	* @parent devoir.utils
	* @function enumerate
	* @param {Function} {func} Callback function. Takes the (currentValue, sumValue, isLast) as arguments.
	* @param {Array} {args...} Values / Arrays to enumerate
	* "this" context is an empty object that can be used for what-ever in the enumerator. The
	* return value of this callback IS the final enumerated value.
	* @return {*} Enumerated value. This can be anything the enumerate function returns.
	* @example {javascript}
	  //Make a sum enumerator
		var finalSum = D.utils.enumerate([5,3.4,4,87,23.3], function(current, total) {
			this.lastNumber = current; //Context can be used to "save" states between interations
			return ((!total) ? 0 : total) + current;
		});
	*/
	function enumerate(func) {
		if (!(func instanceof Function))
			return;

		var val, 
				len = 0,
				args = [],
				context = {index: 0, length: 0};

		for (var i = 1, il = arguments.length; i < il; i++) {
			var arg = arguments[i];
			args = args.concat(arg);
		}

		len = args.length;
		context.length = len;
		for (var i = 0, il = len; i < il; i++) {
			var arg = args[i];
			context.index = i;
			val = func.apply(context, [arg, val, ((i+1)>=len)]);
		}

		return val;
	}

	/**
	* Return the average of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(function(a, b, c) { if (!b) b = 0; b += a; return (c) ? b / this.length ; a; }, arguments);`
	*
	* @parent devoir.utils
	* @function average
	* @param {Number} {args...} Argument list as numbers
	* @return {Number} Average of all numbers
	* @see devoir.utils.enumerate
	*/
	function average() {
		return root.enumerate.bind(this, function(a, b, last) {
			var val = (!b) ? a : (b + a); 
			return (last) ? (val / this.length) : val;
		}).apply(this, arguments);
	}

	/**
	* Return the smallest of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(arguments, function(a, b) { return (a > b) ? b : a; });`
	*
	* @parent devoir.utils
	* @function smallest
	* @param {Number} {args...} Argument list as numbers / comparative values
	* @return {*} Smallest compared value
	* @see devoir.utils.enumerate
	*/
	function smallest() {
		return root.enumerate.bind(this, function(a, b) { 
			return (a > b) ? b : a; 
		}).apply(this, arguments);
	}

	/**
	* Return the largest of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(args, function(a, b) { return (a < b) ? b : a; });`
	*
	* @parent devoir.utils
	* @function largest
	* @param {Number} {[args...]} Argument list as numbers / comparitive values
	* @return {*} Largest compared value
	* @see devoir.utils.enumerate
	*/
	function largest() {
		return root.enumerate.bind(this, function(a, b) {
			return (a < b) ? b : a; 
		}).apply(this, arguments);
	}

	/**
	* Trim a string by a RegExp matching start and/or end. If a *startRE* argument is specified, but no *endRE* argument, than
	* *endRE* will be the same as *startRE*. If neither *startRE* or *endRE* arguments are specified than
	* whitespace is assumed.
	*
	* @parent devoir.utils
	* @function trim
	* @param {String} {tempStr} String to trim
	* @param {String|RegExp} {[startRE=/^\s+/gm]} RegExp match to trim from the beginning of the string
	* @param {String|RegExp} {[endRE=startRE || /\s+$/gm]} RegExp match to trim from the end of the string
	* @return {String} Trimmed string
	* @example {javascript}
		var trimmedStr = D.utils.trim("%%#$%^&Just me!%^(^&*", "\W"); //Anything that isn't a "word"
		trimmedStr === "Just me";
	*/
	function trim(tempStr, _startRE, _endRE) {
		var startRE = _startRE,
				endRE = _endRE;

		if (root.instanceOf(startRE, 'string'))
			startRE = new RegExp('^' + RegExp.escape(startRE), 'gim');

		if (!endRE)
			endRE = startRE;
		else if (root.instanceOf(endRE, 'string'))
			endRE = new RegExp(RegExp.escape(endRE) + '$', 'gim');

		if (!startRE)
			startRE = /^\s+/gim;

		if (!endRE)
			endRE = /\s+$/gim;

		return tempStr.replace(startRE, '').replace(endRE, '');
	}

	/**
	* See if any of the elements in the provided array match the comparison arguments provided.
	*
	* @parent devoir.utils
	* @function ifAny
	* @param {Array|Object} {testArray} Array/Object to compare each element
	* @param {*} {[args...]} Any object/value to test against elements of "testArray" (testArray[0]===arg[1]||testArray[0]===arg[2]...)
	* @return {Boolean} True if ANY elements match ANY provided arguments, false otherwise
	*/
	function ifAny(testArray) {
		if (!testArray)
			return false;

		if (root.instanceOf(testArray, 'string', 'number', 'boolean', 'function'))
			return false;

		if (!(testArray instanceof Array) && !(testArray instanceof Object))
			return false;

		var keys = Object.keys(testArray);
		for (var i = 0, il = keys.length; i < il; i++) {
			var key = keys[i],
					elem = testArray[key];

			for (var j = 1, jl = arguments.length; j < jl; j++) {
				if (elem === arguments[j])
					return true;
			}
		}

		return false;
	}

	/**
	* Compare two strings/numbers. This differs from JS internal < or > because
	* it will "pad" the strings first so they match length. For example,
	* comparing "a" with "aaaa" will pad the first argument to be "000a"
	* so the internal compairison would be:<br>
	* `("000a" == "aaaa") ? 0 : (("000a" < "aaaa") ? 1 : -1);`
	*
	* @parent devoir.utils
	* @function compare
	* @param {String} {strA} First string to compare
	* @param {String} {strB} Second string to compare
	* @param {Boolean} {[dontMatchLength]} If true, strings will not be padded to have equal lengths
	* @return {Number} 0 if strA == strB, 1 if strA is smaller than strB, and -1 if strA is larger than strB
	*/
	function compare(strA, strB, dontMatchLength) {
		if ((strA === undefined || strA === null) && (strB === undefined || strB === null))
			return 0;

		if (strA === undefined || strA === null && strB)
			return 1;

		if (strB === undefined || strB === null && strA)
			return -1;

		var isString = ((typeof strA === 'string' || strA instanceof String) || (typeof strB === 'string' || strB instanceof String));
		if (isString) {
			strA = '' + strA;
			strB = '' + strB;
		}

		if (dontMatchLength !== true) {
			if (strA.length < strB.length)
				strA = (new Array((strB.length - strA.length) + 1)).join('0') + strA;
			else if (strA.length > strB.length)
				strB = (new Array((strA.length - strB.length) + 1)).join('0') + strB;
		}

		if (isString) {
			strA = strA.toLowerCase();
			strB = strB.toLowerCase();
		}

		return (strA == strB) ? 0 : ((strA < strB) ? 1 : -1);
	}

	//lut is for generateUUID
	var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

	root.snapToGrid = snapToGrid;
	root.spliceStr = spliceStr;
	root.instanceOf = instanceOf;
	root.noe = noe;
	root.sizeOf = sizeOf;
	root.generateUID = generateUID;
	root.walk = walk;
	root.extract = extract;
	root.prettify = prettify;
	root.flatten = flatten;
	root.enumerate = enumerate;
	root.average = average;
	root.smallest = smallest;
	root.largest = largest;
	root.trim = trim;
	root.ifAny = ifAny;
	root.compare = compare;

	return root;
});
