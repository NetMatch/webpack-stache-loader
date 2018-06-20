const esprima = require( "esprima" );
const path = require( "path" );
const { SourceMapGenerator } = require( "source-map" );

function replaceExt( filepath, ext ) {
	const stripped = path.posix.basename( filepath, path.posix.extname( filepath ));

	return path.posix.join( path.posix.dirname( filepath ), stripped + ext );
}

module.exports = function makeSourceMap( source, template, filepath ) {
	const basename     = path.basename( filepath );
	const generator    = new SourceMapGenerator();
	const sourcePath   = path.join( filepath, replaceExt( basename, ".stache.js" ));
	const templatePath = path.join( filepath, replaceExt( basename, ".stache.html" ));

	esprima
		.tokenize( source, { loc : true })
		.forEach( token => {
			generator.addMapping({
				source    : sourcePath,
				generated : token.loc.start,
				original  : token.loc.start
			});
		});

	generator.addMapping({
		source    : templatePath,
		generated : { column : 0, line : 1 },
		original  : { column : 0, line : 1 }
	});

	generator.setSourceContent( sourcePath, source );
	generator.setSourceContent( templatePath, template );

	return generator.toJSON();
}
