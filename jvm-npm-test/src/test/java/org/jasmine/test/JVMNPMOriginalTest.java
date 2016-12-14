package org.jasmine.test;
import static java.lang.String.format;

import java.nio.file.Path;
import java.nio.file.Paths;

import javax.script.ScriptEngine;
import javax.script.ScriptEngineManager;
import javax.script.ScriptException;

import org.hamcrest.core.IsEqual;
import org.hamcrest.core.IsNull;
import org.junit.After;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

public class JVMNPMOriginalTest {

	final String javascriptDir = Paths.get("src","test","javascript").toString();
    
    final Path nashornRequireSpecs	= Paths.get( javascriptDir,	"specs", "nashorn-RequireSpec.js");
    final Path rhinoRequireSpecs	= Paths.get( javascriptDir,	"specs", "rhino-RequireSpec.js");
    
    ScriptEngineManager manager;

    @Ignore
    @Test
    public void dummy() {

    }

    String prevUserDir ;
    
    @Before
    public void initFactory() {
    	System.setProperty("jvm-npm.debug", Boolean.toString(false));
        
        prevUserDir = System.getProperty("user.dir");
        
        manager = new ScriptEngineManager();
        
        Assert.assertThat(manager , IsNull.notNullValue());

    }

    @After
    public void releaseFactory() {

        System.setProperty("user.dir", prevUserDir);
        
    }

    @Test
    public void nashorn_npm_js_test() throws ScriptException{
        final ScriptEngine nashorn = manager.getEngineByName("nashorn");

        Assert.assertThat(nashorn , IsNull.notNullValue());
        
        nashorn.eval( format("load('%s');", nashornRequireSpecs) );

        
    }
     
    @Test
    public void rhino_jsr223_npm_js_test() throws ScriptException{
        final ScriptEngine rhino = manager.getEngineByName("rhino-npm");

        Assert.assertThat(rhino , IsNull.notNullValue());
        
        rhino.eval( format( "load('%s');", rhinoRequireSpecs) );
      
    }
    
    
    @Test //@Ignore
    public void nashorn_classloader_load_test() throws ScriptException{
        final ScriptEngine nashorn = manager.getEngineByName("nashorn");

        Assert.assertThat(nashorn , IsNull.notNullValue());
        
        
        System.setProperty("jvm-npm.debug", Boolean.toString(true));
        final Object o = nashorn.eval( "load('classpath:nashorn-requireSpecCL.js');" );
        
        Assert.assertThat( o, IsNull.notNullValue());
        //Assert.assertThat( String.valueOf(o), IsEqual.equalTo("HELLO MODULE LOADED FORM CLASSPATH"));
    }
    

}
