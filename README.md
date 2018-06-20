# webpack-stache-loader

Load CanJS Stache templates with Webpack

## Supported versions

|         | version | comment  |
|---------|---------|----------|
| CanJS   | 4.x     |          |
| Webpack | 3.x     | (4.x may work - not tested yet) |


## Supported features

This loader currently supports the following features:

- Basic importing of `.stache` files via `require()`, `import`, etc.
- Partial views with *static* paths, e.g. `{{> partial.stache}}`, are also transively loaded through the loader.
- Imports through `can-import` with *static* paths, e.g. `<can-import from="./dependency">`, are imported.
- The former also supports pulling the imported value out into a scope variable:
  ```html
  <can-import from="./dependency" this:to="scope.vars.dependency">
    {{#if depenency.isResolved}}
      {{dependency.value}}
    {{/if}}
  </can-import>
  ```
- Source map generation. Each `.stache` file is represented in the `webpack:` bundle as a folder holding a `.js` file with the generated pre-compiled template code and a `.html` file holding the original template. The `.html` extension attempts to have developer tools apply the proper syntax highlighter, which is succesful in atleast Chrome.

**Please note:**  
To work around some of the peculiarities of Webpack and how it wants a static set of resolvable module URIs up front, the `can-import` support is provided via a custom implementation of the `<can-import>` tag, which overrides the original CanJS implementation. The original relies on dynamic name lookups in a way that Webpack cannot handle.

This alternative implementation (see `runtime/can-view-import.js`) is added to your bundle.


## Currently unsupported features

- Dynamic composition of paths in partials or `can-import` tags.
- `require.ensure()` style chunking for partials or `can-import` tags.



