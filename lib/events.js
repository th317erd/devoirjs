(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';

	/** @namespace events **/

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
	* Event class to hold event information. An instance of this will be passed as "event" to all bound event listeners
	*
	* @parent devoir
	* @class Event
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

	/**
	* Base class for all event emitting functionality
	*
	* @parent devoir
	* @class EventEmitter
	**/

	/**
	* Base class for all event emitting functionality
	*
	* @function constructor
	* @param {Object} {[options]} Options object
	**/

	/**
	* Options object for instantiation of EventEmmitter
	*
	* @define argument.options
	* @dataType Object
	* @property {Boolean} {async} If true, all events will default to asynchronous behavior
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

	Event.prototype = {
		constructor: Event,
		stopImmediatePropagation: function() {
			this.halt = true;
		},
		stopPropagation: function() {
			this.propagate = false;
		},
		preventDefault: function() {
			this.preventDefault = true;
		}
	};
	root.Event = Event;

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
