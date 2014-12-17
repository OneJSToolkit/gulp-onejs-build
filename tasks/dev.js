'use strict';

module.exports = function(options) {
    var onejsCompiler = require('gulp-onejs-compiler');
    var tsc = require('gulp-typescript');
    var uglify = require('gulp-uglifyjs');
    var del = require('del');
    var less = require('gulp-less');
    var cssMinify = require('gulp-minify-css');
    var postcss = require('gulp-postcss');
    var autoprefixer = require('autoprefixer-core');
    var _ = require('lodash');
    var texttojs = require('gulp-texttojs');
    var htmlMinify = require('gulp-minify-html');
    var tslint = require('gulp-tslint');
    var gutil = require('gulp-util');

    var gulp = options.gulp;
    var paths = options.paths;
    var autoprefixerOptions = options.autoprefixerOptions;
    var tscOptions = options.tscOptions;
    var tsLintOptions = options.tsLintOptions;
    var gulpTaskOptions = options.gulpTaskOptions;

    /** Removes all built files, keeping only source */
    gulp.task('nuke', function(cb) {
        del([
            paths.temp.root,
            paths.app.root,
            paths.app.min.root,
            paths.dist.root,
            paths.release.root
        ], cb);
    });

    /** Symlink for nuke */
    gulp.task('clean', ['nuke']);

    /** Copies app deps to their app path */
    gulp.task('copy-app-deps', ['nuke'], function(cb) {
        _.map(paths.deps, function(value, key) {
            if (value instanceof Array) {
                _.map(value, function(v, k) {
                    gulp.src(key)
                        .pipe(gulp.dest(v));
                });
            } else {
                gulp.src(key)
                    .pipe(gulp.dest(value));
            }
        });
        cb();
    });

    gulp.task('copy-typings-dts', ['nuke'], function() {
        return gulp.src(paths.typings.glob)
            .pipe(gulp.dest(paths.temp.root));
    });

    /** Copies .d.ts files from OneJS to temp path to compile against */
    gulp.task('copy-onejs-dts', ['nuke'], function() {
        return gulp.src(paths.onejsFiles.dts)
            .pipe(gulp.dest(paths.temp.root + 'onejs/'));
    });

    /** Copies static OneJS js files to app path */
    gulp.task('copy-onejs-js', ['nuke'], function() {
        return gulp.src(paths.onejsFiles.js)
            .pipe(gulp.dest(paths.app.root + 'onejs/'));
    });

    /** Runs LESS compiler, auto-prefixer, and uglify, then creates js modules and outputs to temp folder */
    gulp.task('build-less', ['nuke'], function() {
        return gulp.src(paths.src.lessGlob)
            .pipe(less())
            .pipe(postcss([autoprefixer(autoprefixerOptions)]))
            .pipe(cssMinify())
            .pipe(texttojs({
                template: "define(['onejs/DomUtils'], function(DomUtils) { DomUtils.loadStyles(<%= content %>); });"
            }))
            .pipe(gulp.dest(paths.app.localRoot || paths.app.root))
    });

    /** Compiles OneJS html templates */
    gulp.task('build-templates', ['nuke'], function() {
        return gulp.src(paths.src.htmlGlob)
            .pipe(htmlMinify({
                comments: true
            }))
            .pipe(texttojs())
            .pipe(gulp.dest(paths.app.localRoot || paths.app.root));
    });

    /** Copies OneJS TypeScript files to temp directory for futher compilation */
    gulp.task('copy-typescript', ['nuke'], function() {
        gutil.log(gutil.colors.gray('Running tslint (using tslint.json) refer to https://github.com/palantir/tslint for more details on each rule.'));
        return gulp.src(paths.src.tsGlob)
            .pipe(gulp.dest(paths.app.localRoot || paths.temp.root))
            .pipe(tslint(tsLintOptions))
            .pipe(tslint.report('verbose'));
    });

    /** Runs the basic pre-processing steps before compilation */
    gulp.task('build-app-preprocess', _.union(['build-templates', 'copy-typescript', 'build-less', 'copy-onejs-dts', 'copy-typings-dts', 'copy-app-deps', 'copy-onejs-js'], gulpTaskOptions['build-app-preprocess']));

    /** Runs the TypeScript amd compiler over your application .ts files */
    gulp.task('build-app-amd', ['build-app-preprocess'], function() {
        return gulp.src(paths.temp.tsGlob)
            // Allow tscOption overrides, but ensure that we're targeting amd
            .pipe(tsc(_.merge(tscOptions, {module: 'amd'})))
            .pipe(gulp.dest(paths.app.localRoot || paths.app.root));
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
        gulp.watch([paths.src.glob, paths.test.glob], ['default']);
    });

    /** Default dev task for building */
    gulp.task('build-app', ['build-app-amd']);

    /** Our default task, but can be overridden by the users gulp file */
    gulp.task('default', ['build-app']);
};
