'use strict';

module.exports = function(options) {
    var tsc = require('gulp-typescript');
    var flatten = require('gulp-flatten');
    var _ = require('lodash');

    var karma = options.karma;
    var gulp = options.gulp;
    var paths = options.paths;
    var rootDir = options.rootDir;
    var karmaOptions = options.karmaOptions;
    var tscOptions = options.tscOptions;

    gulp.task('build-test-preprocess', function() {
        return gulp.src(paths.test.glob)
            .pipe(flatten())
            .pipe(gulp.dest(paths.temp.test));
    });

    gulp.task('build-test', ['build-test-preprocess', 'build-app-preprocess', 'build-app-amd', 'copy-app-deps', 'copy-onejs-js']);

    gulp.task('test', ['build-test', 'build-app'], function (done) {
        karma.start(_.merge({
            configFile: rootDir + '/karma.conf.js',
            singleRun: true
        }, karmaOptions), done);
    });
}
