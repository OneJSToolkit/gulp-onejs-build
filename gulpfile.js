'use strict';

var gulp = require('gulp');
var oneJsBuild = require('./index');

oneJsBuild.gulpTasks.release({
    gulp: gulp,
    rootDir: __dirname
});
