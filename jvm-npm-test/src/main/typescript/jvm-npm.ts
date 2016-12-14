/**
 *
 * JVM-NPM TAILORED FOR RHINO JS ENGINE
 *
 */
/// <reference path="jvm-npm.d.ts" />

module = (typeof module == 'undefined') ? {} :  module;

var System  = java.lang.System,
    Scanner = java.util.Scanner,
    Paths   = java.nio.file.Paths,
    Thread  = java.lang.Thread
    ;

namespace Debug {

  let indents:number = 0;

  class Defer<T> {

    // call and No Print Result
    callNPR( cb:(() => T) ):T {
      return call( cb );
    }

    // call and Print Result
    callPR( cb:(() => T) ):T {
      let result =  call( cb );
      if( isEnabled() ) print( repeat(indents), "result:", result );
      return result;
    }
  }

  export function isEnabled():boolean {
      return java.lang.Boolean.getBoolean("jvm-npm.debug");
  }

  function repeat(n:number, ch:string = "-"):string {
    if( n <=0 ) return ">";
    return new Array(n*4).join(ch);
  }

  function call<T>(cb:(() => T)):T {
    ++indents;
    let result = cb();
    --indents;
    return result;
  }

  export function decorate<T>( name:string, ...args: any[] ):Defer<T> {
      if( isEnabled() ) print( repeat(indents), name , args);
      return  new Defer<T>();
  }

} // Debug

namespace Resolve {
  let classloader = Thread.currentThread().getContextClassLoader();

  function _resolveAsNodeModule(id:string, root):ResolveResult {
    var base = [root, 'node_modules'].join('/');
    return Resolve.asFile(id, base) ||
      Resolve.asDirectory(id, base) ||
      (root ? Resolve.asNodeModule(id, new java.io.File(root).getParent()) : undefined);
  }

  function _resolveAsDirectory(id:string, root?:Path):ResolveResult {
    var base = [root, id].join('/'),
        file = new java.io.File([base, 'package.json'].join('/'));

    if (file.exists()) {
      try {
        var body = Resolve.readFile(file.getCanonicalPath()),
            package  = JSON.parse(body);
        if (package.main) {
          return (Resolve.asFile(package.main, base) ||
                  Resolve.asDirectory(package.main, base));
        }
        // if no package.main exists, look for index.js
        return Resolve.asFile('index.js', base);
      } catch(ex) {
        throw new ModuleError("Cannot load JSON file", "PARSE_ERROR", ex);
      }
    }
    return Resolve.asFile('index.js', base);
  }

  function _resolveAsFile(id:string, root:Path, ext?:string):ResolveResult {
    var file;
    if ( id.length > 0 && id[0] === '/' ) {
      file = new java.io.File(normalizeName(id, ext || '.js'));

      if (!file.exists()) return Resolve.asDirectory(id);

    } else {
      file = new java.io.File([root, normalizeName(id, ext || '.js')].join('/'));
    }
    if (file.exists()) {
      let result = file.getCanonicalPath();
      if( Debug.isEnabled() ) print("file:", relativeToRoot(file.toPath()) );

      return {path:result};
    }
  }

  function _resolveAsCoreModule(id, root) {
    var name = normalizeName(id);

    if (isResourceResolved(name))
      return { path: name, core: true };
  }

  function _readFile(filename:string, core?:boolean) {
    var input;
    try {
      if (core) {
        input = classloader.getResourceAsStream(filename);
      } else {
        input = new java.io.File(filename);
      }
      // TODO: I think this is not very efficient
      return new Scanner(input).useDelimiter("\\A").next();
    } catch(e) {
      throw new ModuleError("Cannot read file ["+input+"]: ", "IO_ERROR", e);
    }
  }

  function isResourceResolved( id:string ):boolean {
    var url = classloader.getResource( id );
    return url!=null;
  }

  function relativeToRoot( p:Path ):Path {

      if( p.startsWith(Require.root)) {
        let len = Paths.get(Require.root).getNameCount();
        p = p.subpath(len, p.getNameCount());//.normalize();
      }
      return p;
  }

  export function findRoots(parent:Module) {
      var r = [];
      r.push( findRoot( parent ) );
      return r.concat( Require.paths );
  }

  function findRoot(parent:Module):string {
      if (!parent || !parent.id) return Require.root;

      var path = Paths.get( parent.id.toString() );

      return path.getParent().toString() || "";
  }

  export function loadJSON(file:string) {
      var json = JSON.parse(Resolve.readFile(file));
      Require.cache[file] = json;
      return json;
  }

  function normalizeName(fileName, extension:string = '.js') {
      if (String(fileName).endsWith(extension)) {
        return fileName;
      }
      return fileName + extension;
  }

