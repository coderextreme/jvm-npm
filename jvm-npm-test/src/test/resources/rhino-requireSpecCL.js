/**
 *
 * JASMINE TEST FOR RHINO + RHINO-NPM & NASHORN WITHOUT NATIVE REQUIRE
 *
 */

var Paths = java.nio.file.Paths,
    System = java.lang.System
        ;


//Load the NPM module loader into the global scope
//load('src/main/javascript/jvm-npm.js');
load('src/main/typescript/dist/jvm-npm.js');

//var cwd = Paths.get(System.getProperty('user.dir'),'src/test/javascript/specs').toString();
//System.setProperty('user.dir', cwd); // set current dir
require.root = "";

//var home = System.getProperty('user.home');
require.paths = [
    //Paths.get(home,".node_modules").toString(),
    //Paths.get(home,".node_libraries").toString()
];


load('src/test/javascript/jvm-jasmine.js');

beforeEach( function() {
  require.cache = [];
});

describe("npm load modules", function() {

	var module = "core-js/es6/promise";
	it("require module " + module, function() {
		require(module);
		expect(Promise).toBeDefined();
	}, {disable:false});


});


report();
