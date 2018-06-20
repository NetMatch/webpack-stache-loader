module.exports = function makeTemplate( intermediate, imports, partials, filename ) {
	intermediate = JSON.stringify( intermediate, null, "\t" );
	filename     = JSON.stringify( filename );

	if ( imports.length ) {
		imports = imports.map( item => `\t${item.original} : require(${item.resolved})` );
		imports = [ "{", imports.join( ",\r\n" ), "}" ].join( "\r\n" );
	} else {
		imports = "{}";
	}

	if ( partials.length ) {
		partials = partials.map(( id, index ) => `\t__webpack_partial_${index}__ : { render : require(${id}) }` );
		partials = [ "{", partials.join( ",\r\n" ), "}" ].join( "\r\n" );
	} else {
		partials = "{}";
	}

	return `var assign = require( "can-assign" );
var stache = require( "can-stache" );
var mustacheCore = require( "can-stache/src/mustache_core" );
var makeImportTags = require( "@netmatch/webpack-stache-loader/runtime/can-view-import" );

var imports = ${imports};
var partials = ${partials};
var tags = makeImportTags(imports);
var renderer = stache( ${filename}, ${intermediate});

module.exports = function ( scope, options, nodeList ) {
	// Webpack cannot provide compatible module IDs.
	// Pass a blank module definition instead.
	var moduleOptions = assign({
		module   : null,
		partials : partials
	}, options );

	moduleOptions.tags = assign( moduleOptions.tags || {}, tags );

	return renderer( scope, moduleOptions, nodeList );
}`;
}