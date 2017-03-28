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
		SKIP: function SKIP(amount){this.amount = amount;},
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

						if (match instanceof Tokenizer.prototype.SKIP) {
							console.log('DOING SKIP!!!');
							return {
								offset: offset + (match.amount || 0),
								value: match
							}
						}

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

			context.skip = function(amount) {
				return new Tokenizer.prototype.SKIP(amount);
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