'use strict';

module.exports = function(options) {
    var onejsCompiler = require('gulp-onejs-compiler');
    var tsc = require('gulp-typescript');
    var uglify = require('gulp-uglifyjs');
    var del = require('del');
    var less = require('gulp-less');
    var cssMinify = require('gulp-minify-css');
    var csstojs = require('gulp-csstojs');
    var postcss = require('gulp-postcss');
    var autoprefixer = require('autoprefixer-core');
    var _ = require('lodash');
    var flatten = require('gulp-flatten');

    var gulp = options.gulp;
    var paths = options.paths;
    var autoprefixerOptions = options.autoprefixerOptions;
    var tscOptions = options.tscOptions;

    /** Removes all built files, keeping only source */
    gulp.task('nuke', function(cb) {
        del([paths.temp.root, paths.app.root, paths.app.min.root, paths.dist.root], cb);
    });

    /** Cleans the temporary folders */
    gulp.task('clean', function(cb) {
        del([paths.temp.root], cb);
    });

    /** Copies static (non-OneJS) js files to app path */
    gulp.task('copy-static-js', function() {
        return gulp.src(paths.staticFiles.js)
            .pipe(gulp.dest(paths.app.root));
    });

    gulp.task('copy-typings-dts', function() {
        return gulp.src(paths.typings.glob)
            .pipe(gulp.dest(paths.temp.typings));
    });

    /** Copies .d.ts files from OneJS to temp path to compile against */
    gulp.task('copy-onejs-dts', function() {
        return gulp.src(paths.onejsFiles.dts)
            .pipe(gulp.dest(paths.temp.ts + 'onejs/'));
    });

    /** Copies static OneJS js files to app path */
    gulp.task('copy-onejs-js', function() {
        return gulp.src(paths.onejsFiles.js)
            .pipe(gulp.dest(paths.app.root + 'onejs/'));
    });

    /** Copies build dependencies to the temp path */
    gulp.task('copy-build-deps', function() {
        return gulp.src(paths.buildDeps)
            .pipe(gulp.dest(paths.temp.ts));
    });

    /** Runs LESS compiler, auto-prefixer, and uglify, then creates js modules and outputs to temp folder */
    gulp.task('build-less', function() {
        return gulp.src(paths.src.lessGlob)
            .pipe(less())
            .pipe(postcss([autoprefixer(autoprefixerOptions)]))
            .pipe(cssMinify())
            .pipe(csstojs({
                typeScript: true
            }))
            .pipe(flatten())
            .pipe(gulp.dest(paths.temp.ts))
    });

    /** Compiles OneJS html templates */
    gulp.task('build-templates', function() {
        return gulp.src(paths.src.htmlGlob)
            .pipe(onejsCompiler({
                paths: {
                    onejs: './onejs/',
                    defaultView: '{{viewType}}'
                }
            }))
            .pipe(flatten())
            .pipe(gulp.dest(paths.temp.ts));
    });

    /** Copies OneJS TypeScript files to temp directory for futher compilation */
    gulp.task('copy-typescript', function() {
        return gulp.src(paths.src.tsGlob)
            .pipe(flatten())
            .pipe(gulp.dest(paths.temp.ts));
    });

    /** Runs the basic pre-processing steps before compilation */
    gulp.task('build-app-preprocess', ['build-templates', 'copy-typescript', 'build-less', 'copy-onejs-dts', 'copy-typings-dts', 'copy-build-deps']);

    /** Runs the TypeScript amd compiler over your application .ts files */
    gulp.task('build-app-amd', ['build-app-preprocess'], function() {
        return gulp.src(paths.temp.tsGlob)
            // Allow tscOption overrides, but ensure that we're targeting amd
            .pipe(tsc(_.merge(tscOptions, {module: 'amd'})))
            .pipe(gulp.dest(paths.app.root));
    });

    /** Runs the TypeScript commonjs compiler over your application .ts files */
    gulp.task('build-app-commonjs', ['build-app-preprocess'], function() {
        return gulp.src(paths.temp.tsGlob)
            // Allow tscOption overrides, but ensure that we're targeting commonjs
            .pipe(tsc(_.merge(tscOptions, {module: 'commonjs'})))
            .pipe(gulp.dest(paths.app.root));
    });

    /** Watches your src folder for changes, and runs the default build task */
    gulp.task('watch', function() {
        gulp.watch(paths.src.glob, ['default']);
    });

    /** Default dev task for building */
    gulp.task('build-app', ['build-app-amd', 'copy-static-js', 'copy-onejs-js']);

    /** Our default task, but can be overridden by the users gulp file */
    gulp.task('default', ['build-app']);
};
