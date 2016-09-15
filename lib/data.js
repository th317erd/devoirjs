'use strict';

// Helper Functions and utilities
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root, require('./base'));
	};
})(function(root, D) {
	/**
	* Devoir Data Functions
	*
	* @parent devoir
	* @namespace data
	* @static
	*/

	function sortBySubKey(array, negate) {
		var args = arguments;
		return array.sort(function(a, b) {
			var x, y;
			for (var i = 2; i < args.length; i++) {
				var key = args[i];
				var isPath = (key.indexOf('.') > -1);

				if (typeof a === 'object')
					x = (isPath) ? D.prop(a, 'get', key) : a[key];
				else
					x = a;

				if (typeof b === 'object')
					y = (isPath) ? D.prop(b, 'get', key) : b[key];
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
	* Extend (copy) objects into base object. This should ALWAYS be used instead of jQuery.extend
		because it is faster, and more importantly because it WILL NOT mangle instantiated
		sub-objects.
	*
	* @parent devoir.data
	* @method extend
	* @param {Object|Boolean|Number} {[flags]} If a Boolean, specify if this is a deep copy. If an Object, will be considered the first of <b>args</b>. If a Number, this is a bitwise combination of flags. Flags include: D.data.extend.DEEP, D.data.extend.NO_OVERWRITE.
	* @param {Object} {[args]} Objects to copy into base object. First object in the argument list is the base object.
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

		if (dst._mnPropMeta || dst._mnPropAudit)
			D.prop(dst, 'audit', 'update');

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
	* This is not the same as @@devoir.utils.extract.
		It extracts elements from an Array of Objects (not parts from a String).
	*
	* @parent devoir.data
	* @method extract
	* @param {String} {key} Key to extract from all objects
	* @param {Object} {[args]} Array(s) to extract from
	* @return {Object} Array of extracted properties. If the property wasn't found the array element will be 'undefined'.
	* @see devoir.data.toLookup
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

				var val = D.prop(args[j], 'get', key);
				thisArray.push(val);
			}
		}
		return thisArray;
	}
	root.extract = extract;

	/**
	* This takes an Array and returns a reference map for quick lookup.
	*
	* @parent devoir.data
	* @method toLookup
	* @param {String} {key} Key to match on all objects. If key is undefined or null, the index will be used instead.
	* @param {Array} {data} Array to create map from
	* @return {Object} Each key in the object will be the value in the Array specified by 'key'
	* @see devoir.data.extract
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

		var obj = {};
		for (var k in data) {
			if (!data.hasOwnProperty(k))
				continue;

			var v = data[k];
			if (key) {
				var id = D.prop(v, 'get', key);
				if (!id)
					continue;
			} else {
				id = v;
			}

			obj[id] = v;
		}
		return obj;
	}
	root.toLookup = toLookup;

	/**
	* Merge/Facet keys of all objects passed in
	*
	* @parent devoir.data
	* @method mergeKeys
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
	* Convert Object(s) to an Array/Array of keys
	*
	* @parent devoir.data
	* @method toArray
	* @param {Boolean|Object} {[keys]} If key is Boolean than it specifies if the result will be an array of keys (true), or an array of objects (false). Otherwise this is the first object to convert.
	* @param {Object} {[args]} Objects to add to Array
	* @return {Array} If 'keys' is false or an Object, than all array elements will be the properties of the supplied object(s).
		If 'keys' is true, than all array elements will be the keys of all the properties of the supplied object(s).
	* @see devoir.data.extract devoir.data.toLookup
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

	return root;
});
