/**
 *
 * JVM-NPM THAT LOOKUP MODULES EXCLUSIVELY IN CLASSPATH
 *
 */
declare namespace java {
    namespace lang {
        var System: any;
        var Thread: any;
        var Exception: any;
        var Thread: any;
        var Boolean: any;
    }
    namespace io {
        var File: any;
        var FileInputStream: any;
    }
    namespace nio {
        namespace file {
            interface Path {
                toString(): string;
                normalize(): Path;
                resolve(p: string|Path): Path;
                getParent(): Path;
                startsWith(p: Path|string): boolean;
                subpath(s:number, e:number): Path;
                getNameCount(): number;
                isAbsolute():boolean;
                toFile():any;
            }
            interface Paths {
              	get(first:string, ...args: string[]):Path
            }
            interface Files {
              exists(path:Path , options?:any);
            }
            var Files:Files;
            var Paths:Paths;
        }
    }
    namespace util {
        var Scanner: any;
    }
}
interface FunctionConstructor {
    new (args: string[], body: string): Function;
}
interface String {
    endsWith(suffix: string): boolean;
}

type ResolveResult = {
  path:string;
  core?:boolean;
}

declare function print(...args: Object[]): any;
declare var module: any;
declare var require: Function;
declare var NativeRequire: any;

type Path = java.nio.file.Path;
