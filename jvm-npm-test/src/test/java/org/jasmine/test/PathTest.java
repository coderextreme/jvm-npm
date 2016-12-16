package org.jasmine.test;

import java.nio.file.Path;
import java.nio.file.Paths;

import org.hamcrest.core.Is;
import org.hamcrest.core.IsEqual;
import org.junit.Assert;
import org.junit.Ignore;
import org.junit.Test;

public class PathTest {
	
	final Path userdir = Paths.get( System.getProperty("user.dir"));
	
    @Ignore
    @Test
    public void dummy() {}

    @Test
    public void tests() {
    	
    	
    	final Path p = userdir.resolve("softphone");
    	
    	final Path pp = Paths.get(userdir.toString(), "softphone");
    	
    	Assert.assertThat( p, IsEqual.equalTo(pp));

    	System.out.println(p);
    	
    	final Path a = Paths.get( "/test/a");
    	
    	Assert.assertThat( a.isAbsolute(), Is.is(true));
    }
}
