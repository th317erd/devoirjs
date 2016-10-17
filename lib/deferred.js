(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';
	
	/**
	* @namespace devoir
	* @class Deferred
	* @desc Devoir Deferreds
	* 
	**/

	/**
	* Create a new Deferred. If a callback is provided it will be called as soon as the deferred is fully initialized (on nextTick), or immediately if immediate mode is true.
	* This callback will be provided three arguments which are all functions: resolve, reject, and notify<br>
	* * resolve: is called to resolve this deferred, optionally passing any arguments you wish to resolve the deferred with
	* * reject: is called to reject this deferred, optionally passing any arguments you wish to reject the deferred with
	* * notify: is called to update the progress of this deferred. Normally there would only be one numerical argument in the range 0-1, but any arguments are valid (progress will be set to arguments provided)
	*
	* @constructor
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
						resolvedValues[i] = new Error((args.length > 1) ? args : args[0]);

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