  export function asFile(id:string, root, ext?:string):ResolveResult {
      return Debug.decorate<ResolveResult>( "resolveAsFile", id, root, ext  ).callPR( () => {
        return _resolveAsFile( id, root, ext );
      });
  }

  export function asDirectory(id:string, root?):ResolveResult  {
    return Debug.decorate<ResolveResult>( "resolveAsDirectory", id, root ).callPR( () => {
      return _resolveAsDirectory( id, root );
    });
  }

  export function asNodeModule(id:string, root):ResolveResult  {
    return Debug.decorate<ResolveResult>( "resolveAsNodeModule", id, root ).callPR( () => {
      return _resolveAsNodeModule( id, root );
    });
  }

  export function asCoreModule(id:string, root):ResolveResult {
    return Debug.decorate<ResolveResult>( "resolveAsCoreModule", id, root ).callPR( () => {
      return _resolveAsCoreModule( id, root );
    });
  }

  export function readFile(filename:string, core?:boolean) {
    return Debug.decorate<any>( "readFile", filename, core ).callNPR( () => {
      return _readFile(filename, core);
    });
  }

}


NativeRequire = (typeof NativeRequire === 'undefined') ? {} : NativeRequire;
if (typeof require === 'function' && !NativeRequire.require) {
  NativeRequire.require = require;
}

function ModuleError(message:string, code?:string, cause?:any) {
  this.code     = code    || "UNDEFINED";
  this.message  = message || "Error loading module";
  this.cause    = cause;
}

ModuleError.prototype = new Error();
ModuleError.prototype.constructor = ModuleError;

class Module {

  children = [];
  filename;
  loaded = false;
  require:Function;
  main:boolean;

  _exports:any;

  get exports():any {
   return this._exports;
  }
  set exports(val:any) {
    Require.cache[this.filename] = val;
    this._exports = val;
  }

  static _load(file:string, parent, core:boolean, main?:boolean) {
    var module = new Module(file, parent, core);
    var __FILENAME__ = module.filename;
    var body   = Resolve.readFile(module.filename, module.core),
        dir    = new java.io.File(module.filename).getParent(),
        args   = ['exports', 'module', 'require', '__filename', '__dirname'],
        func   = new Function(args, body);
    func.apply(module,
        [module.exports, module, module.require, module.filename, dir]);
    module.loaded = true;
    module.main = main;
    return module.exports;
  }

  static runMain(main) {
    var file = Require.resolve(main);
    Module._load(file.path, undefined, file.core, true);
  }

  constructor( public id:string|Path, private parent:Module, private core:boolean) {
    this.filename = id;

    this.exports = {};

    if (parent && parent.children) parent.children.push(this);

    this.require = (id) => {
      return Require.call(this, id, this);
    }
  }

}

class Require {
  static root:string = System.getProperty('user.dir');
  static NODE_PATH:string = undefined;
  static paths = [];
  static cache: { [s: string]: any; } = {};
  static extensions = {};

  static resolve(id:string, parent?:Module) {
    if( Debug.isEnabled() ) print( "\n\nRESOLVE:", id );

    var roots = Resolve.findRoots(parent);

    for ( var i = 0 ; i < roots.length ; ++i ) {
      var root = roots[i];
      var result = Resolve.asCoreModule(id, root) ||
        Resolve.asFile(id, root, '.js')   ||
        Resolve.asFile(id, root, '.json') ||
        Resolve.asDirectory(id, root)     ||
        Resolve.asNodeModule(id, root);

      if ( result ) return result;

    }

  };

  constructor(id:string, parent:Module) {
    var file = Require.resolve(id, parent);

    if (!file) {
      if (typeof NativeRequire.require === 'function') {

        if (Debug.isEnabled()) print('cannot resolve', id, 'defaulting to native');

        try {
            var native = NativeRequire.require(id);
            if (native) return native;
        } catch(e) {
          throw new ModuleError("cannot load module " + id, "MODULE_NOT_FOUND");
        }
      }
      if (Debug.isEnabled()) print("cannot load module ", id);

      throw new ModuleError("cannot load module " + id, "MODULE_NOT_FOUND");
    }

    try {
      if (Require.cache[file.path]) {
        return Require.cache[file.path];
      } else if (String(file.path).endsWith('.js')) {
        return Module._load(file.path, parent, file.core);
      } else if (String(file.path).endsWith('.json')) {
        return Resolve.loadJSON(file.path);
      }
    } catch(ex) {
      if (ex instanceof java.lang.Exception) {
        throw new ModuleError("Cannot load module " + id, "LOAD_ERROR", ex);
      } else {
        System.out.println("Cannot load module " + id + " LOAD_ERROR");
        throw ex;
      }
    }
  }
}

require   = Require;
module.exports  = Module;
