(function(factory) {
	module.exports = function(_root, _base) {
		var root = _root || {},
				base = _base;

		if (!base)
			base = require('./base');

		return factory(root, base);
	};
})(function(root, D) {
	'use strict';

	/**
	* @namespace {devoir}
	* @namespace {utils} Devoir Utility Functions
	*/

	/**
	* @function {snapToGrid} Snap any number to specified grid
	* @param {Number} {num} Number to snap
	* @param {Number} {segmentSize} Grid size to snap to
	* @param {[func="round"]} Math rounding function
			@type {String} Can be one of "floor", "round", or "ceil"
			@type {Function} A function that takes a single Number as an argument and returns a Number
				@param {Number} {num} Number to modify / round
				@returns {Number} Calculated number
			@end
		@end
	* @return {Number} Returns *num* snapped to closest *segmentSize* based on math function *func*
	*/
	function snapToGrid(num, segmentSize, _func, _offset, _scalar) {
		var func = _func,
				offset = _offset || 0,
				scalar = _scalar || 100;

		if (!func)
			func = Math.round;

		if (instanceOf(func, 'string'))
			func = Math[func];

		return (func((segmentSize * scalar) * func(((offset + num) * scalar) / (segmentSize * scalar))) - (offset * scalar)) / scalar;
	};

	/**
	* @function {spliceStr} Insert a string at a position into another string
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
	* @function {instanceOf} Check to see if object is any of the specified data types.
	* @param {Object} {obj} Object to check
	* @param {String|Constructor} {types...} Data type(s) to check against
	* @return {Boolean} **true** if object matches any one of *types*, **false** if not.
	*/
	function instanceOf(obj) {
		function testType(obj, _val) {
			function isDeferredType(obj) {
				if (obj instanceof D.Deferred)
					return true;

				if (obj instanceof Object && obj.then instanceof Function)
					return true;
				
				return false;
			}	

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

			if (val === 'deferred' && isDeferredType(obj))
				return true;

			if (val === 'number' && (typeof obj === 'number' || (obj instanceof Number)) && (isNaN(obj) || !isFinite(obj)))
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
	* @function {noe} Check to see if an Object, Array, String, or Number is empty, null or undefined.
	*	A string that is nothing but whitespace is considered empty. If the Object
	*	is a Number, return true if it *isNaN* or *!isFinite*
	* @param {Object|String|Array|Number} {[args...]} Arguments to check
	* @return {Boolean} **true** if *all* arguments are 'null or empty', **false** otherwise.
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
	* @function {sizeOf} Return the size of an Object, Array or String. Size is ascertained in the following manner:<br>
	* 1. If the object passed in has a "size" function, this will be called and the value returned will be the "size".
	* 2. If the object is an Array or a String, return the "length"
	* 3. If the object contains a "length" property, return that as the "size"
	* 4. If the object is an instance of Object, return the number of "keys" the plain object contains
	* 5. Otherwise return 0
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
	* @function {generateUID} Generate a random UID (Unique ID)
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
	* @function {extract} Extract part from regular expression match on string, or return a default value if no match is found.
	* @param {String} {str} String to match against
	* @param {regExp} 
	*		@type {String} String to convert to a RegExp to match/capture
	*		@type {RegExp} Regular expression to match/capture
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
	* @function {prettify} Capitalize the first letter of the first word, or optionally capitalize
	* the first letter of every word if *allWords* argument is **true**
	* @param {String} {str} String to modify
	* @param {Boolean} {[allWords=false]} If **true**, capitalize the first letter of EVERY word (instead of just the first)
	* @return {String} A prettified string
	*/
	function prettify(tempStr, allWords) {
		if (root.noe(tempStr))
			return '';

		if (allWords) {
			return ('' + tempStr).toLowerCase().replace(/\b(\w)/gi, function(a, x) { return '' + x.toUpperCase(); });
		} else {
			return ('' + tempStr).replace(/^([^\w]*)(\w)(\w+)?/gi, function(a, x, y, z) { var initial = x + y.toUpperCase(); return (z) ? (initial + z.toLowerCase()) : (initial); });
		}
	}

	/**
	* @function {enumerate} Enumerate over an array and derive a result
	* @param {Function} {func} Enumeration function. "this" context is an empty object that can be used for storage across iterations in the enumerator
			@param {*} {currentValue} Current value in list
			@param {*} {running} Current running value
			@param {Boolean} {isLast} **true** if this is the last value in the list
			@return {*} Final calculated value
		@end
	* @param {*|Array} {args...} Values / Arrays to enumerate
	* @return {*} Enumerated value. This will be whatever the enumerate function returns on its final iteratio
	* @example {javascript}
	  //Make a sum enumerator
		var finalSum = D.utils.enumerate([5,3.4,4,87,23.3], function(current, total) {
			this.lastNumber = current; //Context can be used to "save" states between iterations
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
	* @function {average} Return the average of all provided values. This uses @@@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(function(a, b, c) { if (!b) b = 0; b += a; return (c) ? b / this.length ; a; }, arguments);`
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
	* @function {smallest} Return the smallest of all provided values. This uses @@@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(arguments, function(a, b) { return (a > b) ? b : a; });`
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
	* @function {largest} Return the largest of all provided values. This uses @@@devoir.utils.enumerate as follows:<br><br>
	* `D.utils.enumerate(args, function(a, b) { return (a < b) ? b : a; });`
	* @param {Number} {[args...]} Argument list as numbers / comparative values
	* @return {*} Largest compared value
	* @see devoir.utils.enumerate
	*/
	function largest() {
		return root.enumerate.bind(this, function(a, b) {
			return (a < b) ? b : a; 
		}).apply(this, arguments);
	}

	/**
	* @function {trim} Trim a string by a RegExp matching start and/or end. If a *startRE* argument is specified, but no *endRE* argument, than
	* *endRE* will be the same as *startRE*. If neither *startRE* or *endRE* arguments are specified than
	* whitespace is assumed.
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
	* @function {compare} Compare two strings/numbers. This differs from JS internal < or > because
	* it will "pad" the strings first so they match length. For example,
	* comparing "a" with "aaaa" will pad the first argument to be "000a"
	* so the internal compairison would be:<br>
	* `("000a" == "aaaa") ? 0 : (("000a" < "aaaa") ? 1 : -1);`
	* @param {String} {strA} First string to compare
	* @param {String} {strB} Second string to compare
	* @param {Boolean} {[dontMatchLength]} If true, strings will not be padded to have equal lengths
	* @return {Number} **0** if *strA* == *strB*, **1** if *strA* is smaller than *strB*, and **-1** if *strA* is larger than *strB*
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
	root.extract = extract;
	root.prettify = prettify;
	root.enumerate = enumerate;
	root.average = average;
	root.smallest = smallest;
	root.largest = largest;
	root.trim = trim;
	root.compare = compare;

	return root;
});
