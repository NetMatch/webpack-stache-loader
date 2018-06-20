const path = require( "path" );
const promisify = require( "util" ).promisify;

const loaderUtils = require( "loader-utils" );
const parseStache = require( "can-stache-ast" ).parse;

const makeTemplate  = require( "./lib/make-template" );
const makeSourceMap = require( "./lib/make-source-map" );


function getRelativeResourcePath( resourcePath, rootContext ) {
	return path
		.relative( rootContext, resourcePath )
		.replace( /\\/g, "/" );
}

function splitModeFromExpression( expression ) {
	expression = expression.trim();
	let mode = expression.charAt( 0 );

	if( "#/{&^>!<".indexOf(mode) >= 0 ) {
		expression = expression.substr(1).trim();
	} else {
		mode = null;
	}

	return {
		expression,
		mode
	};
}


function extractPartials( tokens ) {
	return tokens.reduce(( paths, token ) => {
		if ( token.tokenType !== "special" ) return paths;

		let { expression, mode } = splitModeFromExpression( token.args[ 0 ]);
		let path = expression;

		if (( mode !== ">" ) || !/\.stache$/i.test( path )) return paths;

		token.args[ 0 ] = `> __webpack_partial_${paths.length}__`;
		paths.push( path );

		return paths;
	}, []);
}

module.exports = function( content ) {
	const callback = this.async();
	const presolve = promisify( this.resolve.bind( this ));
	const options  = loaderUtils.getOptions( this ) || {};

	const rootContext =
		   options.context
		|| this.rootContext
		|| ( this.options && this.options.context );

	const templateName = getRelativeResourcePath( this.resourcePath, rootContext );

	const ast      = parseStache( templateName, content );
	const partials = extractPartials( ast.intermediate ).map( id => presolve( this.context, id ));
	const imports  = Array.from( new Set([ ...ast.dynamicImports, ...ast.imports ])).map( id =>
		presolve( this.context, id ).then( resolved => {
			return { original : id, resolved };
		})
	);

	Promise
		.all([
			Promise.all( imports ),
			Promise.all( partials )
		])
		.then(([ imports, partials ]) => {
			return {
				imports : imports.map( item => {
					return {
						original : JSON.stringify( item.original ),
						resolved : loaderUtils.stringifyRequest( this, item.resolved )
					};
				}),
				partials : partials.map( id => loaderUtils.stringifyRequest( this, id ))
			};
		})
		.then(({ imports, partials }) => makeTemplate(
			ast.intermediate,
			imports,
			partials,
			templateName
		))
		.then( template => {
			return {
				template  : template,
				sourceMap : this.sourceMap
					? makeSourceMap( template, content, this.resourcePath )
					: null
			}
		})
		.then(({ template, sourceMap }) => { callback( null, template, sourceMap ); })
		.catch( err => callback( err ));
};
