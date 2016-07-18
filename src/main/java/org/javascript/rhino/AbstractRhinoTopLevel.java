/*
 * Copyright 2016 softphone.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.javascript.rhino;

import java.io.IOException;
import java.io.PrintWriter;
import static java.lang.String.format;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.mozilla.javascript.Context;
import org.mozilla.javascript.Function;
import org.mozilla.javascript.ImporterTopLevel;
import org.mozilla.javascript.Scriptable;
import org.mozilla.javascript.ScriptableObject;
import static org.mozilla.javascript.ScriptableObject.DONTENUM;
import static org.mozilla.javascript.ScriptableObject.getObjectPrototype;

/**
 *
 * @author softphone
 */
public abstract class AbstractRhinoTopLevel extends ImporterTopLevel {

    /**
     * 
     * @param <T>
     * @param thisObj
     * @return 
     */
    protected static <T extends AbstractRhinoTopLevel> T deref(Scriptable thisObj) {
        AbstractRhinoTopLevel _this = null;

        if( thisObj instanceof AbstractRhinoTopLevel ) {
            _this = (AbstractRhinoTopLevel) thisObj;
        }
        else {

            final Scriptable protoObj = thisObj.getPrototype();
            if( protoObj instanceof AbstractRhinoTopLevel ) {
                _this = (AbstractRhinoTopLevel) protoObj;
            }
            else {
                throw new IllegalStateException( "cannot deref thisObj to  AbstractRhinoTopLevel!");
            }
        }
        
        return (T) _this;
    }


    /**
     * print function exported to javascript
     *
     * @param cx
     * @param thisObj
     * @param args
     * @param funObj
     */
    protected void _print(PrintWriter out, Context cx, Object[] args, Function funObj) {
        if (args == null) {
            return;
        }

        int row = 0;
        for (Object arg : args) {

            if (row++ > 0) {
                out.print(" ");
            }
            // Convert the arbitrary JavaScript value into a string form.
            out.print(Context.toString(arg));
        }

        out.println();
        out.flush();
    }
    
    private final java.util.Set<String> moduleCache = new java.util.HashSet<>();

    
    private Path normalizeModuleName( String moduleName ) {

        Path modulePath = Paths.get( moduleName );
        
        if( modulePath.startsWith("classpath:") ) {
            
            return modulePath.subpath(1,modulePath.getNameCount());
        }
        
        return modulePath;
        
        
    }
    /**
     * 
     * @param cx
     * @param module 
     */
    protected void _load(Context cx, Object[] args, Function funObj) {
        if (args == null) {
            return;
        }

        for( Object arg :  args ) {
            
            final String module = normalizeModuleName(Context.toString(arg)).toString();

            if( moduleCache.contains(module)) {
                break;
            }

            final ClassLoader cl = Thread.currentThread().getContextClassLoader();

            final java.io.InputStream is = cl.getResourceAsStream(module);
            if (is != null) {

                try {
                    cx.evaluateReader(this, new java.io.InputStreamReader(is), module, 0, null);

                    moduleCache.add( module );

                } catch (IOException e) {
                    throw new RuntimeException(format("error evaluating module [%s]", module), e);
                }

            } else { // Fallback

                final java.io.File file = new java.io.File(module);

                if (!file.exists()) {
                    throw new RuntimeException(format("module [%s] doesn't exist!", module));
                }
                if (!file.isFile()) {
                    throw new RuntimeException(format("module [%s] is not a file exist!", module));
                }

                try( java.io.FileReader reader = new java.io.FileReader(file) ) {

                    cx.evaluateReader(this, reader, module, 0, null);

                    moduleCache.add( module );

                } catch (IOException e) {
                    throw new RuntimeException(format("error evaluating module [%s]", module), e);
                }

            }
        }
    }
    
    /**
     *
     * @param cx
     * @param sealed
     */
    public AbstractRhinoTopLevel(Context cx) {
        this(cx, false);
    }

    /**
     *
     * @param cx
     * @param sealed
     */
    public AbstractRhinoTopLevel(Context cx, boolean sealed) {
        super(cx, sealed);

    }

    @Override
    public void initStandardObjects(Context cx, boolean sealed) {
        super.initStandardObjects(cx, sealed);
        final String[] names = { "print", "load"};

        defineFunctionProperties(names, getClass(), ScriptableObject.DONTENUM);

        final ScriptableObject objProto = (ScriptableObject) getObjectPrototype(this);
        objProto.defineFunctionProperties(names, getClass(), DONTENUM);

    }
    
}
