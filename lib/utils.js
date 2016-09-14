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
	* @method snapToGrid
	* @param {Number} {num} Number to snap
	* @param {Number} {segmentSize} Grid size to snap to
	* @param {String} {[func="floor"]} Math rounding function ("floor", "round", or "ceil")
	* @return {Number} Returns 'num' snapped to closest 'segmentSize' based on math function 'func'
	*/
	function snapToGrid(num, segmentSize, func) {
		if (!func)
			func = 'round';
		return Math[func](segmentSize * Math[func](num / segmentSize));
	};

	/**
	* Insert a string at a position into another string
	*
	* @parent devoir.utils
	* @method spliceStr
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
	* @method instanceOf
	* @param {Object} {obj} Object to check
	* @param {String|Type} {[types]} Data type(s) to check against
	* @return {Boolean} True if object matches one of [types], false if not.
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
		A string that is nothing but whitespace is considered empty.
	*
	* @parent devoir.utils
	* @method noe
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
	* Return the size of an Object, Array or String. If an Object is passed in the size returned is the number of keys.
	*
	* @parent devoir.utils
	* @method sizeOf
	* @param {Object|String|Array} {obj} Object, Array or String to report size on
	* @return {Number} Size of object
	*/
	function sizeOf(obj) {
		if (obj === undefined || obj === null)
			return 0;

		if (obj.size instanceof Function)
			return obj.size();
		
		if ((obj instanceof Array) || (typeof obj === 'string') || (obj instanceof String)) {
			return obj.length;
		} else if (obj instanceof Object) {
			return Object.keys(obj).length;
		}

		return (obj.length) ? obj.length : 0;
	};

	/**
	* Generate a random UUID.
	*
	* @parent devoir.utils
	* @method generateUUID
	* @return {String} Returns 32 character UUID
	*/
	//Specials thanks to broofa and Jeff Ward for the following function
	//http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
	function generateUUID() {
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
	* @method walk
	* @param {Object} {data} Object to walk
	* @param {Function} {callback} Callback to be called for every property on the object tree
	* @return {Boolean|undefined} False if walk was canceled (from callback). Undefined otherwise.
	*/

	/**
	* Callback for 'walk' function @@devoir.utils.walk
	*
	* @parent devoir.utils
	* @method walk.callback
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
				var objectID = D.prop(v, 'getID');
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
	* Extract part from regular expression match on string, or return default if not found.
	*
	* @parent devoir.utils
	* @method extract
	* @param {String} {str} String to match against
	* @param {String|RegExp} {regExp} Regular expression to match/capture
	* @param {Number} {index} Index into captures to return (starts at 1)
	* @param {*} {[defaultValue=undefined]} If match fails, return this value
	* @param {String} {[opts="im"]} Flags for RegExp, this only applies if 'regExp' argument is a String. See RegExp on MDN for flags.
	* @return {String} Captured value at 'index', or 'defaultValue' on failure to capture
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
	* the first letter of every word if 'allWords' is true.
	*
	* @parent devoir.utils
	* @method prettify
	* @param {String} {tempStr} String to modify
	* @param {Boolean} {allWords} If true, capitalize the first letter of EVERY word
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
	* @method flatten
	* @param {Object} {obj} Object to flatten
	* @param {Number} {maxDepth} If specified, don't traverse any deepr than this number of levels
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
	* @method enumerate
	* @param {Array} {args} Array object to enumerate
	* @param {Function} {func} Callback function. Takes the (currentValue, sumValue, isLast) as arguments.
	* "this" context is an empty object that can be used for what-ever in the enumerator. The
	* return value of this callback IS the final enumerated value.
	* @return {*} Enumerated value. This can be anything the enumerate function returns.
	* @example
	  //Make a sum enumerator
		var finalSum = D.utils.enumerate([5,3.4,4,87,23.3], function(current, total) {
			if (!total) //total starts as "undefined"
				total = 0;
			this.lastNumber = current; //Context can be used to "save" states between interations
			return total + current;
		});
	*/
	function enumerate(args, func) {
		if (!root.instanceOf(func, 'function'))
			throw new Error('must specify a compare function');

		var val, obj = {length: args.length};
		for (var i = 0, len = args.length; i < len; i++) {
			var thisVal = args[i];
			val = func.apply(obj, [thisVal, val, ((i+1)>=len)]);
		}

		return val;
	}

	/**
	* Return the average of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* D.utils.enumerate(arguments, function(a, b, c) { if (!b) b = 0; b += a; return (c) ? b / this.length ; a; });
	*
	* @parent devoir.utils
	* @method average
	* @param {Number} {[args...]} Argument list as numbers
	* @return {*} Average of all numbers
	* @see devoir.utils.enumerate
	*/
	function average() {
		var args = new Array(arguments.length);
		for (var i = 0, len = args.length; i < len; i++)
			args[i] = arguments[i];

		return root.enumerate(args, function(a, b, c) { if (!b) b = 0; b += a; return (c) ? (b / this.length) : b; });
	}

	/**
	* Return the smallest of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* D.utils.enumerate(arguments, function(a, b) { return (a < b) ? a : b; });
	*
	* @parent devoir.utils
	* @method smallest
	* @param {Number} {[args...]} Argument list as numbers / comparitive values
	* @return {*} Smallest compared value
	* @see devoir.utils.enumerate
	*/
	function smallest() {
		var args = new Array(arguments.length);
		for (var i = 0, len = args.length; i < len; i++)
			args[i] = arguments[i];

		return root.enumerate(args, function(a, b) { return (a < b) ? a : b; });
	}

	/**
	* Return the largest of all provided values. This uses @@devoir.utils.enumerate as follows:<br><br>
	* D.utils.enumerate(args, function(a, b) { return (a > b) ? a : b; });
	*
	* @parent devoir.utils
	* @method largest
	* @param {Number} {[args...]} Argument list as numbers / comparitive values
	* @return {*} Largest compared value
	* @see devoir.utils.enumerate
	*/
	function largest() {
		var args = new Array(arguments.length);
		for (var i = 0, len = args.length; i < len; i++)
			args[i] = arguments[i];

		return root.enumerate(args, function(a, b) { return (a > b) ? a : b; });
	}

	/**
	* Trim a string by a RegExp matching start and/or end. If a startRE is specified, but no endRE, than
	* endRE will be the same as startRE. If neither startRE or endRE are specified than
	* whitespace is assumed.
	*
	* @parent devoir.utils
	* @method trim
	* @param {String} {tempStr} String to trim'
	* @param {String|RegExp} {[startRE=/^\s+/gm]} RegExp match to trim from the beginning of the string
	* @param {String|RegExp} {[endRE=startRE || /\s+$/gm]} RegExp match to trim from the end of the string
	* @return {String} Trimmed string
	* @example
		var trimmedStr = D.utils.trim("%%#$%^&Just me!%^(^&*", "\W"); //Anything that isn't a "word"
		trimmedStr === "Just me";
	*/
	function trim(tempStr, startRE, endRE) {
		if (root.instanceOf(startRE, 'string')) {
			if (!endRE)
				endRE = new RegExp(RegExp.escape(startRE) + '$', 'gim');
			else if (root.instanceOf(endRE, 'string'))
				endRE = new RegExp(RegExp.escape(endRE) + '$', 'gim');

			startRE = new RegExp('^' + RegExp.escape(startRE), 'gim');
		}

		if (!startRE)
			startRE = /^\s+/gim;

		if (!endRE)
			endRE = /\s+$/gim;

		return tempStr.replace(startRE, '').replace(endRE, '');
	}

	/**
	* See if any of the elements in "testArray" match the comparison arguments provided.
	*
	* @parent devoir.utils
	* @method ifAny
	* @param {Array|Object} {testArray} Array/Object to compare each element
	* @param {*} {[args...]} Any object/value to test against elements of "testArray" (testArray[0]===arg[1]||testArray[0]===arg[2]...)
	* @return {Boolean} True if ANY elements match ANY provided arguments, false otherwise
	*/
	function ifAny(testArray) {
		if (!root.instanceOf(testArray, 'object'))
			return false;

		var argsLen = arguments.length;
		for (var key in testArray) {
			if (!testArray.hasOwnProperty(key))
				continue;

			var elem = testArray[key];
			for (var i = 1; i < argsLen; i++)
				if (elem === arguments[i]) return true;
		}
		return false;
	}

	/**
	* Compare two strings/numbers. This differs from JS internal < or > because
	* it will "pad" the strings first so they match length. For example,
	* comparing "a" with "aaaa" will pad the first argument to be "000a"
	* so the internal compairison would be:<br>
	* ("000a" == "aaaa") ? 0 : (("000a" < "aaaa") ? 1 : -1);
	*
	* @parent devoir.utils
	* @method compare
	* @param {String} {strA} First string to compare
	* @param {String} {strB} Second string to compare
	* @param {Boolean} {dontMatchLength} If true, strings will not be padded to have equal lengths
	* @return {Number} 0 if strA == strB, 1 if strA is smaller than strB, and -1 if strA is larger than strB
	*/
	//FIXME: Use new Array and join instead of string concatenation for "0"
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
			while(strA.length < strB.length) strA = "0" + strA;
			while(strB.length < strA.length) strB = "0" + strB;
		}

		if (isString) {
			strA = strA.toLowerCase();
			strB = strB.toLowerCase();
		}

		return (strA == strB) ? 0 : ((strA < strB) ? 1 : -1);
	}

	function dict(_template, _opts) {
    var template = _template,
        opts = _opts || {},
        isPlural = (opts.pluralCount !== 1),
        doPlural = !!opts.plural,
        prettify = !!opts.prettify,
        fullDictionary = opts.dict || Object.create({
          'this': {
            plural: 'these',
          },
          'these': {
            singular: 'this',
          },
          'them': {
            singular: 'it',
          },
          'it': {
            plural: 'them',
          }
        }, dict);

    if (!template)
    	return template;
    
    //If this is a single phrase, make it work
    if (template.indexOf('<') < 0)
      template = '<' + template + '>';

    return template.replace(/<([\^$!]+?)?([^>]+)\>/g, function(match, flags, phrase, offset, str) {
      if (phrase === '#') {
        var num = opts.pluralCount;
        if (!num)
          num = 0;
        return '' + num;
      }

      return phrase.replace(/[\w\s]+/g, function(term) {
        var p = term, pL = term.toLowerCase(), pD = fullDictionary[pL], 
            fDoPlural = doPlural, fIsPlural = isPlural, fPrettify = prettify;

        if (flags) {
          //Force prettify
          if (flags.indexOf('^') > -1)
            fPrettify = true;

          //$ = force plural
          //! = force no plural
          if (flags.indexOf('$') > -1) {
            fIsPlural = true;
            fDoPlural = true;
          } else if (flags.indexOf('!') > -1) {
            fDoPlural = false;    
          }
        }
        if (pD && pD instanceof Object) {
          p = (doPlural && isPlural) ? pD.plural : pD.singular;
          if (!p)
              p = term;
        } else {
          p = (pD) ? pD : term;
          if (fDoPlural && isPlural) {
            var endsWith = p.charAt(term.length - 1).toLowerCase();
            if (endsWith !== 's' && endsWith !== 'y') {
              p = p + 's';
            } else if (endsWith === 'y') {
              p = p.substring(0, p.length - 1) + 'ies';
            }    
          }
        }

        return (fPrettify) ? root.prettify(p, true) : p;    
      });
    });
	}

	//lut is for generateUUID
	var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

	root.snapToGrid = snapToGrid;
	root.spliceStr = spliceStr;
	root.instanceOf = instanceOf;
	root.noe = noe;
	root.sizeOf = sizeOf;
	root.generateUUID = generateUUID;
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
	root.dict = dict;

	function Tokenizer(opts) {
		function addTokens(tokenMap, tokenTypes) {
			keys = Object.keys(tokenTypes);
			for (var i = 0, len = keys.length; i < len; i++) {
				var tokenKey = keys[i],
						tokenType = tokenTypes[tokenKey];

				if (!tokenType) {
					delete tokenMap[tokenKey];
					continue;
				}
				
				var thisToken = tokenMap[tokenKey];
				if (!thisToken)
					thisToken = tokenMap[tokenKey] = {type: tokenKey};

				for (var k in tokenType) {
					if (!tokenType.hasOwnProperty(k))
						continue;
					thisToken[k] = tokenType[k];
				}
			}

			if (this.parentClass && this.parentClass.tokenTypes)
				addTokens.call(this, tokenMap, this.parentClass.tokenTypes);

			return tokenMap;
		}

		var tokenMap = addTokens.call(this, {}, this.tokenTypes);
		if (opts && opts.tokenTypes)
			addTokens.call(this, tokenMap, opts.tokenTypes);

		var tokenList = [],
				keys = Object.keys(tokenMap);

		for (var i = 0, len = keys.length; i < len; i++)
			tokenList.push(tokenMap[keys[i]]);
		
		tokenList = tokenList.sort(function(a,b) {
			var x = a.order, y = b.order;
			return (x == y) ? 0 : (x < y) ? -1 : 1;
		});

		if (opts && opts instanceof Object) {
			for (var k in opts) {
				if (!opts.hasOwnProperty(k))
					continue;
				this[k] = opts[k];
			}
		}

		this.tokenTypes = tokenList;
		this.tokens = [];
	}

	Tokenizer.prototype = {
		ABORT: function ABORT(){},
		SKIP: function SKIP(){},
		tokenMatch: function tokenMatch(offset, _match, noSkipWS) {
			var tokens = this.tokens,
					match = _match.toLowerCase();

			if (offset >= tokens.length)
				return false;

	    for (var i = 0, k = 0, j = offset, token = tokens[j], val = token.value.toLowerCase(), tokenLen = tokens.length, len = match.length; i < len;) {
	      var c1 = match.charAt(i);

	      if (k >= val.length || (token.type === 'WhiteSpace' && !noSkipWS && !c1.match(/\s/))) {
	        j++;
	        if (j >= tokenLen)
	          return false;

	        token = tokens[j];
	        val = token.value.toLowerCase();
	        k = 0;

	        continue;
	      }

	      i++;
	      var c2 = val.charAt(k++);

	      if (c1 !== c2)
	        return false;
	    }

	    return true;
	  },
	  isTokenOfType: function isTokenOfType(token, types) {
	    for (var i = 0, len = types.length, tokenType = token.type; i < len; i++) {
	      var thisType = types[i];
	      if (thisType === tokenType)
	        return i;
	      else if (thisType.type === tokenType && thisType.value === token.value)
	        return i;
	    }

	    return -1;
	  },
	  getTokensRaw: function getTokensRaw(_startOffset, _endOffset) {
	  	return this.joinTokens(this.tokens, _startOffset, _endOffset);
	  },
	  joinTokens: function(tokens, _startOffset, _endOffset) {
	  	var val = [],
	  			token,
	  			startOffset = _startOffset,
	  			endOffset = _endOffset;

	  	if (!startOffset)
	  		startOffset = 0;

	  	if (!endOffset)
	  		endOffset = tokens.length;

	    for (var i = startOffset, len = tokens.length; i < len && i < endOffset; i++) {
	      token = tokens[i];
	      val.push(token.value);
	    }

	    return val.join('');
	  },
	  eatWhiteSpace: function eatWhiteSpace(offset) {
	  	var tokens = this.tokens;
	    for (var i = offset, len = tokens.length; i < len; i++) {
	      var token = tokens[i];
	      if (token.type === 'WhiteSpace')
	        continue;
	      break;
	    }
	    return i;
	  },
	  eatUpTo: function eatUpTo(offset, _types) {
	    var tokens = this.tokens,
	    		types = _types;

	    if (!(types instanceof Array))
	      types = [types];

	    for (var i = offset, len = tokens.length; i < len; i++) {
	      var token = tokens[i];
	      if (this.isTokenOfType(token, types) < 0)
	        continue;
	      break;
	    }

	    return i;
	  },
		constructor: Tokenizer,
		parse: function(input, _offset) {
			function eatWhiteSpace(input, _offset) {
				var offset = (_offset) ? _offset : 0;
				var wsRE = /\s+/g;
				wsRE.lastIndex = offset;
				var match = wsRE.exec(input);

				if (!match || match.index !== offset)
					return offset;

				return wsRE.lastIndex;
			}

			function getToken(input, _offset, previousToken) {
				var offset = (_offset) ? _offset : 0;
				if (offset >= input.length)
					return null;

				if (skipWS)
					offset = eatWhiteSpace(input, offset);

				var tokens = this.tokenTypes,
						context = this;

				for (var i = 0, len = tokens.length; i < len; i++) {
					var token = tokens[i],
							pattern = token.pattern, 
							success = token.success,
							fail = token.fail,
							newOffset = offset,
							match;

					if (pattern instanceof Function) {
						match = pattern.call(context, input, offset, previousToken);
						
						if (match instanceof Tokenizer.prototype.ABORT)
							return null;

						if (match && (match instanceof Array)) {
							match.index = offset;
							newOffset = (match.lastIndex !== undefined) ? match.lastIndex : offset + match[0].length;
						}
					} else {
						pattern.lastIndex = offset;
						match = pattern.exec(input);
						newOffset = pattern.lastIndex;
					}

					if (match && match.index === offset) {
						var tokenValue, ret;

						if (!(match instanceof Tokenizer.prototype.SKIP)) {
							if (success instanceof Function) {
								match.push(offset);
								match.push(input);
								ret = success.apply(context, match);

								if (ret instanceof Tokenizer.prototype.ABORT)
									return null;

								if (root.instanceOf(ret, 'string', 'number', 'array', 'function', 'boolean') && !(ret instanceof Object)) {
									tokenValue = {value: ret};
								} else {
									tokenValue = ret;
								}
							} else {
								tokenValue = {value: match[0]};
							}
						} else {
							tokenValue = match;
						}

						tokenValue.type = token.type;
						tokenValue.index = token.order;
						tokenValue.offset = offset;
						token.offset = offset;

						return {
							offset: newOffset,
							value: tokenValue
						};
					}

					if (fail instanceof Function)
						fail.call(context);
				}

				return null;
			}

			var tokens = [], 
					offset = _offset || 0, 
					token = {value: {type: 'Null',value: null}}, 
					skipWS = (this.skipWS !== false),
					context = Object.create(this);
			
			context.abort = function() {
				return new Tokenizer.prototype.ABORT();
			};

			context.skip = function() {
				return new Tokenizer.prototype.SKIP();
			};

			context.previousIsType = function(_types, _skipTypes) {
				if (this.tokens.length === 0)
					return false;

				var types = (_types instanceof Array) ? _types : [_types],
						skipTypes = (_skipTypes instanceof Array) ? _skipTypes : [_skipTypes],
						tokens = this.tokens;

				for (var i = tokens.length - 1; i >= 0; i--) {
					var token = tokens[i];
					if (skipTypes && skipTypes.indexOf(token.type) >= 0)
						continue;

					if (types.indexOf(token.type) >= 0)
						return token;
					else
						break;
				}

				return false;
			};

			this.tokens = tokens;
			this.input = input;

			while((token = getToken.call(context, input, offset, token.value))) {
				if (!(token.value instanceof Tokenizer.prototype.SKIP))
					tokens.push(token.value);
				offset = token.offset;
			}

			this.offset = offset;

			return tokens;
		},
		tokenTypes: {
			'WhiteSpace': {
				order: 9,
				pattern: /\s+/g
			},
			'Identifier': {
				order: 10,
				pattern: /[a-zA-Z][a-zA-Z0-9_]*/g
			},
			'String': {
				order: 20,
				pattern: function parseString(input, offset) {
					var strStart = input.charAt(offset);
					if (strStart !== '\'' && strStart !== '"')
						return offset;

					var skipNext = false;
					for (var i = offset + 1, len = input.length; i < len; i++) {
						var c = input.charAt(i);

						if (skipNext) {
							skipNext = false;
							continue;
						}

						//Skip escaping a backslash
						if (c === '\\') {
							skipNext = true;
							continue;
						}

						if (c === strStart)
							break;
					}

					return [input.substring(offset, i + 1), input.substring(offset + 1, i)];
				},
				success: function(match, rawValue) {
					return {
						value: rawValue
					};
				}
			},
			'Numeric': {
				order: 30,
				pattern: function(input, offset, previousToken) {
					if (previousToken.type === 'Identifier')
						return;

					var re = /[\d.e-]+/g;

					re.lastIndex = offset;
					var match = re.exec(input);
					if (!match || match.index !== offset)
						return;

					var val = parseFloat(match[0]);
					if (isNaN(val) || !isFinite(val))
						return;
					
					return match;
				}
			},
		  'Punctuator': {
				order: 40,
				pattern: /[^a-zA-Z0-9]/g
			},
			'Unknown': {
				order: 50,
				pattern: /.+/g
			}
		}
	};

	root.Tokenizer = Tokenizer;

	return root;
});
