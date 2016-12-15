module = (typeof module == 'undefined') ? {} : module;
var System = java.lang.System, Scanner = java.util.Scanner, Paths = java.nio.file.Paths, Files = java.nio.file.Files, Thread = java.lang.Thread;
var Debug;
(function (Debug) {
    var indents = 0;
    var Defer = (function () {
        function Defer() {
        }
        Defer.prototype.call = function (cb) {
            return call(cb);
        };
        Defer.prototype.trace = function (cb) {
            var result = call(cb);
            if (isEnabled())
                print(repeat(indents), "result:", result);
            return result;
        };
        return Defer;
    }());
    function isEnabled() {
        return java.lang.Boolean.getBoolean("jvm-npm.debug");
    }
    Debug.isEnabled = isEnabled;
    function repeat(n, ch) {
        if (ch === void 0) { ch = "-"; }
        if (n <= 0)
            return ">";
        return new Array(n * 4).join(ch);
    }
    function call(cb) {
        ++indents;
        var result = cb();
        --indents;
        return result;
    }
    function decorate(name) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (isEnabled())
            print(repeat(indents), name, args);
        return new Defer();
    }
    Debug.decorate = decorate;
})(Debug || (Debug = {}));
var Resolve;
(function (Resolve) {
    var classloader = Thread.currentThread().getContextClassLoader();
    function _resolveAsNodeModule(id, root) {
        var base = root.resolve('node_modules');
        return Resolve.asFile(id, base) ||
            Resolve.asDirectory(id, base) ||
            (root ? Resolve.asNodeModule(id, root.getParent()) : undefined);
    }
    function _resolveAsDirectory(id, root) {
        var base = root.resolve(id), file = base.resolve('package.json');
        var core;
        if ((core = isResource(file)) || Files.exists(file)) {
            try {
                var body = Resolve.readFile(file, core), package = JSON.parse(body);
                if (package.main) {
                    return (Resolve.asFile(package.main, base) ||
                        Resolve.asDirectory(package.main, base));
                }
                return Resolve.asFile('index.js', base);
            }
            catch (ex) {
                throw new ModuleError("Cannot load JSON file", "PARSE_ERROR", ex);
            }
        }
        return Resolve.asFile('index.js', base);
    }
    function _resolveAsFile(id, root, ext) {
        var name = normalizeName(id, ext || '.js');
        var file = Paths.get(name);
        if (file.isAbsolute()) {
            if (!Files.exists(file))
                return Resolve.asDirectory(id, root);
        }
        else {
            file = root.resolve(name).normalize();
        }
        var core;
        if ((core = isResource(file)) || Files.exists(file)) {
            var result = (core) ? file.toString() : file.toFile().getCanonicalPath();
            if (Debug.isEnabled())
                print("FILE:", result);
            return { path: result, core: core };
        }
    }
    function _resolveAsCoreModule(id, root) {
        var name = normalizeName(id);
        if (isResource(name))
            return { path: name, core: true };
    }
    function _readFile(filename, core) {
        var input;
        try {
            if (core) {
                input = classloader.getResourceAsStream(filename);
            }
            else {
                input = new java.io.File(filename);
            }
            return new Scanner(input).useDelimiter("\\A").next();
        }
        catch (e) {
            throw new ModuleError("Cannot read file [" + input + "]: ", "IO_ERROR", e);
        }
    }
    function isResource(id) {
        var url = classloader.getResource(id.toString());
        return url != null;
    }
    function relativeToRoot(p) {
        if (p.startsWith(Require.root)) {
            var len = Paths.get(Require.root).getNameCount();
            p = p.subpath(len, p.getNameCount());
        }
        return p;
    }
    function findRoots(parent) {
        var r = [];
        r.push(findRoot(parent));
        return r.concat(Require.paths);
    }
    Resolve.findRoots = findRoots;
    function findRoot(parent) {
        if (!parent || !parent.id)
            return Require.root;
        var path = Paths.get(parent.id.toString());
        return path.getParent().toString() || "";
    }
    function loadJSON(file) {
        var json = JSON.parse(Resolve.readFile(file));
        Require.cache[file] = json;
        return json;
    }
    Resolve.loadJSON = loadJSON;
    function normalizeName(fileName, ext) {
        if (ext === void 0) { ext = '.js'; }
        if (String(fileName).endsWith(ext)) {
            return fileName;
        }
        return fileName + ext;
    }
    function asFile(id, root, ext) {
        return Debug.decorate("resolveAsFile", id, root, ext)
            .trace(function () { return _resolveAsFile(id, root, ext); });
    }
    Resolve.asFile = asFile;
    function asDirectory(id, root) {
        return Debug.decorate("resolveAsDirectory", id, root)
            .trace(function () { return _resolveAsDirectory(id, root); });
    }
    Resolve.asDirectory = asDirectory;
    function asNodeModule(id, root) {
        return Debug.decorate("resolveAsNodeModule", id, root)
            .trace(function () { return _resolveAsNodeModule(id, root); });
    }
    Resolve.asNodeModule = asNodeModule;
    function asCoreModule(id, root) {
        return Debug.decorate("resolveAsCoreModule", id, root)
            .trace(function () { return _resolveAsCoreModule(id, root); });
    }
    Resolve.asCoreModule = asCoreModule;
    function readFile(filename, core) {
        var path = filename.toString();
        return Debug.decorate("readFile", path, core)
            .call(function () { return _readFile(path, core); });
    }
    Resolve.readFile = readFile;
})(Resolve || (Resolve = {}));
NativeRequire = (typeof NativeRequire === 'undefined') ? {} : NativeRequire;
if (typeof require === 'function' && !NativeRequire.require) {
    NativeRequire.require = require;
}
function ModuleError(message, code, cause) {
    this.code = code || "UNDEFINED";
    this.message = message || "Error loading module";
    this.cause = cause;
}
ModuleError.prototype = new Error();
ModuleError.prototype.constructor = ModuleError;
var Module = (function () {
    function Module(id, parent, core) {
        var _this = this;
        this.id = id;
        this.parent = parent;
        this.core = core;
        this.children = [];
        this.loaded = false;
        this.filename = id;
        this.exports = {};
        if (parent && parent.children)
            parent.children.push(this);
        this.require = function (id) {
            return Require.call(_this, id, _this);
        };
    }
    Object.defineProperty(Module.prototype, "exports", {
        get: function () {
            return this._exports;
        },
        set: function (val) {
            Require.cache[this.filename] = val;
            this._exports = val;
        },
        enumerable: true,
        configurable: true
    });
    Module._load = function (file, parent, core, main) {
        var module = new Module(file, parent, core);
        var __FILENAME__ = module.filename;
        var body = Resolve.readFile(module.filename, module.core), dir = new java.io.File(module.filename).getParent(), args = ['exports', 'module', 'require', '__filename', '__dirname'], func = new Function(args, body);
        func.apply(module, [module.exports, module, module.require, module.filename, dir]);
        module.loaded = true;
        module.main = main;
        return module.exports;
    };
    Module.runMain = function (main) {
        var file = Require.resolve(main);
        Module._load(file.path, undefined, file.core, true);
    };
    return Module;
}());
var Require = (function () {
    function Require(id, parent) {
        var file = Require.resolve(id, parent);
        if (!file) {
            if (typeof NativeRequire.require === 'function') {
                if (Debug.isEnabled())
                    print('cannot resolve', id, 'defaulting to native');
                try {
                    var native = NativeRequire.require(id);
                    if (native)
                        return native;
                }
                catch (e) {
                    throw new ModuleError("cannot load module " + id, "MODULE_NOT_FOUND");
                }
            }
            if (Debug.isEnabled())
                print("cannot load module ", id);
            throw new ModuleError("cannot load module " + id, "MODULE_NOT_FOUND");
        }
        try {
            if (Require.cache[file.path]) {
                return Require.cache[file.path];
            }
            else if (String(file.path).endsWith('.js')) {
                return Module._load(file.path, parent, file.core);
            }
            else if (String(file.path).endsWith('.json')) {
                return Resolve.loadJSON(file.path);
            }
        }
        catch (ex) {
            if (ex instanceof java.lang.Exception) {
                throw new ModuleError("Cannot load module " + id, "LOAD_ERROR", ex);
            }
            else {
                System.out.println("Cannot load module " + id + " LOAD_ERROR");
                throw ex;
            }
        }
    }
    Require.resolve = function (id, parent) {
        if (Debug.isEnabled())
            print("\n\nRESOLVE:", id);
        var roots = Resolve.findRoots(parent);
        for (var i = 0; i < roots.length; ++i) {
            var root = Paths.get(roots[i]);
            var result = Resolve.asCoreModule(id, root) ||
                Resolve.asFile(id, root, '.js') ||
                Resolve.asFile(id, root, '.json') ||
                Resolve.asDirectory(id, root) ||
                Resolve.asNodeModule(id, root);
            if (result)
                return result;
        }
    };
    ;
    return Require;
}());
Require.root = System.getProperty('user.dir');
Require.NODE_PATH = undefined;
Require.paths = [];
Require.cache = {};
Require.extensions = {};
require = Require;
module.exports = Module;
