// clang-format off
const { esmLoader } = require("internal/process/esm_loader");
const { translators } = require("internal/modules/esm/translators");
const { ModuleWrap } = internalRequire("internal/test/binding").internalBinding("module_wrap");
const path = require("path");
const alt = process._linkedBinding("alt");

(async () => {
  const resource = alt.Resource.current;
  let _exports = null;

  try {
    setupImports();

    // Load the global bindings code
    new Function("alt", __internal_bindings_code)(alt);

    // Get the path to the main file for this resource, and load it
    const _path = path.resolve(resource.path, resource.main);
    _exports = await esmLoader.import(`file://${_path}`, "", {});
    if ("start" in _exports) {
      const start = _exports.start;
      if (typeof start === "function") {
        await start();
      }
    }
  } catch (e) {
    console.error(e);
  }

  __resourceLoaded(resource.name, _exports);
})();

// Sets up our custom way of importing alt:V resources
function setupImports() {
  translators.set("alt", async function(url) {
    const name = url.slice(4); // Remove "alt:" scheme
    const exports = alt.getResourceExports(name);
    return new ModuleWrap(url, undefined, Object.keys(exports), function() {
      for (const exportName in exports) {
        let value;
        try {
          value = exports[exportName];
        } catch {}
        this.setExport(exportName, value);
      }
    });
  });

  esmLoader.addCustomLoaders({
      resolve(specifier, context, defaultResolve) {
        if (alt.hasResource(specifier)) return {
            url: `alt:${specifier}`
        };
        return defaultResolve(specifier, context, defaultResolve);
      },
      load(url, context, defaultLoad) {
        if(url.startsWith("alt:"))
            return {
              format: "alt",
              source: null,
            };
        return defaultLoad(url, context, defaultLoad);
      },
  });
}

// ***** Utils

// Supresses the warning from NodeJS when importing "super-internal" modules,
// that the embedder isn't supposed to use
function internalRequire(id) {
  const __emitWarning = process.emitWarning;
  process.emitWarning = () => {};
  const result = require(id);
  process.emitWarning = __emitWarning;
  return result;
}
