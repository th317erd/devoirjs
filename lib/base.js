(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	function uid() {
		return 'U' + (uuidCounter++);
	};

	function initMeta(node, namespace) {
		var metaContext;

		if (!node.hasOwnProperty('_meta')) {
			var thisUUID = '' + uid();
			metaContext = {'_internalID': thisUUID, '_UUID': thisUUID, '_UUIDs': {}};
			Object.defineProperty(node, '_meta', {
				configurable: false,
				enumerable: false,
				value: metaContext
			});
		} else {
			metaContext = node._meta;
		}

		if (namespace !== undefined) {
			if (!node._meta.hasOwnProperty(namespace)) {
				metaContext = {};
				Object.defineProperty(node._meta, namespace, {
					configurable: false,
					enumerable: false,
					value: metaContext
				});	
			} else {
				metaContext = node._meta[namespace];
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
			'*': {created: timeCreated, lastUpdated: timeCreated, updateCount: 0},
			'base': {created: timeCreated, lastUpdated: timeCreated, updateCount: 0},
			'_meta': {created: timeCreated, lastUpdated: timeCreated, updateCount: 0}
			}
		});
	}

	function isArrayIndex(part) {
		var arrayParts = part.match(/\[(\w+)\]/);
		if (arrayParts) {
			part = parseInt(arrayParts[1], 10);
			if (!isNaN(part))
				return part;
		}
		return false;
	}

	var uuidCounter = 1;
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
	/**
	* Evaluate a dot-notation path into a object. Get/set property, get/set meta information, get/set object id, get audit information.
	*
	* @parent devoir
	* @method prop
	* @param {Object} {node} Object to get/set from
	* @param {String} {cmd} Command to use for this operation: 'get', 'set', 'getMeta', 'setMeta', 'getID', 'setID', 'getAliases', 'setAliases', 'audit', 'auditMeta'
	* @param {...} [args] Arguments per command (cmd)
	* @return {*} Return depends on command (cmd) being preformed.
	* @note cmd === 'get' gets a key from the node. Arguments are: [node, 'get', path, defaultValue]
	* @note cmd === 'set' sets a key on the node. Arguments are: [node, 'get', path, value]
	* @note cmd === 'getMeta' gets a key from the node's meta info. Arguments are: [node, 'getMeta', path, defaultValue]
	* @note cmd === 'setMeta' sets a key on the node's meta info. Arguments are: [node, 'setMeta', path, value]
	* @note cmd === 'getID' gets the node's id. Arguments are: [node, 'getID']
	* @note cmd === 'setID' sets the node's id. Arguments are: [node, 'setID', newID]
	* @note cmd === 'getAliases' gets all node aliases. Arguments are: [node, 'getAliases']
	* @note cmd === 'setAliases' sets ADDS node aliases. Arguments are: [node, 'setAliases', [...]]
	* @note cmd === 'audit' gets audit information from node. Arguments are: [node, 'audit', valueKey]
	* @note cmd === 'auditMeta' gets meta audit information. Arguments are: [node, 'auditMeta', valueKey]
	*/
	//This function is deliberately large and confusing in order to squeeze
	//every ounce of speed out of it
	root.prop = function(_node, cmd, namespace) {
		var node = _node;
		if (!node || !cmd || !(node instanceof Object))
			node = {};

		var isMetaNS = (cmd === 'getMetaNS' || cmd === 'setMetaNS' || cmd === 'removeMetaNS');
		var isMeta = (isMetaNS || cmd === 'getMeta' || cmd === 'setMeta' || cmd === 'removeMeta');
		var argStartIndex = (isMetaNS) ? 3 : 2, argStartIndexOne = argStartIndex + 1;

		if (cmd === 'get' || cmd === 'set' || cmd === 'remove' || isMeta) {
			var context, lastContext;

			if (isMetaNS) {
				if (!node.hasOwnProperty('_meta') || 
						!node._meta.hasOwnProperty(namespace))
					context = initMeta(node, namespace);
				else
					context = node._meta[namespace];
			} else if (isMeta) {
				if (!node.hasOwnProperty('_meta'))
					context = initMeta(node);
				else
					context = node._meta;
			} else {
				context = node;
			}

			if (!context)
				return context;

			var op, prop, lastPart, fullPath = '' + arguments[argStartIndex];
			if (!fullPath)
				return arguments[argStartIndexOne];

			if (cmd === 'get' || cmd === 'getMeta' || cmd === 'getMetaNS')
				op = 0x1; //Get
			else if (cmd === 'set' || cmd === 'setMeta' || cmd === 'setMetaNS')
				op = 0x2; //Set
			else
				op = 0x4; //Remove

			if (fullPath.match(/[\[\]\.]/)) {
				var parts = fullPath.split(/(\[\w+\]|\.+)/);
				if (!parts)
					parts = [];

				for (var i = 0, i2 = 1, len = parts.length; i < len; i++, i2++) {
					var partName = parts[i];
					if (!partName || partName === '.')
						continue;

					prop = context[partName];

					if (op&0x2&&(prop===undefined||!(prop instanceof Object))) {
						var nextIsArray = (i2 < len) ? isArrayIndex(parts[i2]) : false;
						context[partName] = prop = (nextIsArray !== false) ? [] : {};
						if (nextIsArray !== false) {
							context[partName] = prop = [];
							prop.length = nextIsArray + 1;//.value;
						} else {
							context[partName] = prop = {};
						}
					}

					lastPart = partName;
					lastContext = context;
					context = prop;

					if (!context)
						break;
				}
			} else {
				var part = fullPath;
				prop = context[part];
				lastContext = context;
				lastPart = part;
			}

			if (op&0x1&&(prop===undefined||prop===null)&&arguments.length > argStartIndexOne)
				prop = arguments[argStartIndexOne];
			else if (op&0x2&&lastPart&&lastContext) {
				if (lastContext instanceof Array) {
					var lastPartInt = lastPart;//.value;
					if (!(typeof lastPartInt === 'number' || lastPartInt instanceof Number)) {
						lastPartInt = isArrayIndex(lastPartInt);
						if (lastPartInt === false)
							lastPartInt = -1;
					}

					if (lastContext.length < (lastPartInt + 1))
						lastContext.length = lastPartInt + 1;
				}

				prop = lastContext[lastPart] = arguments[argStartIndexOne];
			} else if (op&0x4&&lastPart&&lastContext) {
				if (arguments[argStartIndexOne] === true) {
					//Actually delete if asked to
					delete lastContext[lastPart];
				} else {
					//Default: Set to undefined instead of using 'delete'
					//for performance reasons
					lastContext[lastPart] = undefined;
				}
			}

			//Set or remove... update audit info
			if (op & 0x6) {
				if (!node.hasOwnProperty('_audit'))
					initAudit(node);

				var lastUpdated = getTimeNow();
				if (isMeta)
					node._audit._meta.lastUpdated = lastUpdated;
				else
					node._audit.base.lastUpdated = lastUpdated;

				node._audit['*'].lastUpdated = lastUpdated;
			}

			return prop;
		} else if (cmd === 'getID') {
			if (!node.hasOwnProperty('_meta'))
				initMeta(node);

			return node._meta._UUID;
		} else if (cmd === 'getInternalID') {
			if (!node.hasOwnProperty('_meta'))
				initMeta(node);

			return node._meta._internalID;
		} else if (cmd === 'setID') {
			if (!node.hasOwnProperty('_meta'))
				initMeta(node);

			if (!node.hasOwnProperty('_audit'))
				initAudit(node);
			
			node._audit._meta.lastUpdated = getTimeNow();
			node._audit['*'].lastUpdated = lastUpdated;

			return node._meta._UUID = '' + arguments[2];
		} else if (cmd === 'getAliases') {
			if (!node.hasOwnProperty('_meta'))
				initMeta(node);

			return node._meta._UUIDs || [];
		} else if (cmd === 'setAliases') {
			if (!node.hasOwnProperty('_meta'))
				initMeta(node);

			var aliases = arguments[2];
			if (aliases === undefined || aliases === null)
				return;

			var uuids = node._meta._UUIDs;
			if (!(aliases instanceof Array)) {
				uuids['' + aliases] = '' + aliases;
			} else {
				for (var i = 0, len = aliases.length; i < len; i++) {
					var thisAlias = aliases[i];
					if (thisAlias === undefined || thisAlias === null)
						continue;
					uuids[thisAlias] = thisAlias;
				}
			}

			if (!node.hasOwnProperty('_audit'))
				initAudit(node);

			node._audit._meta.lastUpdated = getTimeNow();
			node._audit['*'].lastUpdated = lastUpdated;

			return uuids;
		} else if (cmd === 'audit' || cmd === 'auditMeta') {
			if (!node.hasOwnProperty('_audit'))
				initAudit(node);

			var isMeta = (cmd.match(/meta$/i));
			if (isMeta && !node.hasOwnProperty('_meta'))
				initMeta(node);

			if (namespace === 'update') {
				var now =  getTimeNow();
				node._audit['base'].lastUpdated = now;
				node._audit['*'].lastUpdated = now;
			}

			var context = (isMeta) ? node._audit._meta : node._audit.base;
			if (arguments.length < 3)
				return context;

			if (arguments.length < 4)
				return context[arguments[2]];

			return context[arguments[2]] = arguments[3];
		} else if (cmd === 'define') {
			if (!arguments[2]) {
				initMeta(node);
				initAudit(node);
				return;
			}

			var meta = arguments[2]['meta'], audit = arguments[2]['audit'];
			if (meta) {
				Object.defineProperty(node, '_meta', {
					configurable: false,
					enumerable: false,
					value: meta
				});
			}

			if (audit) {
				Object.defineProperty(node, '_audit', {
					configurable: false,
					enumerable: false,
					value: audit
				});
			}
		}
	};

	root.copyObject = function(node, _dst, _deep) {
		var dst = _dst, deep = !!_deep;
		if (typeof dst === 'boolean' || dst instanceof Boolean) {
			deep = dst;
			dst = {};
		}

		if (!dst)
			dst = {};

		if (node.hasOwnProperty('_meta')) {
			Object.defineProperty(dst, '_meta', {
				configurable: false,
				enumerable: false,
				value: root.data.extend(true, {}, node._meta)
			});

			var thisUUID = '' + uid();
			dst._meta._internalID = thisUUID;
			dst._meta._UUID = thisUUID;
		}
		initAudit(dst);
		return root.data.extend(deep, dst, node);
	};

	root.cloneObject = function(node, _dst, _deep) {
		var dst = _dst, deep = !!_deep;
		if (typeof dst === 'boolean' || dst instanceof Boolean) {
			deep = dst;
			dst = {};
		}

		if (!dst)
			dst = {};

		if (node.hasOwnProperty('_meta')) {
			Object.defineProperty(dst, '_meta', {
				configurable: false,
				enumerable: false,
				value: node._meta
			});
		}

		initAudit(dst);
		return root.data.extend(deep, dst, node);
	};

	root.shadowCopy = function(node, _dst) {
		var dst = _dst;
		if (!dst)
			dst = {};

		if (!dst.hasOwnProperty('_meta') && node.hasOwnProperty('_meta')) {
			Object.defineProperty(dst, '_meta', {
				configurable: false,
				enumerable: false,
				value: node._meta
			});
		}

		dst._meta._internalID = '' + uid();

		return dst;
	};

	/**
	* Delete ALL deletable properties from an object. This is useful when
	* you want to "empty" an object while retaining all references to this object.
	*
	* @parent devoir
	* @method clearObject
	* @param {Object} obj Object to "clear"
	* @return {Object} Same object but with all properties removed
	* @note This can possibly have huge performance implications
	*/
	root.clearObject = function(obj) {
		var keys = Object.keys(obj);
		for (var i = 0, len = keys.length; i < len; i++) {
			var k = keys[i];
			if (k === '_meta' || k === '_audit')
				continue;

			delete obj[k];
		}

		if (obj._meta || obj._audit)
			root.prop(obj, 'audit', 'update');
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

	root.setROProperty = setProperty.bind(root, false);
	root.setRWProperty = setProperty.bind(root, true);

	return root;
});