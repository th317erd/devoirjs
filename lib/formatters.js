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
