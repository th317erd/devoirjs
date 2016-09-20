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
		match: function match(offset, _match, _skipTypes, _caseInsensitive) {
			return this.matchTokens(this.tokens, _match, _skipTypes, _caseInsensitive, offset);
	  },
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
					
					if (!matchAllKeys(token, matchPart))
						return false;
				}

				return true;
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
	      val.push(token.rawValue || token.value);
	    }

	    return val.join('');
	  },
	  getPrevious: function(count, _skipTypes) {
	  	return this.getPreviousTokens(this.tokens, count, _skipTypes);
	  },
		getPreviousTokens: function(tokens, count, _skipTypes) {
			if (!tokens || tokens.length === 0)
				return [];

			var skipTypes = _skipTypes,
					previousTokens = [];

			if (skipTypes && !(skipTypes instanceof Array))
	  		skipTypes = [skipTypes];

			for (var i = tokens.length - 1; i >= 0; i--) {
				var token = tokens[i];
				if (skipTypes && skipTypes.indexOf(token.type) >= 0)
					continue;

				previousTokens.push(token);
				if (previousTokens.length >= count)
					break;
			}

			return previousTokens.reverse();
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

				var tokenTypes = this.tokenTypes,
						context = this;

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
					context = Object.create(this);
			
			context.abort = function() {
				return new Tokenizer.prototype.ABORT();
			};

			context.skip = function() {
				return new Tokenizer.prototype.SKIP();
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