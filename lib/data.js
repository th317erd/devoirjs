// (c) 2016 Wyatt Greenway
// This code is licensed under MIT license (see LICENSE.txt for details)

// Helper Functions and utilities
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
	* @namespace {data} Devoir Data Functions
	*/

	function sortBySubKey(array, negate) {
		var args = arguments;
		return array.sort(function(a, b) {
			var x, y;
			for (var i = 2; i < args.length; i++) {
				var key = args[i];
				var isPath = (key.indexOf('.') > -1);

				if (typeof a === 'object')
					x = (isPath) ? D.get(a, key) : a[key];
				else
					x = a;

				if (typeof b === 'object')
					y = (isPath) ? D.get(b, key) : b[key];
				else
					y = b;

				if (y !== undefined && x !== undefined)
					break;
			}

			if (y === undefined || y === null || !('' + y).match(/\S/))
				y = -1;
			if (x === undefined || x === null || !('' + x).match(/\S/))
				x = 1;

			var result = ((x < y) ? -1 : ((x > y) ? 1 : 0));
			return (negate) ? (result * -1) : result;
		});
	}
	root.sortBySubKey = sortBySubKey;

	/**
	* @function {extend} Extend (copy) objects into base object. This should ALWAYS be used instead of jQuery.extend
		because it is faster, and more importantly because it WILL NOT mangle instantiated
		sub-objects.
	* @param {[flags]} 
	* 	@type {Object} Will be considered the first of <b>args</b>
	*		@type {Boolean} If true this is a deep copy
	*		@type {Number} This is a bitwise combination of flags. Flags include: devoir.data.extend.DEEP, devoir.data.extend.NO_OVERWRITE, and devoir.data.extend.FILTER. If the 'FILTER' flag is specified the 2nd argument is expected to be a function to assist in which keys to copy
	*	@end
	* @param {[args...]} 
	* 	@type {Object} Objects to copy into base object. First object in the argument list is the base object.
	*		@type {Function} If the second argument is a function and the bitwise flag "FILTER" is set then this function will be the callback used to filter the keys of objects during copy
				@param {String} {key} Key of object(s) being copied
				@param {*} {value} Value being copied
				@param {Object} {src} Parent Object/Array where value is being copied from
				@param {*} {dstValue} Value of same key at destination, if any
				@param {Object} {dst} Parent Object/Array where value is being copied to
			@end
	*	@end
	* @return {Object} Base object with all other objects merged into it
	*/
	function extend() {
		if (arguments.length === 0)
			return;

		if (arguments.length === 1)
			return arguments[0];

		var isDeep = false;
		var allowOverwrite = true;
		var onlyMatching = false;
		var filterFunc;
		var startIndex = 0;
		var dst = arguments[0];

		if (typeof dst === 'boolean') {
			isDeep = dst;
			startIndex++;
		} else if (typeof dst === 'number') {
			isDeep = (dst & extend.DEEP);
			allowOverwrite = !(dst & extend.NO_OVERWRITE);
			startIndex++;
			filterFunc = (dst & extend.FILTER) ? arguments[startIndex++] : undefined;
		}

		//Destination object
		dst = arguments[startIndex++];
		if (!dst)
			dst = {};

		var val;
		if (isDeep) {
			for (var i = startIndex, len = arguments.length; i < len; i++) {
				var thisArg = arguments[i];
				if (!(thisArg instanceof Object))
					continue;

				var keys = Object.keys(thisArg);
				for (var j = 0, jLen = keys.length; j < jLen; j++) {
					var key = keys[j];

					if (allowOverwrite !== true && dst.hasOwnProperty(key))
						continue;

					val = thisArg[key];
					var dstVal = dst[key];

					if (filterFunc && filterFunc(key, val, thisArg, dstVal, dst) === false)
						continue;

					if (val && typeof val === 'object' && !(val instanceof String) && !(val instanceof Number) &&
							(val.constructor === Object.prototype.constructor || val.constructor === Array.prototype.constructor)) {
						var isArray = (val instanceof Array);
						if (!dstVal)
							dstVal = (isArray) ? [] : {};
						val = extend(true, (isArray) ? [] : {}, dstVal, val);
					}

					dst[key] = val;
				}
			}
		} else {
			for (var i = startIndex, len = arguments.length; i < len; i++) {
				var thisArg = arguments[i];
				if (!(thisArg instanceof Object))
					continue;

				var keys = Object.keys(thisArg);
				for (var j = 0, jLen = keys.length; j < jLen; j++) {
					var key = keys[j];

					if (allowOverwrite !== true && dst.hasOwnProperty(key))
						continue;

					val = thisArg[key];
					if (filterFunc) {
						var dstVal = dst[key];
						if (filterFunc(key, val, thisArg, dstVal, dst) === false)
							continue;
					}

					dst[key] = val;
				}
			}
		}

		if (dst._audit) {
	  	var b = dst._audit.base;
	    b.modified = D.now();
	    b.updateCount++;
		}

		return dst;
	}
	root.extend = extend;

	(function extend_const(base) {
		base.DEEP = 0x01;
		base.NO_OVERWRITE = 0x02;
		base.FILTER = 0x04;
	})(extend);

	function matching(deep) {
		function buildPathMap(pathMap, obj, path) {
			for (var key in thisArg) {
				if (!thisArg.hasOwnProperty(key))
					continue;

				if (!pathMap.hasOwnProperty(key)) {
					pathMap[key] = 1;
					continue;
				}

				pathMap[key] = pathMap[key] + 1;
			}
		}

		var isDeep = false;
		var startIndex = 1;
		var dst = {};
		var pathMap = {};

		if (typeof deep === 'boolean') {
			isDeep = deep;
			startIndex = 1;
		} else {
			startIndex = 0;
		}

		for (var i = startIndex, len = arguments.length; i < len; i++) {
			var thisArg = arguments[i];
			buildPathMap(pathMap, thisArg);
		}

		var objCount = arguments.length - startIndex;
		var lastObj = arguments[arguments.length - 1];
		for (var key in pathMap) {
			if (!pathMap.hasOwnProperty(key))
				continue;

			var val = pathMap[key];
			if (val >= objCount)
				dst[key] = lastObj[key];
		}

		return dst;
	}
	root.matching = matching;

	/**
	* @function {extract} Extracts elements from an Array of Objects (not parts from a String). This is not the same as @@@function:devoir.utils.extract
	* @param {String} {key} Key to extract from all objects
	* @param {Object} {[args...]} Array(s) to extract from
	* @return {Object} Array of extracted properties. If the property wasn't found the array element will be 'undefined'.
	* @see function:devoir.data.toLookup
	* @example {javascript}
		var myParts = D.data.extract('id', [
			{
				id:'derp',
				field: 'derp'
			},
			{
				id:'dog',
				field: 'dog'
			},
			{
				id:'cat',
				field: 'cat'
			}
		], [
			{
				id:'another',
				field: 'another'
			},
			{
				id:'field',
				field: 'field'
			}
		]);

		myParts === ['derp','dog','cat','another','field'];
	*/
	function extract(key) {
		var thisArray = [];
		for (var i = 1, len = arguments.length; i < len; i++) {
			var args = arguments[i];
			if (!args)
				continue;

			for (var j in args) {
				if (!args.hasOwnProperty(j))
					continue;

				var val = D.get(args[j], key);
				thisArray.push(val);
			}
		}
		return thisArray;
	}
	root.extract = extract;

	/**
	* @function {toLookup} This takes an Array and returns a reference map for quick lookup.
	* @param {String} {key} Key to match on all objects. If key is undefined or null, the index will be used instead.
	* @param {Array} {data} Array to create map from
	* @return {Object} Each key in the object will be the value in the Array specified by 'key'
	* @see function:devoir.data.extract
	* @example {javascript}
		var myMap = D.data.toLookup('id', [
			{
				id:'derp',
				field: 'derp'
			},
			{
				id:'dog',
				field: 'dog'
			},
			{
				id:'cat',
				field: 'cat'
			}
		]);

		myMap === {
			'derp': {
				id:'derp',
				field: 'derp'
			},
			'dog': {
				id:'dog',
				field: 'dog'
			},
			'cat': {
				id:'cat',
				field: 'cat'
			}
		};
	*/
	function toLookup(key, data) {
		if (!data)
			return {};

		var obj = {},
				keys = Object.keys(data);
		
		for (var i = 0, il = keys.length; i < il; i++) {
			var id,
					k = keys[i],
					v = data[k];

			if (key) {
				id = D.get(v, key);
			} else {
				id = ('' + v);
			}

			if (!id)
				continue;

			obj[id] = v;
		}

		return obj;
	}
	root.toLookup = toLookup;

	/**
	* @function {mergeKeys} Merge/Facet keys of all objects passed in
	* @param {Object} {[objects...]} Object(s) to gather unique keys from
	* @return {Object} An object where each key is a key in at least one of the objects passed in.
		The value for each key is the number of times that key was encountered.
	* @example {javascript}
		var obj1 = {hello:'world',derp:'cool'}, obj2 = {hello:'dude',cool:'beans'};

		$mn.data.mergeKeys(obj1, obj2); //= {hello:2,derp:1,cool:1}
	*/
	function mergeKeys() {
		var obj = {};
		for (var i = 0, il = arguments.length; i < il; i++) {
			var data = arguments[i];
			var keys = Object.keys(data);
			for (var j = 0, jl = keys.length; j < jl; j++) {
				var k = keys[j];
				if (!obj.hasOwnProperty(k))
					obj[k] = 0;
				obj[k]++;
			}
		}

		return obj;
	}
	root.mergeKeys = mergeKeys;

	/**
	* @function {toArray} Convert Object(s) to an Array/Array of keys
	* @param {[keys]}
	* 	@type {Boolean} Specifies if the result will be an array of keys (true), or an array of objects (false)
	*		@type {Object} The first object to convert
	*	@end
	* @param {Object} {[args...]} Objects to add to Array
	* @return {Array} If *keys* is false or an Object, than all array elements will be the properties of the supplied object(s).
		If *keys* is true, than all array elements will be the keys of all the properties of the supplied object(s).
	* @see {devoir.data.extract} {devoir.data.toLookup}
	* @example {javascript}
		var myArray = D.data.toArray(
			{
				id:'derp',
				field: 'test',
				caption: 'Hello world!'
			});

		myArray === ['derp','test','Hello World!'];

		myArray = myArray = D.data.toArray(true,
			{
				id:'derp',
				field: 'test',
				caption: 'Hello world!'
			});

		myArray === ['id','field','caption'];
	*/
	function toArray(keys) {
		var startIndex = 1;
		var thisKeys = keys;
		if (!D.utils.dataTypeEquals(thisKeys, 'boolean')) {
			thisKeys = false;
			startIndex = 0;
		}

		var thisArray = [];
		for (var i = startIndex, len = arguments.length; i < len; i++) {
			var args = arguments[i];
			if (!args)
				continue;

			for (var j in args) {
				if (!args.hasOwnProperty(j))
					continue;

				if (thisKeys === true && !(args instanceof Array))
					thisArray.push(j);
				else
					thisArray.push(args[j]);
			}
		}
		return thisArray;
	}
	root.toArray = toArray;

	/**
	* @function {walk} Walk an object, calling a callback for each property. If callback returns **false** the walk will be aborted.
	* @param {Object} {data} Object to walk
	* @param {callback} Callback to be called for every property on the object tree
	* 	@type {Function}
	* 		@param {String} {thisPath} full key path in dot notation (i.e. 'property.child.name')
	* 		@param {Object} {value} Current property value
	* 		@param {String} {key} Key name of current property
	* 		@param {Object} {data} Current property parent object
	*			@return {Boolean} **false** to abort walking
	*		@end
	* @end
	* @return {Boolean|undefined} **false** if walk was canceled (from callback). Undefined otherwise.
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
	}
	root.walk = walk;

	/**
	* @function {flatten} Flatten an object where the returned object's keys are full path notation, i.e:
		{
			my: {},
			my.path: {},
			my.path.to: {},
			my.path.to.key: [],
			my.path.to.key[0]: 'Derp',
			my.path.to.key[1]: 'Hello'
		}
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
	root.flatten = flatten;

	/**
	* @function {ifAny} See if any of the elements in the provided array match the comparison arguments provided
	* @param {Array|Object} {testArray} Array/Object to iterate
	* @param {*} {[args...]} Any object/value to test with strict comparison against elements of "testArray" (testArray[0]===arg[1]||testArray[0]===arg[2]...)
	* @return {Boolean} **true** if ANY elements match ANY provided arguments, **false** otherwise
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
	root.ifAny = ifAny;

	return root;
});
