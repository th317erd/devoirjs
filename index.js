(function(factory) {
	module.exports = factory({});
})(function(root) {
	'use strict';

	require('./lib/base')(root);
	require('./lib/deferred')(root);

	root.utils = require('./lib/utils')();
	root.events = require('./lib/events')();

	return root;
});
