(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            currentQueue[queueIndex].run();
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){
window.D = require('./index');

},{"./index":3}],3:[function(require,module,exports){
(function(factory) {
	module.exports = factory({});
})(function(root) {
	'use strict';

	require('./lib/base')(root);
	require('./lib/deferred')(root);

	root.data = require('./lib/data')(undefined, root);
	root.utils = require('./lib/utils')(undefined, root);
	root.events = require('./lib/events')(undefined, root);
	root.lang = require('./lib/language')(undefined, root);

	require('./lib/formatters')(root.data, root);
	require('./lib/tokenizer')(root.utils);

	return root;
});

},{"./lib/base":4,"./lib/data":5,"./lib/deferred":6,"./lib/events":7,"./lib/formatters":8,"./lib/language":9,"./lib/tokenizer":10,"./lib/utils":11}],4:[function(require,module,exports){
(function (process){
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	/**
	* Devoir Base Functionality
	*
	* @namespace devoir
	**/

	function uid() {
		return 'U' + (uidCounter++);
	};

	function initMeta(node, namespace) {
	  var metaContext;

	  if (!node.hasOwnProperty('_meta')) {
	  	var thisUID = uid();
	  	metaContext = {'_UID': thisUID, '_aliases': {}};
	  	Object.defineProperty(node, '_meta', {
		    configurable: false,
		    enumerable: false,
		    value: metaContext
	  	});
	  } else {
	  	metaContext = node._meta;
	  }

	  if (arguments.length > 1 && namespace) {
	  	if (!node._meta.hasOwnProperty(namespace)) {
		    metaContext = {};
		    Object.defineProperty(node._meta, namespace, {
		    	configurable: false,
		    	enumerable: false,
		    	value: metaContext
		    });	
	  	} else {
	    	metaContext = metaContext[namespace];
	  	}
	  }

	  return metaContext;
	}

	function initAudit(node) {
	  var timeCreated = getTimeNow();
	  Object.defineProperty(node, '_audit', {
	  	configurable: false,
	  	enumerable: false,
	  	value: {
		  	'base': {created: timeCreated, modified: timeCreated, updateCount: 0},
		  	'_meta': {created: timeCreated, modified: timeCreated, updateCount: 0}
	  	}
	  });
	}

	var uidCounter = 1;
	root.uid = uid;

	var getTimeNow = root.now = (function() {
		if (typeof performance !== 'undefined' && performance.now)
			return performance.now.bind(performance);

		var nanosecondsInMilliseconds = 1000000;
		return function() {
			var hrTime = process.hrtime();
			return (hrTime[0] * 1000) + (hrTime[1] / nanosecondsInMilliseconds);
		};
	})();
	
	//This function is deliberately large and confusing in order to squeeze
	//every ounce of speed out of it
	function prop(cmd, _node, namespace) {
		var node = _node;
		if (!node || !(node instanceof Object))
	  	return;

		var GET = 0x01,
	      SET = 0x02,
	      REMOVE = 0x04,
	      c,
		    isMetaNS = false,
		    isMeta = false,
		    argStartIndex,
		    argStartIndexOne,
		    context,
		    op = ((c = cmd.charAt(0)) === 'g') ? GET : (c === 's') ? SET : REMOVE,
		    finalPath = [];
			
		switch(cmd) {
	    case 'getMetaNS':
	    case 'setMetaNS':
	    case 'removeMetaNS':
				isMetaNS = isMeta = true;
				argStartIndex = 3;
				argStartIndexOne = 4;

				if (!node.hasOwnProperty('_meta') || !node._meta.hasOwnProperty(namespace))
					context = initMeta(node, namespace);
				else
					context = node._meta[namespace];

				finalPath = ['_meta', namespace];

	      break;
	    case 'getMeta':
	    case 'setMeta':
	    case 'removeMeta':
				isMeta = true;
				argStartIndex = 2;
				argStartIndexOne = 3;

				if (!node.hasOwnProperty('_meta'))
					context = initMeta(node);
				else
					context = node._meta;

				finalPath = ['_meta'];

				break;
	    default:
				argStartIndex = 2;
				argStartIndexOne = 3;
				context = node;
				break;
		}

		var prop,
				fullPath = '' + arguments[argStartIndex],
				nextIsArray,
				parts = [];

		//No path
		if (!fullPath) {
			if (op & SET)
				return '';

			if (op & REMOVE)
				return;

			return arguments[argStartIndexOne];
		}

	  //Are there any parts to handle?
	  if (fullPath.indexOf('.') > -1 || fullPath.indexOf('[') > -1) {
	  	if (fullPath.indexOf('\\') > -1)
	  		//If we have character escapes, take the long and slow route
	  		parts = fullPath.replace(/([^\\])\[/g,'$1.[').replace(/([^\\])\./g,'$1..').replace(/\\([.\[])/g,'$1').split('..');
	  	else
	  		//Fast route
	  		parts = fullPath.replace(/\[/g,'.[').split('.');

	  	for (var i = 0, i2 = 1, il = parts.length; i < il; i++, i2++) {
	  		var part = parts[i],
	  				isLast = (i2 >= il),
	  				isArrayIndex = (part.charAt(0) === '[');

	  		//Is this an array index
	  		if (isArrayIndex)
	  			part = part.substring(1, part.length - 1);

	  		//Get prop
	  		prop = context[part];

	  		if (op & REMOVE && isLast) {
	  			//If this is the final part, and we are to remove the item...

	  			if (arguments[argStartIndexOne] === true)
	  				//ACTUALLY delete it if the user forces a delete
	  				delete context[part];
	  			else
	  				//Otherwise do it the performant way by setting the value to undefined
	  				context[part] = undefined;

	  			//Return whatever the value was
	  			return prop;
	  		} else if (op & SET) {
	  			//Are we setting the value?

	  			//If this is the last part, or the value isn't set,
	  			//or it is set but the path continues and it
	  			//needs to be overwritten
	  			if (isLast || (prop === undefined || prop === null || (!isLast && (!(prop instanceof Object) || prop instanceof Number || prop instanceof String || prop instanceof Boolean)))) {
	  				//If the next part is an array, make sure to create an array
	  				nextIsArray = (!isLast && parts[i2].charAt(0) === '[');

	  				//What is our new value?
	  				prop = (isLast) ? arguments[argStartIndexOne] : (nextIsArray) ? [] : {};

	  				//Update context accordingly
	  				if (context instanceof Array && !part) {
	  					isArrayIndex = true;
	  					part = '' + (context.push(prop) - 1);
	  					context = prop;
	  				} else if (part) {
	  					context[part] = prop;
	  					context = prop;
	  				}
	  			} else {
	  				context = prop;
	  			}

	  			if (part)
	  				finalPath.push((isArrayIndex) ? ('[' + part + ']') : part);
	  		} else {
	  			if (prop === undefined || prop === null || ((typeof prop === 'number' || prop instanceof Number) && (isNaN(prop) || !isFinite(prop))))	
	  				return arguments[argStartIndexOne];
	  			context = prop;
	  		}
	  	}
	  } else {
	  	if (op & REMOVE) {
	  		prop = context[fullPath];

	  		if (arguments[argStartIndexOne] === true)
					//ACTUALLY delete it if the user forces a delete
					delete context[part];
				else
					//Otherwise do it the performant way by setting the value to undefined
					context[part] = undefined;

				//Return whatever the value was
				return prop;
	  	} else if (op & SET) {
	  		context[fullPath] = arguments[argStartIndexOne];
	  		return fullPath;
	  	}

	  	prop = context[fullPath];
	  }

	  if (op & GET) {
	  	//Do we need to return the default value?
	  	if (prop === undefined || prop === null || ((typeof prop === 'number' || prop instanceof Number) && (isNaN(prop) || !isFinite(prop))))	
	  		return arguments[argStartIndexOne];
	  	return prop;
	  }

	  if (!node.hasOwnProperty('_audit'))
	    initAudit(node);

	  var lastUpdated = getTimeNow();
	  if (isMeta) {
	  	var m = node._audit.meta;
	    m.modified = lastUpdated;
	    m.updateCount++;
	  } else {
	  	var b = node._audit.base;
	    b.modified = lastUpdated;
	    b.updateCount++;
	  }

	  return (op & SET) ? finalPath.join('.').replace(/\.\[/g, '[') : prop;
	}

	/**
	* Get/set object id. By default every object will have a unique id. This id is stored in the objects meta properties
	*
	* @parent devoir
	* @function id
	* @param {Object} {obj} Object to get / set id from
	* @param {String} {[set]} If specified set object id to this
	* @return {String} Objects id
	* @see devoir.getMeta
	* @see devoir.setMeta
	* @see devoir.get
	* @see devoir.set
	**/
	function id(node, set) {
		if (arguments.length === 0)
			return;

		if (!node.hasOwnProperty('_meta'))
			initMeta(node);

		if (arguments.length === 1)
			return node._meta._UID;

		if (!node.hasOwnProperty('_audit'))
	    initAudit(node);

		node._meta._UID = set;

  	var m = node._audit.meta;
    m.modified = getTimeNow();
    m.updateCount++;

		return set;		
	}
	
	/**
	* Get/set object aliases (from meta properties)
	*
	* @parent devoir
	* @function aliases
	* @param {Object} {obj} Object to get / set aliases from
	* @param {Array|String} {[set]} If specified as an Array, set the entire aliases array to this. If specified as a string, add this alias to the list of aliases
	* @return {Array} List of aliases
	* @see devoir.getMeta
	* @see devoir.setMeta
	**/
	function aliases(node, set) {
		if (arguments.length === 0)
			return;

		if (!node.hasOwnProperty('_meta'))
			initMeta(node);

		if (arguments.length === 1)
			return node._meta._aliases;

		if (!set)
			return;

		if (!node.hasOwnProperty('_audit'))
	    initAudit(node);

		if (set instanceof Array) {
			node._meta._aliases = set;
		} else if (node._meta._aliases.indexOf(set) < 0) {
			node._meta._aliases.push(set);
		}

  	var m = node._audit.meta;
    m.modified = getTimeNow();
    m.updateCount++;

    return node._meta._aliases;
	}

	/**
	* Get audit information on object
	*
	* @parent devoir
	* @function audit
	* @param {Object} {obj} Object to get audit information on
	* @param {String} {[which]} 'meta' or 'base'. If 'meta', get audit information on meta property updates. If 'base', get audit information on base property updates. If neither is specified, get the most recently updated (meta or base, whichever is most recent)
	* @return {Object} Meta information object, i.e {created: (timestamp), modified: (timestamp), updateCount: (count)}
	**/
	function audit(node, _which) {
		if (arguments.length === 0)
			return;

		var which = _which || '*';

		if (!node.hasOwnProperty('_audit'))
			initAudit(node);

		switch(which) {
			case '*':
				var m = node._audit.meta,
						b = node._audit.base;
				return (m.modified > b.modified) ? m : b;
			case 'meta':
				return node._audit.meta;
			case 'base':
				return node._audit.base;
		}
	}

	/**
	* Delete ALL deletable properties from an object. This is useful when
	* you want to "empty" an object while retaining all references to this object.
	*
	* @parent devoir
	* @function empty
	* @param {Object} {obj} Object to "clear"
	* @return {Object} Same object but with all properties removed
	* @note This could possibly have huge performance implications
	**/
	function empty(obj) {
		var keys = Object.keys(obj);
		for (var i = 0, len = keys.length; i < len; i++) {
			var k = keys[i];
			if (k === '_meta' || k === '_audit')
				continue;

			delete obj[k];
		}

		if (obj._meta || obj._audit) {
			if (!obj.hasOwnProperty('_audit'))
				initAudit(obj);

			var b = obj._audit.base;
	    b.modified = getTimeNow();
	    b.updateCount++;
		}
	};

	function setProperty(writable, obj, name, val, set, get) {
		var props = {
			enumerable: false,
			configurable: false
		};

		if (!get) {
			props.value = val;
		} else {
			props.get = get;
		}

		if (set)
			props.set = set;

		if (!get && !set)
			props.writable = writable;

		Object.defineProperty(obj, name, props);
	}

	function ClassBase() {

	}

	ClassBase.prototype = {
		constructor: ClassBase,
		extend: function(props) {
			var keys = Object.keys(props);

			for (var i = 0, il = keys.length; i < il; i++) {
				var key = keys[i];
				this[key] = props[key];
			}
		}
	};

	function newClass(_konstructor, _parent) {
		var konstructor = _konstructor,
				parent = _parent;

		if (!parent)
			parent = ClassBase;

		var sup = parent.prototype,
				proto = Object.create(sup),
				klass = konstructor.call(proto, sup);

		if (!(klass instanceof Function))
			throw new Error("Class builder must return a function");

		proto.constructor = klass;
		klass.prototype = proto;

		klass.extend = function(konstructor, instantiator) {
			return newClass(konstructor, klass, instantiator);
		};

		return klass;
	}

	/**
	* Get a property from an object and all sub-objects by evaluating a dot-notation path into an object.
	*
	* @parent devoir
	* @function get
	* @param {Object} {obj} Object to get property from
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {[defaultValue=undefined]} Specify a default value to return if the requested property is not found, is null, undefined, NaN or !isFinite
	* @return {*} Return property specified by path
	* @see devoir.set
	* @example {javascript}
		var obj = {hello: {world: "!!!"}, arr:[[1,2],3,4,5]};
		devoir.get(obj, 'hello.world'); //!!!
		devoir.get(obj, "some.key.that.doesn't.exist", 'not found'); //not found
		devoir.get(obj, "arr[0][0]"); //1
		devoir.get(obj, "arr[1]"); //3
	**/
	root.get = prop.bind(root, 'get');

	/**
	* Set a property on an object by evaluating a dot-notation path into an object.
	*
	* @parent devoir
	* @function set
	* @param {Object} {obj} Object to set property on
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {value} Value to set
	* @return {String} Return the actual final path (relative to the base object) where the property was set. This is useful if property was pushed into an array; the actual array index will be returned as part of the final path
	* @see devoir.get
	* @note With empty array notation in a specified path (i.e my.array.key[]) the value will be appended to the array specified
	* @example {javascript}
		var obj = {};
		devoir.set(obj, 'hello.world', '!!!'); //hello.world
		devoir.set(set, "arr[]", [1]); //arr[0]
		devoir.set(obj, "arr[0][1]", 2); //arr[0][1]
		devoir.set(obj, "arr[]", 3); //arr[1]
	**/
	root.set = prop.bind(root, 'set');

	/**
	* Get a meta property from an object and all sub-objects by evaluating a dot-notation path into an object. This is the same as @@devoir.get except it is used for object meta properties
	*
	* @parent devoir
	* @function getMeta
	* @param {Object} {obj} Object to get meta property from
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {[defaultValue=undefined]} Specify a default value to return if the requested meta property is not found, is null, undefined, NaN or !isFinite
	* @return {*} Return property specified by path
	* @see devoir.setMeta
	**/
	root.getMeta = prop.bind(root, 'getMeta');

	/**
	* Set a meta property on an object by evaluating a dot-notation path into an object. This is the same as @@devoir.set except it is used for object meta properties
	*
	* @parent devoir
	* @function setMeta
	* @param {Object} {obj} Object to set meta property on
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {value} Value to set
	* @return {String} Return the actual final path (relative to the base object) where the meta property was set. This is useful if meta property was pushed into an array; the actual array index will be returned as part of the final path
	* @see devoir.getMeta
	**/
	root.setMeta = prop.bind(root, 'setMeta');

	/**
	* Get a namespaced meta property from an object and all sub-objects by evaluating a dot-notation path into an object. This is the same as @@devoir.getMeta except that the value is retrieved from a namespace
	*
	* @parent devoir
	* @function getMetaNS
	* @param {Object} {obj} Object to get meta property from
	* @param {String} {namespace} Namespace to store meta property in
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {[defaultValue=undefined]} Specify a default value to return if the requested meta property is not found, is null, undefined, NaN or !isFinite
	* @return {*} Return property specified by path
	* @see devoir.getMeta
	* @see devoir.setMeta
	**/
	root.getMetaNS = prop.bind(root, 'getMetaNS');

	/**
	* Set a namespaced meta property on an object by evaluating a dot-notation path into an object. This is the same as @@devoir.setMeta except that the value is stored in a namespace
	*
	* @parent devoir
	* @function setMetaNS
	* @param {Object} {obj} Object to set meta property on
	* @param {String} {namespace} Namespace to store meta property in
	* @param {String} {path} Dot notation path to evaluate
	* @param {*} {value} Value to set
	* @return {String} Return the actual final path (relative to the base object) where the meta property was set. This is useful if meta property was pushed into an array; the actual array index will be returned as part of the final path
	* @see devoir.getMeta
	**/
	root.setMetaNS = prop.bind(root, 'setMetaNS');

	root.id = id;
	root.aliases = aliases;
	root.audit = audit;
	root.setROProperty = setProperty.bind(root, false);
	root.setRWProperty = setProperty.bind(root, true);
	root.empty = empty;
	root.newClass = newClass;

	return root;
});
}).call(this,require('_process'))
},{"_process":1}],5:[function(require,module,exports){
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

		var obj = {};
		for (var k in data) {
			if (!data.hasOwnProperty(k))
				continue;

			var v = data[k];
			if (key) {
				var id = D.get(v, key);
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

},{"./base":4}],6:[function(require,module,exports){
(function (process){
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';
	
	/**
	* @namespace devoir
	* @class {Deferred} Devoir Deferreds
	**/

	/**
	* @constructor Create a new Deferred. If a callback is provided it will be called as soon as the deferred is fully initialized (on nextTick), or immediately if immediate mode is true.
	* This callback will be provided three arguments which are all functions: resolve, reject, and notify<br>
	* * resolve: is called to resolve this deferred, optionally passing any arguments you wish to resolve the deferred with
	* * reject: is called to reject this deferred, optionally passing any arguments you wish to reject the deferred with
	* * notify: is called to update the progress of this deferred. Normally there would only be one numerical argument in the range 0-1, but any arguments are valid (progress will be set to arguments provided)
	* @param {Function} {callback} Callback function. If specified call as soon as the deferred is created. If the "immediate" flag is specified, call the callback immediately upon construction, otherwise call on "nextTick"
	* @param {[options]} Options object
	* 	@type {Object}
	* 		@property {raw=false} if true, deferred resolution arguments will be passed as a single array to any bound resolution / rejection listeners. By default resolution arguments will be passed directly to any bound listeners in the order provided to "resolve"
	* 		@property {immediate=false} if true, this deferred will call its callback immediately, and also call any listeners immediately upon resolution / rejection. Default is to call callback and listeners on "nextTick"
	* @return {Deferred} A new Deferred instance
	* @example {javascript}
	  function loadFile(fileName) {
	  	var fs = require('fs');
			return new devoir.Deferred(function(resolve, reject) {
				fs.loadFile(fileName, function(err, contents) {
					if (err) {
						reject(err);
						return;
					}

					resolve(contents);
				});
			});	
	  }

	  @example {javascript}
		function longTask() {
			var def = new devoir.Deferred();
			setTimeout(function() {
				def.resolve();
			}, 6000);
			return def.promise();
		}

		@example {javascript}
		function loadFile(fileName) {
	  	var fs = require('fs');
			return new devoir.Deferred(function(resolve, reject) {
				fs.loadFile(fileName, function(err, contents) {
					if (err) {
						reject(err);
						return;
					}

					resolve(contents);
				});
			});	
	  }

		function loadMultipleFiles(fileNames) {
			//Create an array of deferreds
			var deferreds = [];
			for (var i = 0, il = fileNames.length; i < il; i++) {
				deferreds.push(loadFile(fileNames[i]));
			}

      //Create a new deferred that will resolve when all other deferreds have resolved
      //If anyone of the deferreds fail the entire deferred chain will fail
			return devoir.Deferred.all(deferreds);
		}
	**/

	function Deferred(cb, _opts) {
		function newROProperty(name, func, _parent) {
			var parent = _parent || self;
			Object.defineProperty(parent, name, {
				writable: false,
				enumerable: false,
				configurable: false,
				value: func
			});
		}

		function doAllCallbacks(type, callbackObj, args) {
			function doIt() {
				var callbackFunc = callbackObj[type], ret;
				
				if (callbackFunc instanceof Function)
					ret = callbackFunc.apply(self, (raw) ? [args] : args);

				if (ret instanceof Deferred) {
					ret.proxy(callbackObj.deferred);
				} else {
					callbackObj.deferred[type](ret);
				}
			}

			if (immediate)
				doIt();
			else
				process.nextTick(doIt);
		}

		function then(resolve, reject, notify) {
			var def = new Deferred(),
				callbackObj = {
					resolve: resolve,
					reject: reject,
					notify: notify,
					deferred: def
				};

			if (state === 'pending') {
				callbacks.push(callbackObj);
			} else {
				doAllCallbacks((state === 'rejected') ? 'reject' : 'resolve', callbackObj, result);
			}

			return def;
		}

		function statusUpdate(type, currentProgress) {
			if (state !== 'pending')
				return;

			var args = [];

			if (raw) {
				args = currentProgress;
			} else {
				for (var i = 1, len = arguments.length; i < len; i++)
					args.push(arguments[i]);
			}

			if (type === 'notify') {
				progress = currentProgress;
			} else {
				result = args;
				state = (type === 'resolve') ? 'fulfilled' : 'rejected';
			}

			for (var i = 0, len = callbacks.length; i < len; i++) {
				doAllCallbacks.call(self, type, callbacks[i], args);
			}
		}

		if (!(this instanceof Deferred)) {
			var args = [Object.create(Deferred.prototype)];
			for (var j = 0, l = arguments.length; j < l; j++)
				args.push(arguments[j]);

			return Deferred.bind.apply(Deferred, args);
		}

		var self = this,
			opts = (_opts !== undefined) ? _opts : {
				raw: false,
				immediate: false
			},
			state = "pending",
			immediate = opts.immediate,
			raw = opts.raw,
			progress = 0,
			callbacks = [],
			result;

		/**
		* @function {then} Call *successCallback* when deferred resolves (or *errorCallback* if deferred is rejected), passing arguments as provided to @@@devoir.Deferred.resolve (unless the "raw" option is set, and then all arguments will be provided in a single array)
		* @param {Function} {successCallback} Callback function to call when deferred has resolved
		* @param {Function} {[errorCallback]} Callback function to call when deferred is rejected
		* @param {Function} {[notificationCallback]} Callback function to call when deferred gets a notification update
		* @return {Deferred} Return a new deferred that can be used for chaining (if *successCallback* returns a deferred, this deferred wont resolve until the one returned by *successCallback* resolves) 
		**/
		newROProperty('then', then);

		/**
		* @alias {done} function:devoir.Deferred.then
		**/
		newROProperty('done', then);

		/**
		* @function {fail} Call *errorCallback* if deferred is rejected
		* @param {Function} {errorCallback} Callback function to call if deferred is rejected
		* @return {Deferred} A new deferred that can be used for chaining. See @@@devoir.Deferred.then
		**/
		newROProperty('fail', then.bind(self, undefined));

		/**
		* @alias {catch} function:devoir.Deferred.fail
		**/
		newROProperty('catch', then.bind(self, undefined));

		/**
		* @function {notification} Call *notificationCallback* if deferred gets a notification event
		* @param {Function} {notificationCallback} Callback function to call if deferred gets a progress notification event
		* @return {Deferred} A new deferred that can be used for chaining. See @@@devoir.Deferred.then
		**/
		newROProperty('notification', then.bind(self, undefined, undefined));

		/**
		* @function {always} Call *callback* if deferred gets resolved or rejected. Call *notificationCallback* if deferred gets a progress notification
		* @param {Function} {callback} Callback function to call if deferred gets resolved or rejected
		* @param {Function} {[notificationCallback]} Callback function to call if deferred gets a progress notification event
		* @return {Deferred} A new deferred that can be used for chaining. See @@@devoir.Deferred.then
		**/
		newROProperty('always', function(func, notify) {
			return then.call(this, func, func, notify);
		});

		/**
		* @function {resolve} Resolve this deferred with the arguments provided
		* @param {*} {[args...]} Arguments to resolve this deferred with. These will be passed on to any bound resolve callbacks
		* @return {undefined} None
		**/
		newROProperty('resolve', statusUpdate.bind(self, 'resolve'));

		/**
		* @function {reject} Reject this deferred with the arguments provided
		* @param {*} {[args...]} Arguments to reject this deferred with. These will be passed on to any bound reject callbacks
		* @return {undefined} None
		**/
		newROProperty('reject', statusUpdate.bind(self, 'reject'));

		/**
		* @function {notify} Notify this deferred with a progress update (usually a Number between 0 and 1, but is not required to be a number)
		* @param {*} {[args...]} Arguments to notify this deferred with. These will be passed on to any bound notification callbacks
		* @return {undefined} None
		**/
		newROProperty('notify', statusUpdate.bind(self, 'notify'));

		/**
		* @function {promise} Return a special clone deferred object that can be used as a normal "view" into this deferred, but can not be updated / modified (read only)
		* @return {Deferred} A read-only clone of this deferred
		**/
		newROProperty('promise', function() {
			function nullFunc(){}

			var p = Object.create(self);

			newROProperty('resolve', nullFunc, p);
			newROProperty('reject', nullFunc, p);
			newROProperty('notify', nullFunc, p);

			return p;
		});

		/**
		* @function {status} Get the status of this deferred
		* @return {String} **"pending"** if the deferred is still pending, **"fulfilled"** if the deferred has been resolved, or **"rejected"** if the deferred has been rejected
		**/
		newROProperty('status', function() {
			return state;
		});

		/**
		* @alias {state} function:devoir.Deferred.status
		**/
		newROProperty('state', function() {
			return state;
		});

		/**
		* @function {progress} Get the progress for this deferred as set by notifications
		* @return {*} The current progress (usually a Number) of this deferred
		* @see function:devoir.Deferred.notify
		**/
		newROProperty('progress', function() {
			return progress;
		});

		/**
		* @function {proxy} Proxy the resolution / rejection / notifications of this deferred to the deferred specified by *deferred* argument
		* @param {Deferred} {deferred} The deferred to proxy events to
		* @return {Deferred} A new Deferred that can be used for chaining
		* @see function:devoir.Deferred.resolve
		* @see function:devoir.Deferred.reject
		* @see function:devoir.Deferred.notify
		**/
		newROProperty('proxy', function(deferred) {
			function proxyAction(type) {
				var args = [];
				for (var i = 1, len = arguments.length; i < len; i++)
					args.push(arguments[i]);

				return deferred[type].apply(deferred, args);
			}

			return self.then(function() {
				return proxyAction.bind(self, 'resolve').apply(self, arguments);
			}, function() {
				return proxyAction.bind(self, 'reject').apply(self, arguments);
			}, function() {
				return proxyAction.bind(self, 'notify').apply(self, arguments);
			});
		});

		/**
		* @function {immediate} Get/Set this deferred's **"immediate"** mode. In **"immediate"** mode all callbacks are called immediately, instead of "nextTick", which is the default
		* @param {Boolean} {[set]} If specified, set **"immediate"** mode according to boolean value. If not specified, return "immediate" mode state
		* @return {Deferred} If *set* argument is specified, *this* is returned for chaining.
		* @return {Boolean} If *set* is not specified, return the current **"immediate"** mode state
		**/
		newROProperty('immediate', function(set) {
			if (arguments.length === 0)
				return immediate;

			immediate = set;
			return self;
		});

		/**
		* @function {raw} Get/Set this deferred's **"raw"** mode. In **"raw"** mode all callbacks are called with a single array of arguments as the argument to any callbacks instead of passing arguments as supplied to resolve/reject/notify
		* @param {Boolean} {[set]} If specified, set "raw" mode according to boolean value. If not specified, return "raw" mode state
		* @return {Deferred} If *set* argument is specified, *this* is returned for chaining.
		* @return {Boolean} If *set* is not specified, return the current **"raw"** mode state
		**/
		newROProperty('raw', function(set) {
			if (arguments.length === 0)
				return raw;

			raw = set;
			return self;
		});

		if (cb instanceof Function) {
			if (immediate) {
				cb.call(self, self.resolve, self.reject, self.notify);
			} else {
				process.nextTick(function() {
					cb.call(self, self.resolve, self.reject, self.notify);
				});
			}
		} else if (cb instanceof Object) {
			if (cb.hasOwnProperty('immediate'))
				immediate = cb.immediate;

			if (cb.hasOwnProperty('raw'))
				raw = cb.raw;
		}

		return this;
	}

	/**
	* @function {all} This will create a new deferred that waits on the status of ALL deferreds passed to it. If any one of the deferreds is rejected the entire chain is rejected
	* @static
	* @public
	* @param {Array} {deferreds} Array if deferreds to wait on
	* @return {Deferred} A new deferred wrapping all deferreds provided by the argument *deferreds*
	**/
	Deferred.all = function(promises, opts) {
		var resolvedValues = new Array(promises.length),
				resolvedCount = 0;

		return new Deferred(function(resolve, reject, notify) {
			var self = this;
			for (var i = 0, len = promises.length; i < len; i++) {
				(function(_promise, i) {
					var promise = _promise;
					if (!(promise instanceof Deferred))
						promise = Deferred.resolve(promise);

					promise.then(function(val) {
						if (self.status() !== 'pending')
							return;

						var args = [];
						for (var j = 0, l = arguments.length; j < l; j++)
							args.push(arguments[j]);

						resolvedValues[i] = (args.length > 1) ? args : args[0];
						resolvedCount++;

						notify(resolvedCount / len);

						if (resolvedCount >= len)
							resolve.apply(self, (self.raw()) ? [resolvedValues] : resolvedValues);
					}, function() {
						if (self.status() !== 'pending')
							return;

						notify(1);
						reject.apply(self, arguments);
					});
				})(promises[i], i);
			}
		}, opts);
	};

	/**
	* @function {race} This will create a new deferred that waits on the status of ALL deferreds passed to it. This deferred will be resolved/rejected as soon as any one of the deferreds is resolved or rejected
	* @static
	* @public
	* @param {Array} {deferreds} Array if deferreds to wait on
	* @return {Deferred} A new deferred wrapping all deferreds provided by the argument *deferreds*
	**/
	Deferred.race = function(promises, opts) {
		return new Deferred(function(resolve, reject, notify) {
			var self = this;
			for (var i = 0, len = promises.length; i < len; i++) {
				(function(_promise) {
					var promise = _promise;
					if (!(promise instanceof Deferred))
						promise = Deferred.resolve(promise);

					promise.then(function() {
						if (self.status() !== 'pending')
							return;

						notify(1);
						resolve.apply(self, arguments);
					}, function() {
						if (self.status() !== 'pending')
							return;

						notify(1);
						reject.apply(self, arguments);
					});
				})(promises[i]);
			}
		}, opts);
	};

	/**
	* @function {every} This will create a new deferred that waits on the status of ALL deferreds passed to it. This deferred will not resolve / reject until ALL deferreds have resolved / rejected. If anyone of the deferreds has been rejected than the whole chain is rejected
	* @static
	* @public
	* @param {Array} {deferreds} Array if deferreds to wait on
	* @return {Deferred} A new deferred wrapping all deferreds provided by the argument *deferreds*
	**/
	Deferred.every = function(promises, opts) {
		var resolvedValues = new Array(promises.length),
				resolvedCount = 0;

		return new Deferred(function(resolve, reject, notify) {
			var self = this;

			function doCallback(resolvedValues) {
				var isRejected = false;
				for (var i = 0, len = promises.length; i < len; i++) {
					if (promises[i].status() === 'rejected') {
						isRejected = true;
						break;
					}
				}

				if (isRejected)
					reject.apply(self, (self.raw()) ? [resolvedValues] : resolvedValues);
				else
					resolve.apply(self, (self.raw()) ? [resolvedValues] : resolvedValues);
			}

			for (var i = 0, len = promises.length; i < len; i++) {
				(function(_promise, i) {
					var promise = _promise;
					if (!(promise instanceof Deferred))
						promise = Deferred.resolve(promise);

					promise.then(function() {
						if (self.status() !== 'pending')
							return;

						var args = [];
						for (var j = 0, l = arguments.length; j < l; j++)
							args.push(arguments[j]);
						resolvedValues[i] = (args.length > 1) ? args : args[0];

						resolvedCount++;
						notify(resolvedCount / len);

						if (resolvedCount >= len)
							doCallback(resolvedValues);
					}, function() {
						if (self.status() !== 'pending')
							return;
						
						var args = [];
						for (var j = 0, l = arguments.length; j < l; j++)
							args.push(arguments[j]);
						var err = resolvedValues[i] = new Error((args.length > 1) ? args : args[0]);
						err.value = args;
						
						resolvedCount++;
						notify(resolvedCount / len);

						if (resolvedCount >= len)
							doCallback(resolvedValues);
					});
				})(promises[i], i);
			}
		}, opts);
	};

	/**
	* @function {resolve} Create an immediately resolved deferred with any arguments passed to resolve. This is the same as: `var def = new devoir.Deferred(undefined, {immediate: true});def.resolve(args...);`
	* @static
	* @public
	* @param {*} {[args...]} Any arguments you wish to resolve the deferred with
	* @return {Deferred} A new resolved deferred
	**/
	Deferred.resolve = function() {
		var args = [];
		for (var j = 0, l = arguments.length; j < l; j++)
			args.push(arguments[j]);

		return new Deferred(function(resolve, reject, notify) {
			notify(1);
			resolve.apply(this, args);
		}, {immediate: true});
	};

	/**
	* @function {reject} Create an immediately rejected deferred with any arguments passed to reject. This is the same as: `var def = new devoir.Deferred(undefined, {immediate: true});def.reject(args...);`
	* @static
	* @public
	* @param {*} {[args...]} Any arguments you wish to reject the deferred with
	* @return {Deferred} A new rejected deferred
	**/
	Deferred.reject = function() {
		var args = [];
		for (var j = 0, l = arguments.length; j < l; j++)
			args.push(arguments[j]);

		return new Deferred(function(resolve, reject, notify) {
			notify(1);
			reject.apply(this, args);
		}, {immediate: true});
	};

	root.Deferred = Deferred;
	return Deferred;
});

}).call(this,require('_process'))
},{"_process":1}],7:[function(require,module,exports){
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	/** @namespace {devoir} **/
	/** @namespace {events} Devoir event functionality **/

	function generateID() {
		return 'E' + (idCounter++);
	}

	function getEventName(eventName) {
		if (eventName instanceof root.Event)
			return eventName.type;

		var p = ('' + eventName).match(/^([^.]+)/);
		return (p) ? p[1] : undefined;
	}

	function getNamespace(eventName) {
		if (eventName instanceof root.Event)
			return eventName.namespace;

		var ns = (this && this._events) ? this._events._defaultEventNamespace : undefined;

		if (eventName) {
			var p = ('' + eventName).match(/\.(.*)$/);
			if (p) ns = p[1];
		}
		
		return ns;
	}

	function getListeners(_eventName, skipCreate) {
		var eventName = getEventName.call(this, _eventName),
				events = this._events;

		if (!events)
			return;

		var bindings = events._eventBindings,
				listeners = bindings[eventName];

		if (!listeners) {
			if (skipCreate)
				return;

			listeners = bindings[eventName] = [];
		}

		return listeners;
	}

	function getAllListeners(_eventName) {
		var eventName = getEventName.call(this, _eventName),
				namespace = getNamespace.call(this, _eventName),
				events = this._events;

		if (!events)
			return;

		var bindings = events._eventBindings,
				keys = Object.keys(bindings),
				allListeners = [];

		for (var i = 0, il = keys.length; i < il; i++) {
			var key = keys[i],
					listeners = bindings[eventName];

			if (!listeners)
				continue;

			for (var j = 0, jl = listeners.length; j < jl; j++) {
				var listener = listeners[j];
				if (!listener)
					continue;

				if (namespace && namespace !== listener.namespace)
					continue;

				allListeners.push(listener);
			}
		}

		return allListeners;
	}

	function emitToAllListeners(event, listeners, args) {
		var namespace = event.namespace, 
				ret = [];

		for (var i = 0, il = listeners.length; i < il; i++) {
			var listenerObj = listeners[i];

			//Should we halt event chain?
			if (event.halt === true)
				break;

			//If propagate is false, don't propagate to other namespaces
			if (event.propagate === false && listenerObj.namespace !== namespace)
				continue;

			//Call listeners
			ret.push(listenerObj.listener.bind(this, event).apply(this, args));
		}

		return ret;
	}

	function doEmit(thisEvent, listeners, args) {
		//Call listeners
		emitToAllListeners.call(this, thisEvent, listeners, args);

		//Remove all "call-once" listeners
		var onceListeners = [];
		for (var i = 0, il = listeners.length; i < il; i++) {
			var listenerObj = listeners[i];
			if (listenerObj.once)
				onceListeners.push(listenerObj.listener);
		}

		if (onceListeners.length > 0)
			this.removeListener(thisEvent, onceListeners);

		//Call proxies
		var events = this._events,
				proxies = events._eventProxies;

		if (thisEvent.proxy || proxies.length === 0)
			return true;

		for (var i = 0, il = proxies.length; i < il; i++) {
			var proxyObj = proxies[i],
					context = proxyObj.dst,
					filter = proxyObj.filter;

			if (!context)
				continue;

			if (filter) {
				if (typeof filter === 'string' || filter instanceof String) {
					var filterEventName = getEventName.call(this, filter),
							filterNamespace = getNamespace.call(this, filter);

					if (filterEventName && filterEventName !== event.type)
						continue;

					if (filterNamespace && event.namespace !== event.namespace)
						continue;
				} else if ((filter instanceof Function) && filter.call(this, event) !== true)
					continue;
			}

			if (proxyObj.namespace && proxyObj.namespace !== thisEvent.namespace)
				continue;

			context.emit.bind(context, thisEvent).apply(context, args);
		}	

		return true;
	}

	/**
	* @class {Event} Event class to hold event information. An instance of this will be passed as "event" to all bound event listeners
	* @constructor
	* @param {event}
	*		@type {String} Event name
	*		@type {Event} Skip event creation and use this event instance instead
	* @param {[options]}
	* 	@type {Object} Options object for event
	* 		@property {Boolean} {bubbles=true} The event bubbles across namespaces
	*			@property {Object} {origin} Object that emitted the event @end
	*			@property {Boolean} {async=false} This event when emitted is asynchronous
	*		@end
	**/

	function Event(event, _opts) {
		if (event instanceof root.Event)
			return event;

		var opts = _opts || {},
				bubbles = (opts.bubbles !== false),
				origin = opts.origin;

		/** @property {String} {id} Unique id of this event **/
		this.id = generateID();

		/** @property {String} {namespace} Namespace this event was emitted on **/
		this.namespace = getNamespace.call(origin || this, event);

		/** @property {String} {type} Type name of event **/
		this.type = getEventName.call(origin || this, event);

		/** @property {Boolean} {bubbles} Does this event bubble? **/
		this.bubbles = !!bubbles;

		/** @property {Boolean} {propagate} If true then this event will be propagated to all namespaces **/
		this.propagate = this.bubbles;

		this.preventDefault = false;
		this.halt = false;

		/** @property {Boolean} {async} If true then this event will be emitted on nextTick **/
		if (opts.async !== undefined && opts.async !== null)
			this.async = !!opts.async;
		
		/** @property {Object} {origin} The originating object **/
		if (origin)
			this.origin = origin;
	}

	Event.prototype = {
		constructor: Event,
		/** @function {stopImmediatePropagation} Stop all propagation immediately **/
		stopImmediatePropagation: function() {
			this.halt = true;
		},
		/** @function {stopPropagation} Stop propagation. Bound event callbacks in the current namespace will still be called **/
		stopPropagation: function() {
			this.propagate = false;
		},
		/** @function {preventDefault} Set event property "preventDefault" to **true**. This does nothing internally; it is intended to be used with any callbacks that have default actions. **/
		preventDefault: function() {
			this.preventDefault = true;
		}
	};
	root.Event = Event;

	/**
	* @@class {EventEmitter} Base class for all event emitting functionality
	**/

	/**
	* @constructor
	* @param {[options]} Options object
	*		@type {Object}
				@property {Boolean} {async=false} If *true* events will be asynchronous by default
				@property {Object} {eventsObj={}} Object used to hold bound event listeners. Only define this is you need fine grained control over the events
				@@property {Object} {proxyObj=[] Array used to hold proxies. Only define this is you need fine grained control over proxies
			@end
	**/

	function EventEmitter(_opts) {
		var opts = _opts || {},
				eventsObj = opts.eventsObj || {},
				proxyObj = opts.proxyObj || [];
		
		if (!this.hasOwnProperty('_events')) {
			Object.defineProperty(this, '_events', {
				writable: false, enumerable: false, configurable: false,
				value: {}
			});
		}

		var events = this._events;

		Object.defineProperty(events, '_async', {
			writable: false, enumerable: false, configurable: false,
			value: !!opts.async
		});
		
		if (opts.defaultNamespace || typeof events._eventBindings === 'undefined') {
			Object.defineProperty(events, '_defaultEventNamespace', {
				writable: true, enumerable: false, configurable: false,
				value: opts.defaultNamespace
			});
		}

		if (opts.eventsObj || typeof events._eventBindings === 'undefined') {
			Object.defineProperty(events, '_eventBindings', {
				writable: true, enumerable: false, configurable: false,
				value: eventsObj
			});	
		}

		if (opts.proxyObj || typeof events._eventProxies === 'undefined') {
			Object.defineProperty(events, '_eventProxies', {
				writable: true, enumerable: false, configurable: false,
				value: proxyObj
			});	
		}
	}

	EventEmitter.prototype = {
		constructor: EventEmitter,
		createEvent: function(eventName, _opts) {
			if (eventName instanceof root.Event)
				return eventName;

			var opts = Object.create(_opts || {});
			if (!opts.origin)
				opts.origin = this;

			return new root.Event(eventName, opts);
		},
		addListener: function(_eventName, listener, _opts) {
			var eventName = getEventName.call(this, _eventName),
					opts = _opts || {},
					namespace = getNamespace.call(this, _eventName),
					listeners = getListeners.call(this, eventName);

			if (!eventName)
				return this;

			var e = this.createEvent("newListener", {proxy: false, async: false});
			this.emit(e, listener);
			if (e.preventDefault)	
				return this;

			listeners.push({
				event: eventName,
				listener: listener,
				namespace: namespace,
				order: listeners.length,
				once: opts.once
			});

			return this;
		},
		removeListener: function(_eventName, _removeListeners) {
			var removeListeners = _removeListeners || [],
					eventName = getEventName.call(this, _eventName),
					listeners = getListeners.call(this, eventName, true),
					namespace = getNamespace.call(this, _eventName),
					events = this._events;

			if (!listeners || !events)
				return this;

			if (!(removeListeners instanceof Array))
				removeListeners = [removeListeners];

			var e = this.createEvent("removeListener", {proxy: false, async: false}),
					newListeners = [];

			for (var i = 0, il = listeners.length; i < il; i++) {
				var listenerObj = listeners[i];

				if (removeListeners.length > 0 && removeListeners.indexOf(listenerObj.listener) < 0) {
					newListeners.push(listenerObj);
					continue;
				}

				if (namespace && listenerObj.namespace !== namespace) {
					newListeners.push(listenerObj);
					continue;
				}

				e.halt = false;
				e.preventDefault = false;
				e.propagate = true;

				this.emit(e, listenerObj.listener);
				if (e.preventDefault === true) {
					newListeners.push(listenerObj);
					continue;
				}
			}

			if (newListeners.length !== listeners.length) 
				events._eventBindings[eventName] = newListeners;

			return this;
		},
		removeAllListeners: function(event) {
			var events = this._events;
			if (!events)
				return this;

			if (arguments.length === 0) {
				var bindings = events._eventBindings,
						keys = Object.keys(bindings);

				for (var i = 0, il = keys.length; i < il; i++)
					this.removeListener(keys[i]);

				events._eventBindings = {};
				events._eventProxies = {};

				return this;
			}

			return this.removeListener(event);
		},
		listeners: function(event) {
			return getAllListeners.call(this, event, true);
		},
		on: function(_events, listener) {
			var events = _events;
			if (!events)
				return this;

			var isString = (typeof events === 'string' || events instanceof String);
			if (isString || events instanceof Array) {
				if (isString)
					events = events.split(/\s+/g);

				for (var i = 0, il = events.length; i < il; i++) {
					var thisEvent = events[i];
					this.addListener(thisEvent, listener);
				}
			} else if ((events instanceof Object) && !(events instanceof String)) {
				var events = event,
						keys = Object.keys(events);

				for (var i = 0, il = keys.length; i < il; i++) {
					var thisEvent = keys[i],
							thisListener = events[key];

					this.addListener(thisEvent, thisListener);
				}
			}

			return this;
		},
		off: function(event, listener) {
			return this.removeListener(event, listener);
		},
		once: function(event, listener) {
			return this.addListener(event, listener, {once: true});
		},
		emit: function(event) {
			if (arguments.length === 0)
				return false;

			var events = this._events;
			if (!events)
				return false;

			var thisEvent = this.createEvent(event),
					allListeners = getAllListeners.call(this, event, true);
					
			if (allListeners.length === 0)
				return false;

			var args = new Array(arguments.length - 1);
			for (var i = 1, il = arguments.length; i < il; i++)
				args[i - 1] = arguments[i];

			var async = (thisEvent.async === undefined) ? events._async : thisEvent.async;
			if (async) {
				setImmediate(doEmit.bind(this, thisEvent, allListeners, args));
			} else {
				doEmit.call(this, thisEvent, allListeners, args);
			}

			return true;
		},
		proxy: function(dst, filter) {
			var events = this._events;
			if (!events)
				return this;

			if (!dst || !(dst['emit'] instanceof Function))
				return this;

			events._eventProxies.push({
				dst: dst,
				filter: filter
			});

			return this;
		},
		removeProxy: function(dst) {
			var events = this._events;
			if (!events)
				return this;

			var ep = events._eventProxies;
			if (!ep)
				return this;

			var newProxies = [];
			for (var i = 0, il = ep.length; i < il; i++) {
				var thisEP = ep[i];
				if (thisEP.dst === dst)
					continue;

				newProxies.push(thisEP);
			}

			if (newProxies.length !== ep.length)
				events._eventProxies = newProxies;

			return this;
		}
	};

	var idCounter = 0;
	root.EventEmitter = EventEmitter;

	return root;
});

},{}],8:[function(require,module,exports){
// (c) 2016 Wyatt Greenway
// This code is licensed under MIT license (see LICENSE.txt for details)

// Formatter and validator functions
(function(factory) {
	module.exports = function(_root, _base) {
		var root = _root || {},
				base = _base;

		if (!base)
			base = require('./base');

		return factory(root, base);
	};
})(function(root, base) {
	if (!root.formatters) 
		root.formatters = {};

	if (!root.validators) 
		root.validators = {};

	//The format is like so: formatFunc1,formatFunc2(myArg:true),formatFunc3(intArg:6),formatFunc4(strArg:hello world)
  function getFunctionsAndArguments(str) {
    var funcList = [];

    //We aren't actually replacing anything
    //this is a trick to run a function on each regex match
    var funcs = str.replace(/\s*(\w+)\s*(\(.*?\))?\s*/g, function(match, name, args) {
      var currentFunc = {
        name: name,
        args: {}
      };

      if (args) {
        var funcArgs = {};
        args.replace(/\((.*)\)/g, function(match, args) {
          args.replace(/\s*(\w+)\s*:\s*([^,]+)\s*/g, function(match, name, value) {
            var num = parseFloat(value),
                finalValue = value;

            if (!isNaN(num) && isFinite(num))
              finalValue = num;
            else if (value.match(/(true|false)/i))
              finalValue = (value.toLowerCase() === 'true');

            funcArgs[name] = finalValue;
          });
        });

        currentFunc.args = funcArgs;
      }

      funcList.push(currentFunc);
    });

    return funcList;
  }

	function formatterValidatorFunction(funcPool, _funcs, _args) {
		var self = this,
				funcs = _funcs,
				args = _args;

		if (!funcs) {
			funcs = [function(v, o, a) {
				if (o === 'validate') return;
				return v;
			}];
		} else if (base.utils.instanceOf(funcs, 'string', 'array')) {
			if (!(funcs instanceof Array))
				funcs = [funcs];

			var finalFuncs = [];
			for (var i = 0, il = funcs.length; i < il; i++) {
				var func = funcs[i];
				if (base.utils.instanceOf(func, 'string')) {
					var parsedFuncs = getFunctionsAndArguments(func);
					for (var j = 0, jl = parsedFuncs.length; j < jl; j++) {
						var thisFunc = parsedFuncs[j],
								actualFunc = funcPool[thisFunc.name];

						if (actualFunc instanceof Function) {
							(function(name, funcArgs, func) {
								finalFuncs.push(function(val, op, args) {
									return func.call(this, val, op, base.data.extend(true, {}, funcArgs, args));
								});
							})(thisFunc.name, thisFunc.args, actualFunc);
						}
					}
				} else if (func instanceof Function) {
					finalFuncs.push(func);
				}
			}

			funcs = finalFuncs;
		} else if (base.utils.instanceOf(funcs, 'function')) {
			funcs = [funcs];
		} else {
			throw 'Error: Arguments not supported';
		}

		return function(val, op, userArgs) {
			function doNextFunc(val, op, formatterArgs, validateDeferred, index) {
				if (index >= funcs.length) {
					if (op === 'validate') {
						if (validateDeferred.state() === 'pending')
							validateDeferred.resolve();
						return validateDeferred;
					} else {
						return val;
					}
				}

				var func = funcs[index],
						ret = func.apply(this, [val, op, formatterArgs]);

				if (op === 'validate' && ret) {
					if (base.utils.instanceOf(ret, 'deferred')) {
						ret.then(function() {
							doNextFunc.call(this, val, op, formatterArgs, validateDeferred, index + 1);
						}, function error() {
							validateDeferred.reject.apply(validateDeferred, arguments);
						});
					} else {
						validateDeferred.reject(ret);
					}

					return validateDeferred;
				} else if (op !== 'validate' && ret !== undefined)
					val = ret;

				return doNextFunc.call(this, val, op, formatterArgs, validateDeferred, index + 1);
			}

			var formatterArgs = base.data.extend({}, userArgs, args);
			return doNextFunc.call(this, val, op, formatterArgs, (op === 'validate') ? new base.Deferred() : null, 0);
		};
	}

	base.data.extend(true, root, {
		formatterFunction: formatterValidatorFunction.bind(base, base.data.formatters),
		validatorFunction: formatterValidatorFunction.bind(base, base.data.validators),
		formatterExists: function(name) {
			var func = base.data.formatters[name];
			return (func !== undefined);
		},
		validatorExists: function(name) {
			var func = base.data.validators[name];
			return (func !== undefined);
		}
	});

	base.data.extend(true, root.validators, {
		'greater': function(val, op, args) {
			if (!base.utils.instanceOf(val, 'number'))
				return;

			if (!base.utils.instanceOf(args.value, 'number'))
				return;

			if (args.value >= val)
				return ['error', 'Must be larger than ' + args.value];
		},
		'smaller': function(val, op, args) {
			if (!base.utils.instanceOf(val, 'number'))
				return;

			if (!base.utils.instanceOf(args.value, 'number'))
				return;

			if (args.value <= val)
				return ['error', 'Must be smaller than ' + args.value];
		},
		'password': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			if (val.length < 8)
				return ['error', "Password must be at least 8 characters long"];
		},
		'positive': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			if (!base.utils.instanceOf(val, 'number'))
				return;

			if (val < 0)
				return ['error', 'Value must be positive'];
		},
		'required': function(val, op, args) {
			if (val instanceof Array && val.length > 0 && args.connectWith)
				val = val[0];

			if (base.utils.noe(val))
				return ['error', 'Value required'];
		},
		'number': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^-?(?:\d+|\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/;
			if (!re.test(val))
				return ['error', 'Invalid number'];
		},
		'numeric': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^\d+$/;
			if (!re.test(val))
				return ['error', 'Can only be digits'];
		},
		'alphanum': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^\w+$/;
			if (!re.test(val))
				return ['error', 'Must be alpha-numeric'];
		},
		'email': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))){2,6}$/i;
			if (!re.test(val))
				return ['error', 'Invalid email address'];
		},
		'url': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^(https?|s?ftp|git):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
			if (!re.test(val))
				return ['error', 'Invalid URL'];
		},
		'date': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^(\d{4})\D?(0[1-9]|1[0-2])\D?([12]\d|0[1-9]|3[01])$/;
			if (!re.test(val))
				return ['error', 'Invalid date'];
		},
		'phone': function(val, op, args) {
			if (base.utils.noe(val))
				return;

			var re = /^((\+\d{1,3}(-| )?\(?\d\)?(-| )?\d{1,5})|(\(?\d{2,6}\)?))(-| )?(\d{3,4})(-| )?(\d{4})(( x| ext)\d{1,5}){0,1}$/;
			if (!re.test(val))
				return ['error', 'Invalid phone number'];
		}
	});

	base.data.extend(true, root.formatters, {
		'htmlSafe': function(val, op, args) {
			if (op == 'validate')
				return;

			if (val === null || val === undefined || typeof val != 'string')
				val = '';

			var thisStr = '' + val;
			if (thisStr.length === 0)
				return '';

			if (op == 'unformat') {
				return thisStr.replace(/\&\#60\;/g, '<').replace(/\&\#62\;/gi, '>');
			} else if (op == 'format' || op === 'display' || op === 'sort') {
				return thisStr.replace(/</g, '&#60;').replace(/>/gi, '&#62;');
			}
		},
		'default': function(val, op, args) {
			if (op !== 'validate')
				return val;
		},
		'bool': function(val, op, args) {
			if (typeof val == 'number')
				return !!val;

			if (typeof val == 'boolean')
				return val;

			var isTrue = ('' + val).match(/\W*(enabled|true|yes|yea|yeah|affirmative|y|checked|[1-9]+)/i);
			if (op == 'unformat') {
				return (isTrue !== null);
			} else if (op == 'format' || op === 'display' || op === 'sort') {
				return (isTrue) ? 'true' : 'false';
			}
		},
		'time': function(val, op, args) {
			if (op == 'unformat' || op === 'sort') {
				if (base.utils.noe(val))
					return null;

				if (base.utils.instanceOf(val, 'string'))
					val = val.split(',');
				else if (!base.utils.instanceOf(val, 'array'))
					val = [val];

				var finalVal = [];
				for (var i = 0, il = val.length; i < il; i++) {
					var v = val[i],
							format = (base.utils.instanceOf(v, 'number')) ? undefined : args.format,
							m = (args.asUTC) ? moment.utc(v, format) : moment(v, format);

					finalVal.push(m.valueOf());
				}

				if (finalVal.length === 1)
					return finalVal[0];
				return finalVal;
			} else if (op == 'format' || op === 'display') {
				if (base.utils.noe(val))
					return '';

				if (!base.utils.instanceOf(val, 'array'))
					val = [val];

				var finalVal = [];
				for (var i = 0, il = val.length; i < il; i++) {
					var v = val[i],
							format = (args.format) ? args.format : 'HH:mm:ss';
							m = (args.asUTC) ? moment.utc(v) : moment(v);

					finalVal.push(m.format(format));
				}

				return finalVal.join('/');
			}
		},
		'date': function(val, op, args) {
			if (op == 'validate')
				return;

			if (!args)
				args = {};

			var thisArgs = base.data.extend({format: 'MM/DD/YYYY'}, args);
			return base.data.formatters.time(val, op, thisArgs);
		},
		'number': function(val, op, args) {
			if (op == 'unformat' || op === 'sort') {
				if (typeof val == 'number')
					return val;

				if (!base.utils.instanceOf(val, 'string'))
					return val;

				val = parseFloat(('' + val).replace(/[^\d.-]/gi, ''));
				if (isNaN(val))
					val = 0;

				return val;
			} else if (op == 'format' || op === 'display') {
				if (!base.utils.instanceOf(val, 'number', 'string'))
					return val;

				if (base.utils.noe(val))
					return '';

				if (!args)
					args = {};

				var numRound = parseFloat(('' + val).replace(/[^\d.-]/gi, ''));
				if (isNaN(numRound))
					numRound = 0;

				//Range clamping
				var clampHigh, clampLow;
				if (args && args.formatClampRange) {
					var fcr = args.formatClampRange;
					if (fcr instanceof Array) {
						clampHigh = parseFloat(fcr[1]);
						clampLow = parseFloat(fcr[0]);
					} else {
						clampHigh = parseFloat(fcr);
						clampLow = 0;
					}

					if (clampLow !== undefined && isNaN(clampLow))
						clampLow = undefined;

					if (clampHigh !== undefined && isNaN(clampHigh))
						clampHigh = undefined;

					if (clampLow !== undefined && clampHigh !== undefined && clampLow > clampHigh) {
						var tempClamp = clampLow;
						clampLow = clampHigh;
						clampHigh = tempClamp;
					}
				}

				if (clampLow !== undefined && numRound < clampLow)
					numRound = clampLow;

				if (clampHigh !== undefined && numRound > clampHigh)
					numRound = clampHigh;

				//Remember if the number is negative
				var humanExtraChar = '';
				if (args.humanReadable) {
					if (Math.abs(numRound) >= 1000000) {
						numRound /= 1000000;
						humanExtraChar = 'M';
					} else if (Math.abs(numRound) >= 1000) {
						numRound /= 1000;
						humanExtraChar = 'k';
					}
				}

				if (args.decimalPlaces && base.utils.instanceOf(args.decimalPlaces, 'string')) {
					args.decimalPlaces = parseInt(args.decimalPlaces, 10);
					if (isNaN(args.decimalPlaces))
						args.decimalPlaces = 0;
				}

				if (args.numericPlaces && base.utils.instanceOf(args.numericPlaces, 'string')) {
					args.numericPlaces = parseInt(args.numericPlaces, 10);
					if (isNaN(args.numericPlaces))
						args.numericPlaces = 0;
				}

				if (base.utils.instanceOf(args.numericPlaces, 'number') && args.numericPlaces > -1)
					numRound = numRound % Math.pow(10, args.numericPlaces);

				if (args.decimalPlaces === 0) {
					numRound = Math.round(numRound);
				} else {
					numRound = parseFloat(numRound.toFixed(args.decimalPlaces));
				}

				return ((args.noLocale) ? numRound.toString() : numRound.toLocaleString()).replace(/\.(\d+)$/,function(match, fraction) {
					var dl = args.decimalPlaces,
							fl = fraction.length;

					if (fl < dl) {
						var diff = dl - fl;
						return ('.' + fraction) + (new Array(diff + 1)).join('0');
					}

					return ('.' + fraction);
				}) + humanExtraChar;
			}
		},
		'integer': function(val, op, args) {
			if (op == 'validate')
				return;

			if (!args)
				args = {decimalPlaces: 0};
			else
				args.decimalPlaces = 0;

			return base.data.formatters.number(val, op, args);
		},
		'money': function(val, op, args) {
			if (op == 'validate')
				return;

			if (!args)
				args = {decimalPlaces: 2};

			if (args.decimalPlaces === undefined || args.decimalPlaces === null)
				args.decimalPlaces = 2;

			//Format and return
			var numVal = base.data.formatters.number(val, op, args);
			if (base.utils.noe(numVal))
				return '';

			if (op === 'unformat' || op === 'sort')
				return numVal;
			else
				return '$' + numVal;
		},
		'percent': function(val, op, args) {
			if (op == 'validate')
				return;

			if (!args)
				args = {};

			if (args.decimalPlaces === undefined)
				args.decimalPlaces = 2;

			//Format and return
			if (args.humanReadable === true)
				args.humanReadable = false;

			var numVal = base.data.formatters.number(val, op, args);
			if (base.utils.noe(numVal))
				return '';

			if (op === 'unformat' || op === 'sort')
				return numVal;
			else
				return numVal + '%';
		},
		'phone': function(val, op, args) {
			if (op === 'format' || op === 'display') {
				if (!val)
					return '';

				val = ('' + val);
				if (val == null || val.length < 9 || val.length > 11)
					return val;

				var i = (val.length == 11 || val[0] == '1') ? 1 : 0;
				return '(' + val.substr(i, 3) + ') ' + val.substr(i + 3, 3) + '-' + val.substr(i + 6, 4);
			} else if (op === 'unformat' || op === 'sort') {
				if (val == null || val.length == 0)
					return val;

				val = ('' + val).replace(/[^0-9]/g, '');

				if (val.length == 10)
					return '1' + val;
				if (val.length == 11)
					return val;

				return '+' + val;
			}
		},
		'url': function(val, op, args) {
			if (op == 'validate')
				return;

			if (op == 'format' || op === 'display') {
				if (!val) return '';
				if (typeof val != 'string') return '';
				if (('' + val).replace(/\s/gi, '').length == 0) return '';
				if (('' + val).match(/^\w+:\/\//) == null) return 'http://' + val;
				return val;
			} else {
				return val;
			}
		}
	});
});

},{"./base":4}],9:[function(require,module,exports){
// (c) 2016 Wyatt Greenway
// This code is licensed under MIT license (see LICENSE.txt for details)

// Language Helper Functions and utilities
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	function pluralize(_template, _opts) {
    var template = _template,
        opts = _opts || {},
        isPlural = (opts.pluralCount !== 1),
        doPlural = !!opts.plural,
        prettify = !!opts.prettify,
        fullDictionary = opts.dict || {
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
        };

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

	root.pluralize = pluralize;

	return root;
});
},{}],10:[function(require,module,exports){
// (c) 2016 Wyatt Greenway
// This code is licensed under MIT license (see LICENSE.txt for details)

// Devoir Tokenizer 
(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	/**
	* Devoir Tokenizer
	*
	* @parent devoir
	* @class Tokenizer
	**/

	/**
	* The Tokenizer class assists in string parsing by converting strings to arrays of tokens. Tokens consist of a
	* token type, an offset, and optionally one or more values. The Tokenizer has built in helpers for parsing strings, numbers, whitespace, etc...
	* New token "type" parsers can easily be added by the user via RegExp or function.
	* The Tokenizer works by running parts of any provided string through all available
	* token "types" until it finds a match. Tokens "types" are tested against the input string in a specified order.
	*
	* @parent devoir.Tokenizer
	* @function constructor
	* @param {Object} {[options]} Options object. Acceptable properties are:<br>
	* * **skipWS** = false: If true ignore whitespace completely
	* * **tokenTypes** = (default token types): User specified token types. This is an object, whose keys are the name of the "type" specified. Each sub-object contains at least an "order", and a "pattern" property:<br>
	*   * **order**: Numerical order of token type. Token types are sorted by this order (desc) before parsing.
	*   * **pattern**: RegExp or function for pattern matching. Note: @@devoir.Tokenizer.parse internally uses RegExp.exec and tests the offset of each match, meaning all RegExp instances used in pattern matching MUST have the global flag set. If this is a function it takes three arguments: input, offset, lastToken and must return an array for any successful match, or falsy for any non-match.
	*   * **success** (optional): A function to call upon successful match. The arguments to this function are provided as the array returned from a *pattern* match. If the return value is not an object, it will be used as the "value" property of the parsed token. If the return value IS an object, it will be used AS the parsed token (type, offset and other properties will be added by the parser).
	*   * **fail** (optional): A function to call when the match fails
	* * All other properties are added to "this" context of the Tokenizer and parser, and are visible inside each token type pattern matcher.
	* @return {Tokenizer} A new Tokenizer instance, ready for parsing
	* @example {javascript}
	  var tokenizer = new devoir.Tokenizer({
			skipWS: false,
			tokenTypes: {
				'MyCustomHelloTokenType': {
					order: 0, //test our token type before any other token type is tested
					pattern: function(input, offset) {
						//Match any "hello" as a "MyCustomHelloTokenType" token
						if (input.substr(offset, 5).toLowerCase() === 'hello')
							return ['hello'];
					}
				},
				'MyCustomCurlyBraceTokenType': {
					order: 1,
					pattern: /\{([^}]+?)\}/g, //Match anything inside curly braces
					success: function(fullMatch, insideMatch) {
						//Instead of using the "fullMatch" for the token value, use what is inside the curly braces
						return {
							value: insideMatch,
							rawValue: fullMatch
						};
					}
				},
				'MyCustomWhitespaceSkipper': {
					order: 2,
					pattern: /\s+/g,
					success: function() {
						//Don't add this token to the final output
						return this.skip();
					}
				},
				'MyCustomAbortOperation': {
					order: 3,
					pattern: /<<<end>>>/g,
					success: function() {
						//Any time we match an "<<<end>>>" in our input, immediately
						//abort all remaining parsing
						return this.abort();
					}
				}
			}
	  });

	  var tokens = tokenizer.parse("some stuff hello {value here} more stuff <<<end>>> none of this will ever be reached by the parser");
	**/
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
		SKIP: function SKIP(val){this.value = val;},
		/**
		* Match parsed tokens, starting at offset, skipping any token "types" specified in *skipTypes*
		*
		* @parent devoir.Tokenizer
		* @function match
		* @param {Number} {offset} Offset into parsed tokens to start matching at
		* @param {String|Array} {match} String value, or Array of tokens to match against. If a string is specified, each token.value is added to a string and tested against *match* for a match. If an array is specified, the array must contain an object or a function at each index; each object must the keys you wish to match against (such as "type", and/or "value", etc...) to match each token against. If a function is found, it is called with a single argument "token"; the match will fail if anything other than "true" is returned
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of string will be skipped during the match
		* @param {Boolean} {[caseInsensitive]} If true, match will be case insensitive (only applies to String *match* matches)
		* @return {Boolean} True if match was successful, false otherwise
		* @example {javascript}
			var tokenizer = new devoir.Tokenizer({
				skipWS: false
			});

			tokenizer.parse("hello = world");

			//Test match, skipping WhiteSpace tokens
			tokenizer.match(0, "hello=world", ['WhiteSpace']); //true

			tokenizer.match(0, [
				{
					type: 'Identifier',
					value: 'hello'
				},
				{
					type: 'Punctuation',
					value: '='
				},
				{
					type: 'Identifier',
					value: 'world'
				}
			], ['WhiteSpace']); //true
		**/
		match: function match(offset, _match, _skipTypes, _caseInsensitive) {
			return this.matchTokens(this.tokens, _match, _skipTypes, _caseInsensitive, offset);
	  },
	  /**
		* Match parsed tokens, skipping any token "types" specified in *skipTypes*. This is the same as @@devoir.Tokenizer.match except the tokens are provided via *tokens* argument instead of using the tokens gathered by the parser
		*
		* @parent devoir.Tokenizer
		* @function matchTokens
		* @param {Array} {tokens} Array of tokens to match against
		* @param {String|Array} {match} String value, or Array of tokens to match against. If a string is specified, each token.value is added to a string and tested against *match* for a match. If an array is specified, the array must contain an object or a function at each index; each object must the keys you wish to match against (such as "type", and/or "value", etc...) to match each token against. If a function is found, it is called with a single argument "token"; the match will fail if anything other than "true" is returned
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of string will be skipped during the match
		* @param {Boolean} {[caseInsensitive]} If true, match will be case insensitive (only applies to String *match* matches)
		* @param {Number} {[offset]} Offset into array to start matching
		* @return {Boolean} True if match was successful, false otherwise
		**/
	  matchTokens: function(tokens, _match, _skipTypes, _caseInsensitive, _offset) {
	  	function matchAllKeys(obj1, obj2) {
	  		var keys = Object.keys(obj2);
	  		for (var i = 0, il = keys.length; i < il; i++) {
	  			var key = keys[i];
	  			if (obj1[key] !== obj2[key])
	  				return false;
	  		}

	  		return true;
	  	}

	  	var offset = _offset || 0,
	  			match = _match,
	  			skipTypes = _skipTypes;

	  	if (skipTypes && !(skipTypes instanceof Array))
	  		skipTypes = [skipTypes];

			if (offset >= tokens.length)
				return false;

			if (root.instanceOf(match, 'string')) {
				var parts = [], len = 0;
				for (var i = offset, il = tokens.length; i < il; i++) {
					var token = tokens[i];
					parts.push(token.value);
					len += token.value.length;

					if (len >= match.length)
						break;
				}

				var s1 = parts.join('').substring(0, match.length),
						s2 = match;

				if (_caseInsensitive === true) {
					s1 = s1.toLowerCase();
					s2 = s2.toLowerCase();
				}

				return (s1 === s2);
			} else if (root.instanceOf(match, 'array')) {
				for (var j = 0, i = offset, il = tokens.length; i < il; i++, j++) {
					if (j >= match.length)
						break;

					var token = tokens[i],
							matchPart = match[j];
					
					if (matchPart instanceof Function && matchPart.call(this, token) !== true)
						return false;
					else if (!matchAllKeys(token, matchPart))
						return false;
				}

				return true;
			}

	    return true;
	  },
	  /**
		* Join all token "value"s (or "rawValue"s if value doesn't exist) specified by range into a single String
		*
		* @parent devoir.Tokenizer
		* @function join
		* @param {Number} {[startOffset=0]} Offset into tokens array to start joining
		* @param {Number} {[endOffset=(end of token array)]} Non-inclusive offset into tokens array to stop joining
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of strings will be skipped during the match
		* @return {String} All tokens(.value || .rawValue) joined into a string
		**/
	  join: function(_startOffset, _endOffset, _skipTypes) {
	  	return this.joinTokens(this.tokens, _startOffset, _endOffset, _skipTypes);
	  },
	  /**
		* Join all token "value"s (or "rawValue"s if value doesn't exist) specified by range into a single String. This is the same as @@devoir.Tokenizer.join except the tokens are provided via the *tokens* argument
		*
		* @parent devoir.Tokenizer
		* @function joinTokens
		* @param {Array} {tokens} Array of tokens to join
		* @param {Number} {[startOffset=0]} Offset into tokens array to start joining
		* @param {Number} {[endOffset=(end of token array)]} Non-inclusive offset into tokens array to stop joining
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of strings will be skipped during the match
		* @return {String} All tokens(.value || .rawValue) joined into a string
		**/
	  joinTokens: function(tokens, _startOffset, _endOffset, _skipTypes) {
	  	var val = [],
	  			token,
	  			startOffset = _startOffset,
	  			endOffset = _endOffset,
	  			skipTypes = _skipTypes;

	  	if (skipTypes && !(skipTypes instanceof Array))
	  		skipTypes = [skipTypes];

	  	if (!startOffset)
	  		startOffset = 0;

	  	if (!endOffset)
	  		endOffset = tokens.length;

	    for (var i = startOffset, len = tokens.length; i < len && i < endOffset; i++) {
	      token = tokens[i];

	      if (skipTypes && skipTypes.indexOf(token.type) > -1)
	      	continue;

	      val.push(token.rawValue || token.value);
	    }

	    return val.join('');
	  },
	  /**
		* Get *count* number of tokens starting from *offset*. A negative *offset* gets the tokens starting from the end of the token array and working backwards; -0 is the last token in the array.
		*
		* @parent devoir.Tokenizer
		* @function get
		* @param {Number} {count} Number of tokens to retrieve
		* @param {Number} {[offset=0]} Offset into tokens array to start. A negative offset starts from the end of the token array and moves backwards. -0 is the last token in the array.
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of strings will be skipped
		* @return {Array} Array of tokens
		**/
	  get: function(_count, _offset, _skipTypes) {
	  	return this.getTokens(this.tokens, _count, _offset, _skipTypes);
	  },
	  /**
		* Get *count* number of tokens starting from *offset*. A negative *offset* gets the tokens starting from the end of the token array and working backwards; -0 is the last token in the array.
		* This is the same as @@devoir.Tokenizer.get except the tokens are provided via the *tokens* array instead of from the parser
		*
		* @parent devoir.Tokenizer
		* @function getTokens
		* @param {Array} {tokens} Tokens to retrieve from
		* @param {Number} {count} Number of tokens to retrieve
		* @param {Number} {[offset=0]} Offset into tokens array to start. A negative offset starts from the end of the token array and moves backwards. -0 is the last token in the array.
		* @param {Array of String} {[skipTypes]} If specified, any "type" string in this array of strings will be skipped
		* @return {Array} Array of tokens
		**/
		getTokens: function(tokens, _count, _offset, _skipTypes) {
			if (!tokens || tokens.length === 0)
				return [];

			var offset = isNaN(_offset) ? 0 : _offset,
					count = _count || 1,
					skipTypes = _skipTypes,
					capturedTokens = [];

			if (skipTypes && !(skipTypes instanceof Array))
	  		skipTypes = [skipTypes];

	  	//Test for negative offset, including negative zero
	  	if ((1/offset) < 0) {
	  		for (var i = tokens.length + (offset - 1); i >= 0; i--) {
					var token = tokens[i];

					if (skipTypes && skipTypes.indexOf(token.type) >= 0)
						continue;

					capturedTokens.push(token);
					if (capturedTokens.length >= count)
						break;
				}

				return capturedTokens.reverse();
	  	} else {
	  		for (var il = tokens.length, i = offset; i < il; i++) {
					var token = tokens[i];

					if (skipTypes && skipTypes.indexOf(token.type) >= 0)
						continue;

					capturedTokens.push(token);
					if (capturedTokens.length >= count)
						break;
				}

				return capturedTokens;
	  	}
		},
		/**
		* Return the absolute offset into the tokens array for any token matching any one of *types*
		*
		* @parent devoir.Tokenizer
		* @function indexOf
		* @param {Array of String} {types} Types of tokens to stop at. If any type starts with an exclamation point (i.e. "!WhiteSpace"), then the match will be negated (i.e "!WhiteSpace" will match anything other than "WhiteSpace")
		* @param {Number} {[offset=0]} Offset into tokens array to start. A negative offset starts from the end of the token array and moves backwards. -0 is the last token in the array.
		* @return {Number} Absolute offset where match is found, or -1 if no match is found
		**/
	  indexOf: function(_types, _offset) {
	  	return this.indexOfTokens(this.tokens, _types, _offset);
	  },
	  /**
		* Return the absolute offset into the *tokens* array for any token matching any one of *types*. This is the same as @@devoir.Tokenizer.indexOf except the tokens are provided via the *tokens* argument instead of via the parser
		*
		* @parent devoir.Tokenizer
		* @function indexOfTokens
		* @param {Array} {tokens} Array of tokens to search
		* @param {Array of String} {types} Types of tokens to stop at. If any type starts with an exclamation point (i.e. "!WhiteSpace"), then the match will be negated (i.e "!WhiteSpace" will match anything other than "WhiteSpace")
		* @param {Number} {[offset=0]} Offset into tokens array to start. A negative offset starts from the end of the token array and moves backwards. -0 is the last token in the array.
		* @return {Number} Absolute offset where match is found, or -1 if no match is found
		**/
	  indexOfTokens: function(tokens, _types, _offset) {
	  	function isType(types, token) {
	  		var tokenType = token.type;
	  		for (var i = 0, il = types.length; i < il; i++) {
	  			var type = types[i],
	  					negate = (type.charAt(0) === '!');

	  			if (negate) {
	  				type = type.substring(1);
	  				if (tokenType !== type)
	  					return true;
	  			} else if (type === tokenType)
	  				return true;
	  		}

	  		return false;
	  	}

	    var tokens = this.tokens,
	    		types = _types,
	    		offset = _offset || 0;

	    if (!(types instanceof Array))
	      types = [types];

	    if ((1/offset) < 0) {
	  		for (var i = tokens.length + (offset - 1); i >= 0; i--) {
					var token = tokens[i];
					if (isType(types, token))
						return i;
				}
			} else {
				for (var il = tokens.length, i = offset; i < il; i++) {
					var token = tokens[i];
					if (isType(types, token))
						return i;
				}
			}

	    return -1;
	  },
		constructor: Tokenizer,
		/**
		* Parse an *input* string and convert it into an array of tokens
		*
		* @parent devoir.Tokenizer
		* @function parse
		* @param {String} {input} String to parse
		* @param {Number} {[offset=0]} Offset into string to start parsing
		* @param {Array} {[tokenTypes]} Token types to use **instead** of token types Tokenizer was constructed with
		* @return {Array} Array of parsed tokens
		**/
		parse: function(input, _offset, _tokenTypes) {
			function eatWhiteSpace(input, _offset) {
				var offset = (_offset) ? _offset : 0;
				var wsRE = /\s+/g;
				wsRE.lastIndex = offset;
				var match = wsRE.exec(input);

				if (!match || match.index !== offset)
					return offset;

				return wsRE.lastIndex;
			}

			function getToken(tokenTypes, input, _offset, previousToken) {
				var offset = (_offset) ? _offset : 0;
				if (offset >= input.length)
					return null;

				if (skipWS)
					offset = eatWhiteSpace(input, offset);

				var context = this;

				for (var i = 0, len = tokenTypes.length; i < len; i++) {
					var tokenType = tokenTypes[i],
							pattern = tokenType.pattern, 
							success = tokenType.success,
							fail = tokenType.fail,
							newOffset = offset,
							match;

					if (!pattern)
						continue;

					if (pattern instanceof Function) {
						match = pattern.call(context, input, offset, previousToken);
						
						if (match instanceof Tokenizer.prototype.ABORT)
							return null;

						if (match instanceof Tokenizer.prototype.SKIP)
							match = match.value;

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
						
						tokenValue.type = tokenType.type;
						tokenValue.order = tokenType.order;
						tokenValue.offset = offset;

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
					context = Object.create(this),
					tokenTypes = _tokenTypes;
			
			if (!tokenTypes) {
				tokenTypes = this.tokenTypes;
			} else {
				tokenTypes = tokenTypes.sort(function(a,b) {
					var x = a.order, y = b.order;
					return (x == y) ? 0 : (x < y) ? -1 : 1;
				});
			}

			context.abort = function() {
				return new Tokenizer.prototype.ABORT();
			};

			context.skip = function(match) {
				return new Tokenizer.prototype.SKIP(match);
			};

			this.tokens = tokens;
			this.input = input;

			while((token = getToken.call(context, tokenTypes, input, offset, token.value))) {
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
						value: rawValue,
						rawValue: match
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
},{}],11:[function(require,module,exports){
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
	function snapToGrid(num, segmentSize, _func) {
		var func = _func;
		if (!func)
			func = Math.round;

		if (instanceOf(func, 'string'))
			func = Math[func];

		return func(segmentSize * func(num / segmentSize));
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
			return ('' + tempStr).replace(/\b(\w)/gi, function(a, x) { return '' + x.toUpperCase(); });
		} else {
			return ('' + tempStr).replace(/^([^\w]*)(\w)/gi, function(a, x, y) { return x + y.toUpperCase(); });
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

},{"./base":4}]},{},[2]);
