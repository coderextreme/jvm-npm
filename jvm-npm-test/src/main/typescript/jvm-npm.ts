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
    Files   = java.nio.file.Files,
    Thread  = java.lang.Thread
    ;

namespace Debug {

  let indents:number = 0;

  class Defer<T> {

    // call and No Print Result
    call( cb:(() => T) ):T {
      return call( cb );
    }

    // call and Print Result
    trace( cb:(() => T) ):T {
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

  function _resolveAsNodeModule(id:string, root:Path):ResolveResult {
    var base = root.resolve('node_modules');
    return Resolve.asFile(id, base) ||
      Resolve.asDirectory(id, base) ||
      (root ? Resolve.asNodeModule(id, root.getParent()) : undefined);
  }

  function _resolveAsDirectory(id:string, root:Path):ResolveResult {
    var base = root.resolve( id ),
        file = base.resolve('package.json');

    let core;
    if ( (core = isResource(file)) || Files.exists(file)) {
      try {
        var body = Resolve.readFile(file, core),
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
    let name = normalizeName(id, ext || '.js');
    let file = Paths.get(name);

    if ( file.isAbsolute() ) {
      if (!Files.exists(file)) return Resolve.asDirectory(id, root);
    } else {
      file = root.resolve(name).normalize();
    }
    let core;
    if ((core = isResource(file)) || Files.exists(file)) {

      let result = (core) ? file.toString() : file.toFile().getCanonicalPath();

      if( Debug.isEnabled() ) print( "FILE:", result/*, relativeToRoot(file)*/ );

      return {path:result, core:core};
    }
  }

  function _resolveAsCoreModule(id:string, root:Path) {
    var name = normalizeName(id);

    if (isResource(name))
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

  function isResource( id:string|Path ):boolean {
    var url = classloader.getResource( id.toString() );
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
      let json = JSON.parse(Resolve.readFile(file));
      Require.cache[file] = json;
      return json;
  }

  function normalizeName(fileName:string, ext:string = '.js') {
      if (String(fileName).endsWith(ext)) {
        return fileName;
      }
      return fileName + ext;
  }

  export function asFile(id:string, root:Path, ext?:string):ResolveResult {
      return Debug.decorate<ResolveResult>( "resolveAsFile", id, root, ext  )
        .trace( () => _resolveAsFile( id, root, ext ) );
  }

  export function asDirectory(id:string, root:Path):ResolveResult  {
    return Debug.decorate<ResolveResult>( "resolveAsDirectory", id, root )
      .trace( () => _resolveAsDirectory( id, root ) );
  }

  export function asNodeModule(id:string, root:Path):ResolveResult  {
    return Debug.decorate<ResolveResult>( "resolveAsNodeModule", id, root )
      .trace( () => _resolveAsNodeModule( id, root ) );
  }

  export function asCoreModule(id:string, root:Path):ResolveResult {
    return Debug.decorate<ResolveResult>( "resolveAsCoreModule", id, root )
      .trace( () => _resolveAsCoreModule( id, root ) );
  }

  export function readFile(filename:string|Path, core?:boolean) {
    let path = filename.toString();
    return Debug.decorate<any>( "readFile", path, core )
      .call( () => _readFile(path, core) );
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

  static resolve(id:string, parent?:Module):ResolveResult {
    if( Debug.isEnabled() ) print( "\n\nRESOLVE:", id );

    var roots = Resolve.findRoots(parent);

    for ( var i = 0 ; i < roots.length ; ++i ) {
      var root = Paths.get(roots[i]);
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
