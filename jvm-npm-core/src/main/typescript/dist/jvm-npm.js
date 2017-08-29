var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
module = (typeof module == 'undefined') ? {} : module;
var System = java.lang.System, Scanner = java.util.Scanner, Paths = java.nio.file.Paths, Files = java.nio.file.Files, Thread = java.lang.Thread;
var Debug;
(function (Debug) {
    var indents = 0;
    function isEnabled() {
        return java.lang.Boolean.getBoolean("jvm-npm.debug");
    }
    function log(arg1, arg2, arg3) {
        if (isEnabled())
            print(indent(), arg1, arg2, (!arg3) ? "" : arg3);
    }
    Debug.log = log;
    function indent(ch) {
        if (ch === void 0) { ch = "-"; }
        if (indents <= 0)
            return ">";
        return new Array(indents * 4).join(ch);
    }
    function call(cb) {
        ++indents;
        var result = cb();
        --indents;
        return result;
    }
    Debug.call = call;
})(Debug || (Debug = {}));
function debuggable(log_result) {
    if (log_result === void 0) { log_result = true; }
    return function (target, key, descriptor) {
        return {
            value: function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                Debug.log(key, args);
                var result = Debug.call(function () { return descriptor.value.apply(target, args); });
                Debug.log(key, "result", (log_result) ?
                    ((!result) ? "undefined" : result) :
                    typeof result);
                return result;
            }
        };
    };
}
var classloader = Thread.currentThread().getContextClassLoader();
var Resolve = (function () {
    function Resolve() {
    }
    Resolve.asNodeModule = function (id, root) {
        if (!root)
            return;
        var base = root.resolve('node_modules');
        return Resolve.asFile(id, base) ||
            Resolve.asDirectory(id, base) ||
            Resolve.asNodeModule(id, root.getParent());
    };
    Resolve.asDirectory = function (id, root) {
        var base = root.resolve(id);
        var file = base.resolve('package.json');
        var core;
        if ((core = Resolve.isResource(file)) || Files.exists(file)) {
            try {
                var body = Resolve.readFile(file, core), _package = JSON.parse(body);
                if (_package.main) {
                    return (Resolve.asFile(_package.main, base) ||
                        Resolve.asDirectory(_package.main, base));
                }
                return Resolve.asFile('index.js', base);
            }
            catch (ex) {
                throw new ModuleError("Cannot load JSON file", "PARSE_ERROR", ex);
            }
        }
        return Resolve.asFile('index.js', base);
    };
    Resolve.asFile = function (id, root, ext) {
        var name = Resolve.normalizeName(id, ext || '.js');
        var file = Paths.get(name);
        if (file.isAbsolute()) {
            if (!Files.exists(file))
                return Resolve.asDirectory(id, root);
        }
        else {
            file = root.resolve(name).normalize();
        }
        var core;
        if ((core = Resolve.isResource(file)) || Files.exists(file)) {
            var result = (core) ? file.toString() : file.toFile().getCanonicalPath();
            Debug.log("file:", result);
            return { path: result, core: core };
        }
    };
    Resolve.asCoreModule = function (id, root) {
        var name = Resolve.normalizeName(id);
        if (Resolve.isResource(name))
            return { path: name, core: true };
    };
    Resolve.readFile = function (filename, core) {
        var path = filename.toString();
        var input;
        try {
            input = (core) ?
                classloader.getResourceAsStream(path) :
                new java.io.FileInputStream(path);
            return new Scanner(input).useDelimiter("\\A").next();
        }
        catch (e) {
            throw new ModuleError("Cannot read file :" + input, "IO_ERROR", e);
        }
    };
    Resolve.isResource = function (id) {
        var url = classloader.getResource(id.toString());
        return url != null;
    };
    Resolve.relativeToRoot = function (p) {
        if (p.startsWith(Require.root)) {
            var len = Paths.get(Require.root).getNameCount();
            p = p.subpath(len, p.getNameCount());
        }
        return p;
    };
    Resolve.findRoots = function (parent) {
        var r = [];
        r.push(Resolve.findRoot(parent));
        return r.concat(Require.paths);
    };
    Resolve.findRoot = function (parent) {
        if (!parent || !parent.id)
            return Require.root;
        var path = Paths.get(parent.id.toString()).getParent();
        return (path) ? path.toString() : "";
    };
    Resolve.loadJSON = function (file, core) {
        var json = JSON.parse(Resolve.readFile(file, core));
        Require.cache[file] = json;
        return json;
    };
    Resolve.normalizeName = function (fileName, ext) {
        if (ext === void 0) { ext = '.js'; }
        if (String(fileName).endsWith(ext)) {
            return fileName;
        }
        return fileName + ext;
    };
    __decorate([
        debuggable(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Object)
    ], Resolve, "asNodeModule", null);
    __decorate([
        debuggable(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Object)
    ], Resolve, "asDirectory", null);
    __decorate([
        debuggable(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object, String]),
        __metadata("design:returntype", Object)
    ], Resolve, "asFile", null);
    __decorate([
        debuggable(),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Object)
    ], Resolve, "asCoreModule", null);
    __decorate([
        debuggable(false),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, Boolean]),
        __metadata("design:returntype", void 0)
    ], Resolve, "readFile", null);
    return Resolve;
}());
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
        this.filename = id.toString();
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
        var body = Resolve.readFile(module.filename, module.core), dir = Paths.get(module.filename).getParent(), args = ['exports', 'module', 'require', '__filename', '__dirname'], func = new Function(args, body);
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
        var ERR_MSG = 'cannot load module ';
        var file = Require.resolve(id, parent);
        if (!file) {
            if (typeof NativeRequire.require === 'function') {
                Debug.log(ERR_MSG, id, 'defaulting to native');
                try {
                    var native = NativeRequire.require(id);
                    if (native)
                        return native;
                }
                catch (e) {
                    throw new ModuleError(ERR_MSG + id, "MODULE_NOT_FOUND");
                }
            }
            throw new ModuleError(ERR_MSG + id, "MODULE_NOT_FOUND");
        }
        try {
            if (Require.cache[file.path]) {
                return Require.cache[file.path];
            }
            else if (String(file.path).endsWith('.js')) {
                return Module._load(file.path, parent, file.core);
            }
            else if (String(file.path).endsWith('.json')) {
                return Resolve.loadJSON(file.path, file.core);
            }
        }
        catch (ex) {
            if (ex instanceof java.lang.Exception) {
                throw new ModuleError(ERR_MSG + id, "LOAD_ERROR", ex);
            }
            else {
                System.out.println(ERR_MSG + id + " LOAD_ERROR");
                throw ex;
            }
        }
    }
    Require.resolve = function (id, parent) {
        Debug.log("TRY RESOLVING", id);
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
    Require.root = System.getProperty('user.dir');
    Require.NODE_PATH = undefined;
    Require.paths = [];
    Require.cache = {};
    Require.extensions = {};
    return Require;
}());
require = Require;
module.exports = Module;
