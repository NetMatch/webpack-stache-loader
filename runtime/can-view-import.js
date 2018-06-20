var assign = require("can-assign");
var canData = require("can-dom-data-state");
var canSymbol = require("can-symbol");
var DOCUMENT = require("can-globals/document/document");
var getChildNodes = require("can-util/dom/child-nodes/child-nodes");
var domMutate = require("can-dom-mutate");
var domMutateNode = require("can-dom-mutate/node");
var nodeLists = require("can-view-nodelist");
var viewCallbacks = require("can-view-callbacks");
var tag = viewCallbacks.tag;
var canLog = require("can-log/");
var dev = require("can-log/dev/dev");

function setViewModel (element, viewModel) {
	element[canSymbol.for('can.viewModel')] = viewModel;
}

module.exports = function makeImportTags( mapping ) {

	function importer( moduleName, importName ) {
		if ( moduleName in mapping ) {
			var
				module = mapping[ moduleName ],
				prop   = importName || ( module.__esModule === true ? "default" : "*" );

			if ( prop == "*" ) {
				return Promise.resolve( module );
			}
			if ( prop in module ) {
				return Promise.resolve( module[ prop ]);
			}

			Promise.reject( new Error( "Module '" + moduleName + "' does not export '" + prop + "'." ));
		}

		return Promise.reject( new Error( "Module '" + moduleName + "' was not found." ));
	}

	function processImport(el, tagData) {

		var moduleName = el.getAttribute( "from" );
		var importName = el.getAttribute( "import" );

		if( !moduleName ) {
			return Promise.reject("No module name provided");
		}

		var importPromise = importer( moduleName, importName );
		importPromise.catch(function(err) {
			canLog.error(err);
		});

		// Set the viewModel to the promise
		setViewModel(el, importPromise);
		canData.set.call(el, "scope", importPromise);

		// Set the scope
		var scope = tagData.scope.add(importPromise, { notContext: true });

		// If there is a can-tag present we will hand-off rendering to that tag.
		var handOffTag = el.getAttribute("can-tag");

		if(handOffTag) {
			var callback = tag(handOffTag);

			// Verify hand off tag has been registered. Callback can be undefined or noop.
			if (!callback || callback === viewCallbacks.defaultCallback) {
				//!steal-remove-start
				dev.error(new Error("The tag '" + handOffTag + "' has not been properly registered."));
				//!steal-remove-end
			} else {
				canData.set.call(el, "preventDataBindings", true);
				callback(el, assign(tagData, {
					scope: scope
				}));
				canData.set.call(el, "preventDataBindings", false);

				setViewModel(el, importPromise);
				canData.set.call(el, "scope", importPromise);
			}
		}
		// Render the subtemplate and register nodeLists
		else {
			var nodeList = nodeLists.register([], undefined, tagData.parentNodeList || true, false);
			nodeList.expression = "<" + this.tagName + ">";

			var frag = tagData.subtemplate ?
				tagData.subtemplate(scope, tagData.options, nodeList) :
				DOCUMENT().createDocumentFragment();

			var removalDisposal = domMutate.onNodeRemoval(el, function () {
				if (!el.ownerDocument.contains(el)) {
					removalDisposal();
					nodeLists.unregister(nodeList);
				}
			});

			domMutateNode.appendChild.call(el, frag);
			nodeLists.update(nodeList, getChildNodes(el));
		}
	}

	return [ "can-import", "can-dynamic-import"].reduce( function( obj, tagName ) {
		obj[ tagName ] = processImport.bind({ tagName: tagName });
		return obj;
	}, {});
};
