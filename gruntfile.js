module.exports = function(grunt){

	require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');


    grunt.initConfig({
    	pkg: grunt.file.readJSON('package.json'),
        concat: {
            options: {
                // define a string to put between each file in the concatenated output
                separator: ';\n\n'
            },
            dist: {
				src: [
		            'lib/util.js',
		            'lib/audiosignbroadcaster.js',
		            'lib/audiosignlistener.js',
		            'lib/audiosign.js',
	            ],
		        dest: 'dist/<%= pkg.name %>.js'
		    }
        },

        uglify: {
		  dist: {
		    files: {
		      'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
		    }
		  }
		}
    });

    grunt.registerTask('default', ['concat', 'uglify']);

};