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
    var path = require('path');

    var gulp = options.gulp;
    var paths = options.paths;
    var autoprefixerOptions = options.autoprefixerOptions;
    var tscOptions = options.tscOptions;
    var tsLintOptions = options.tsLintOptions;
    var gulpTaskOptions = options.gulpTaskOptions;

    /** Removes all built files, keeping only source */
    gulp.task('nuke', _.union(['clean'], gulpTaskOptions['nuke']), function(cb) {
        del([
            paths.dist.root,
        ], cb);
    });

    /** Removes all built files EXCEPT dist directory for gulp watch purposes */
    gulp.task('clean', _.union(gulpTaskOptions['clean']), function(cb) {
        del([
            paths.temp.root,
            paths.app.root,
            paths.app.min.root,
            paths.release.root
        ], cb);
    });

    /** Copies app deps to their app path */
    gulp.task('copy-app-deps', _.union(['clean'], gulpTaskOptions['copy-app-deps']), function(cb) {
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

    /** Runs LESS compiler, auto-prefixer, and uglify, then creates js modules and outputs to temp folder */
    gulp.task('build-less', _.union(['clean'], gulpTaskOptions['build-less']), function() {
        return gulp.src(paths.src.lessGlob)
            .pipe(less())
            .pipe(postcss([autoprefixer(autoprefixerOptions)]))
            .pipe(cssMinify())
            .pipe(texttojs({
                template: function (file) {
                    var domUtilsPath = 'onejs/DomUtils';
                    if (paths.app.localRoot) {
                        var localPath = path.join(path.relative(paths.src.root, file.path));
                        domUtilsPath = path.relative(localPath, path.join(domUtilsPath)).replace(/\\/g, '/');
                    }
                    return "define(['" + domUtilsPath + "'], function(DomUtils) { DomUtils.loadStyles(<%= content %>); });";
                }
            }))
            .pipe(gulp.dest(paths.app.localRoot || paths.app.root))
    });

    /** Compiles OneJS html templates */
    gulp.task('build-templates', _.union(['clean'], gulpTaskOptions['build-templates']), function() {
        return gulp.src(paths.src.htmlGlob)
            .pipe(htmlMinify({
                comments: true
            }))
            .pipe(texttojs())
            .pipe(gulp.dest(paths.app.localRoot || paths.app.root));
    });

    /** Copies TypeScript files to temp directory for futher compilation */
        gulp.task('copy-typescript', _.union(['clean'], gulpTaskOptions['copy-typescript']), function () {
            return gulp.src(paths.src.tsGlob)
                .pipe(gulp.dest(paths.temp.localRoot || paths.temp.root));
        });

        /** Lints the source TypeScript files */
        gulp.task('lint-typescript', _.union(gulpTaskOptions['lint-typescript']), function () {
            gutil.log(gutil.colors.gray('Running tslint (using tslint.json) refer to https://github.com/palantir/tslint for more details on each rule.'));
            return gulp.src(paths.src.tsLintGlob)
                .pipe(tslint(tsLintOptions))
                .pipe(tslint.report('verbose'));
        });


    /** Runs the basic pre-processing steps before compilation */
    gulp.task('build-app-preprocess', _.union(['build-templates', 'copy-typescript', 'build-less', 'copy-app-deps', 'lint-typescript'], gulpTaskOptions['build-app-preprocess']));

    /** Runs the TypeScript amd compiler over your application .ts files */
    gulp.task('build-app-amd', _.union(['build-app-preprocess'], gulpTaskOptions['build-app-amd']), function() {
        return gulp.src(paths.temp.tsGlob, { base: paths.temp.root })
            .pipe(through.obj(function (file, encoding, callback) {
                // Mark the file as excluded for piping later
                if (!paths.temp.tsFilter || paths.temp.tsFilter(file)) {
                    this.push(file);
                }
                callback();
            }))
            // Allow tscOption overrides, but ensure that we're targeting amd
            .pipe(tsc(_.merge(tscOptions, { module: 'amd' })))
            .pipe(gulp.dest(paths.app.root));
    });

    /** Runs the TypeScript commonjs compiler over your application .ts files */
    gulp.task('build-app-commonjs', _.union(['build-app-preprocess'], gulpTaskOptions['build-app-amd']), function() {
        return gulp.src(paths.temp.tsGlob, { base: paths.temp.root })
            .pipe(through.obj(function (file, encoding, callback) {
                // Mark the file as excluded for piping later
                if (!paths.temp.tsFilter || paths.temp.tsFilter(file)) {
                    this.push(file);
                }
                callback();
            }))
            // Allow tscOption overrides, but ensure that we're targeting commonjs
            .pipe(tsc(_.merge(tscOptions, { module: 'commonjs' })))
            .pipe(gulp.dest(paths.app.root));
    });

    /** Watches your src folder for changes, and runs the default build task */
    gulp.task('watch', _.union([], gulpTaskOptions['watch']), function() {
        gulp.watch([paths.src.glob, paths.test.glob], ['default']);
    });

    /** Default dev task for building */
    gulp.task('build-app', _.union(['build-app-amd'], gulpTaskOptions['build-app']));

    /** Our default task, but can be overridden by the users gulp file */
    gulp.task('default', _.union(['build-app'], gulpTaskOptions['default']));
};
