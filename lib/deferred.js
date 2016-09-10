(function(factory) {
	module.exports = function(_root) {
		var root = _root || {};
		return factory(root);
	};
})(function(root) {
	'use strict';
	
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

		newROProperty('then', then);
		newROProperty('done', then);
		newROProperty('catch', then.bind(self, undefined));
		newROProperty('fail', then.bind(self, undefined));
		newROProperty('progress', then.bind(self, undefined, undefined));

		newROProperty('always', function(func, notify) {
			return then.call(this, func, func, notify);
		});

		newROProperty('resolve', statusUpdate.bind(self, 'resolve'));
		newROProperty('reject', statusUpdate.bind(self, 'reject'));
		newROProperty('notify', statusUpdate.bind(self, 'notify'));
		newROProperty('promise', function() {
			function nullFunc(){}

			var p = Object.create(self);

			newROProperty('resolve', nullFunc, p);
			newROProperty('reject', nullFunc, p);
			newROProperty('notify', nullFunc, p);

			return p;
		});

		newROProperty('status', function() {
			return state;
		});

		newROProperty('state', function() {
			return state;
		});

		newROProperty('currentProgress', function() {
			return progress;
		});

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

		newROProperty('immediate', function(set) {
			if (arguments.length === 0)
				return immediate;

			immediate = set;
			return self;
		});

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

	Deferred.resolve = function() {
		var args = [];
		for (var j = 0, l = arguments.length; j < l; j++)
			args.push(arguments[j]);

		return new Deferred(function(resolve, reject, notify) {
			notify(1);
			resolve.apply(this, args);
		}, {immediate: true});
	};

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
