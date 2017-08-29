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

  var indents:number = 0;

  function isEnabled():boolean {
      return java.lang.Boolean.getBoolean("jvm-npm.debug");
  }

  export function log( arg1:any, arg2:any, arg3?:any ):void {
    if( isEnabled() ) 
      print( indent(), arg1, arg2, (!arg3) ? "": arg3 );
  }

  function indent(ch:string = "-"):string {
    if( indents <=0 ) return ">";
    return new Array(indents*4).join(ch);
  }

  export function call<T>(cb:(() => T)):T {
    ++indents;
    let result = cb();
    --indents;
    return result;
  }

} // Debug

function debuggable( log_result:boolean = true ) {
  return function (target: any, key: string|symbol, descriptor: TypedPropertyDescriptor<Function>) {
    
    return {
      value: function( ... args: any[]) {
          Debug.log( key , args);
          const result = Debug.call( () => descriptor.value.apply(target, args) );
          Debug.log( key, "result", 
                            ( log_result ) ? 
                              ((!result) ? "undefined" : result) : 
                              typeof result );
          return result;
      }
    }
  };
}

const classloader = Thread.currentThread().getContextClassLoader();

class Resolve {

  @debuggable()
  static asNodeModule(id:string, root:Path):ResolveResult  {
    if( !root ) return;

    var base = root.resolve('node_modules');
    return Resolve.asFile(id, base) ||
      Resolve.asDirectory(id, base) ||
      Resolve.asNodeModule(id, root.getParent());
  }

  @debuggable()
  static asDirectory(id:string, root:Path):ResolveResult  {

    let base = root.resolve( id );
    let file = base.resolve('package.json');

    let core;
    if ( (core = Resolve.isResource(file)) || Files.exists(file)) {
      try {
        var body = Resolve.readFile(file, core),
            _package  = JSON.parse(body);
        if (_package.main) {
          return (Resolve.asFile(_package.main, base) ||
                  Resolve.asDirectory(_package.main, base));
        }
        // if no package.main exists, look for index.js
        return Resolve.asFile('index.js', base);
      } catch(ex) {
        throw new ModuleError("Cannot load JSON file", "PARSE_ERROR", ex);
      }
    }
    return Resolve.asFile('index.js', base);
  }

  @debuggable()
  static asFile(id:string, root:Path, ext?:string):ResolveResult {
    let name = Resolve.normalizeName(id, ext || '.js');
    let file = Paths.get(name);

    if ( file.isAbsolute() ) {
      if (!Files.exists(file)) return Resolve.asDirectory(id, root);
    } else  {
      file = root.resolve(name).normalize();
    }
    let core;
    if ((core = Resolve.isResource(file)) || Files.exists(file)) {

      let result = (core) ? file.toString() : file.toFile().getCanonicalPath();

      Debug.log( "file:", result/*, relativeToRoot(file)*/ );

      return {path:result, core:core};
    }
  }

  @debuggable()
  static asCoreModule(id:string, root:Path):ResolveResult|undefined {
    var name = Resolve.normalizeName(id);

    if (Resolve.isResource(name))
      return { path: name, core: true };
  }

  @debuggable(false /*log_result*/)
  static readFile(filename:string|Path, core?:boolean) {
    
    let path = filename.toString();
  
    var input;
    try {
  
      input = (core) ?
        classloader.getResourceAsStream(path) :
        new java.io.FileInputStream(path);
  
      // TODO: I think this is not very efficient
      return new Scanner(input).useDelimiter("\\A").next();
    } catch(e) {
      throw new ModuleError("Cannot read file :" + input, "IO_ERROR", e);
    }
  }

  static isResource( id:string|Path ):boolean {
    var url = classloader.getResource( id.toString() );
    return url!=null;
  }

  static relativeToRoot( p:Path ):Path {
      if( p.startsWith(Require.root)) {
        let len = Paths.get(Require.root).getNameCount();
        p = p.subpath(len, p.getNameCount());//.normalize();
      }
      return p;
  }

  static findRoots(parent:Module) {
      var r = [];
      r.push( Resolve.findRoot( parent ) );
      return r.concat( Require.paths );
  }

  static findRoot(parent:Module):string {
      if (!parent || !parent.id) return Require.root;

      var path = Paths.get( parent.id.toString() ).getParent();

      return (path) ? path.toString() : "";
  }

  static loadJSON(file:string, core?:boolean) {
      let json = JSON.parse(Resolve.readFile(file, core));
      Require.cache[file] = json;
      return json;
  }

  static normalizeName(fileName:string, ext:string = '.js') {
      if (String(fileName).endsWith(ext)) {
        return fileName;
      }
      return fileName + ext;
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
  filename:string;
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

  static _load(file:string, parent:Module, core:boolean, main?:boolean) {
    var module = new Module(file, parent, core);
    var __FILENAME__ = module.filename;
    var body   = Resolve.readFile(module.filename, module.core),
        dir    = Paths.get(module.filename).getParent(),
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
    this.filename = id.toString();

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
    Debug.log( "TRY RESOLVING", id );

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
    const ERR_MSG = 'cannot load module ';

    var file = Require.resolve(id, parent);

    if (!file) {
      if (typeof NativeRequire.require === 'function') {

        Debug.log(ERR_MSG, id, 'defaulting to native');

        try {
            var native = NativeRequire.require(id);
            if (native) return native;
        } catch(e) {
          throw new ModuleError(ERR_MSG + id, "MODULE_NOT_FOUND");
        }
      }

      throw new ModuleError(ERR_MSG + id, "MODULE_NOT_FOUND");
    }

    try {
      if (Require.cache[file.path]) {
        return Require.cache[file.path];
      } else if (String(file.path).endsWith('.js')) {
        return Module._load(file.path, parent, file.core);
      } else if (String(file.path).endsWith('.json')) {
        return Resolve.loadJSON(file.path, file.core);
      }
    } catch(ex) {
      if (ex instanceof java.lang.Exception) {
        throw new ModuleError(ERR_MSG + id, "LOAD_ERROR", ex);
      } else {
        System.out.println(ERR_MSG + id + " LOAD_ERROR");
        throw ex;
      }
    }
  }
}

require   = Require;
module.exports  = Module;
