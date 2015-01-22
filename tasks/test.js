'use strict';

module.exports = function(options) {
    var tsc = require('gulp-typescript');
    var _ = require('lodash');
    var tslint = require('gulp-tslint');

    var karma = options.karma;
    var gulp = options.gulp;
    var paths = options.paths;
    var rootDir = options.rootDir;
    var karmaOptions = options.karmaOptions;
    var tscOptions = options.tscOptions;
    var tsLintOptions = options.tsLintOptions;

    gulp.task('build-test-preprocess', _.union(['clean'], gulpTaskOptions(['build-test-preprocess'])), function() {
        return gulp.src(paths.test.glob)
            .pipe(gulp.dest(paths.temp.test))
            .pipe(tslint(tsLintOptions))
            .pipe(tslint.report('verbose'));
    });

    gulp.task('build-test', _.union(['build-test-preprocess', 'build-app-preprocess', 'build-app-amd', 'copy-app-deps'], gulpTaskOptions(['build-test'])));

    gulp.task('test', _.union(['build-test', 'build-app'], gulpTaskOptions(['test'])), function (done) {
        karma.start(_.merge({
            configFile: rootDir + '/karma.conf.js',
            singleRun: true
        }, karmaOptions), done);
    });
}
