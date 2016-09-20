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