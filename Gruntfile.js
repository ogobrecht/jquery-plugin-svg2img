/* global module */
module.exports = function(grunt) {
    "use strict";
    grunt.initConfig({
        pkg: grunt.file.readJSON("package.json"),
        banner: '/**\n' +
            ' * jQuery plugin <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
            ' * <%= pkg.homepage %>\n' +
            ' * Copyright (c) 2017<% parseInt(grunt.template.today("yyyy")) > 2017 ? "-" + grunt.template.today("yyyy") : "" %> <%= pkg.author %> - <%= pkg.license %> license\n' +
            ' */\n',
        bannerMin: '/*! <%= pkg.homepage %> v<%= pkg.version %> <%= pkg.license %> license */',
        jshint: {
            files: [
                "Gruntfile.js",
                "package.json",
                "src/svg2img.js"
            ],
            options: {
                jshintrc: true
            }
        },
        concat: {
            options: {
                banner: "<%= banner %>",
                stripBanners: false,
                process: function(src, filepath) {
                    return "\n/*! @file " + filepath + " */\n\n" +
                        src.replace(
                            /x\.x\.x/g,
                            grunt.template.process("<%= pkg.version %>")
                        );
                }
            },
            dist: {
                src: [
                    "src/svg2img.js",
                    "lib/Blob.js/Blob.js",
                    "lib/canvas-toBlob.js/canvas-toBlob.js",
                    "lib/FileSaver.js/FileSaver.js"
                ],
                dest: "svg2img.js"
            },
        },
        uglify: {
            options: {
                banner: "<%= bannerMin %>",
                preserveComments: "/@source/"
            },
            dist: {
                src: "svg2img.js",
                dest: "svg2img.min.js"
            },
        },
        watch: {
            files: [
                "Gruntfile.js",
                "package.json",
                "src/*",
                "lib/*"
            ],
            tasks: ["jshint", "concat", "uglify"]
        }
    });
    grunt.loadNpmTasks("grunt-contrib-jshint");
    grunt.loadNpmTasks("grunt-contrib-concat");
    grunt.loadNpmTasks("grunt-contrib-uglify");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-notify");
    grunt.registerTask("default", ["jshint", "concat", "uglify"]);
};
