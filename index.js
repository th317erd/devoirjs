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
