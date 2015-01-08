'use strict';

var typeScriptGenerator = require('onejs-compiler').TypeScriptGenerator;
var typeScriptViewModelGenerator = require('onejs-compiler').TypeScriptViewModelGenerator;
var devTasks = require('./tasks/dev.js');
var releaseTasks = require('./tasks/release.js');
var testTasks = require('./tasks/test.js');
var _ = require('lodash');
var fs = require('fs');

module.exports = {
    gulpTasks: {
        paths: {
            // The common directory structure OneJS uses along with some helpful glob patterns
            app: {
                // A website would consume files in this dir
                root: 'app/',
                jsGlob: 'app/**/**/**/!*.test.js',
                cssGlob: 'app/**/**/**/*.css.js',
                htmlGlob: 'app/**/**/**/*.html.js',
                test: 'app/test/',
                distGlob: 'app/**/**/**/*.js',
                min: {
                    root: 'app-min/'
                }
            },
            deps: {},
            dist: {
                // Distributable structure
                root: 'dist/',
                amd: 'dist/amd/',
                commonjs: 'dist/commonjs/',
                glob: 'dist/**/**/**/*',
                metaGlob: ['package.json', 'bower.json'],
                gitGlob: 'dist/*'
            },
            src: {
                // The (non-test) source will live here
                root: 'src/',
                htmlGlob: 'src/**/**/**/*.html',
                lessGlob: 'src/**/**/**/*.less',
                tsGlob: 'src/**/**/**/*.ts',
                glob: 'src/**/**/**/*'
            },
            staticFiles: {
                // Static files that may need to be copied/referenced
                js: [
                    'node_modules/requirejs/require.js'
                ],
                npmPackage: 'package.json',
                bowerPackage: 'bower.json'
            },
            onejsFiles: {
                // OneJS files that will need to be copied during build process
                dts: 'bower_components/onejs/dist/amd/*.ts',
                js: 'bower_components/onejs/dist/amd/*.js'
            },
            release: {
                // These are temp directories that are only used when
                // publishing to a dist branch
                root: 'releaseTemp/',
                dist: 'releaseTemp/dist/',
                distGlob: 'releaseTemp/dist/**/**/**/*',
                metaGlob: 'releaseTemp/*.json',
            },
            temp: {
                // Temp staging dir for building
                root: 'temp/',
                test: 'temp/test/',
                testGlob: 'temp/(*.test.ts|*.Test.ts)',
                typings: 'temp/typings/',
                typingsGlob: 'temp/typings/**/*.d.ts',
                tsGlob: 'temp/**/**/*.ts',
                srcGlob: 'temp/**/**/**/!(*.test.ts|*.js)',
            },
            test: {
                // Test files will live here
                root: 'test/',
                unit: {
                    root: 'test/unit/',
                    glob: 'test/unit/*.ts'
                },
                functional: {
                    root: 'test/functional/',
                    glob: 'test/functional/*.ts'
                },
                glob: 'test/**/*.ts',
                karmaConf: 'karma.conf.js'
            },
            typings: {
                // This dir is to match up with the structure of tsd: https://github.com/DefinitelyTyped/tsd
                root: 'typings/',
                glob: 'typings/**/*.d.ts'
            }
        },
        dev: function(options) {
            // Registers the gulp tasks found in tasks/dev.js
            devTasks(this.mixOptions(options));
        },
        release: function(options) {
            // Registers the gulp tasks found in tasks/release.js and dev.js
            var mixedOptions = this.mixOptions(options);
            devTasks(mixedOptions);
            releaseTasks(mixedOptions);
        },
        test: function(options) {
            // Registers the gulp tasks found in tasks/test.js and dev.js
            var mixedOptions = this.mixOptions(options);
            devTasks(mixedOptions);
            testTasks(mixedOptions);
        },
        all: function(options) {
            // Registers all the gulp tasks found in tasks/*.js
            this.dev(options);
            this.release(options);
            this.test(options);
        },
        mixOptions: function(options) {
            if (!options.gulp || !options.rootDir) {
                console.log('Please provide your gulp and rootDir in the options!');
            }

            // Mix in path options
            this.paths.deps = _.merge(this.paths.deps, options.deps);

            return {
                gulp: options.gulp,
                rootDir: options.rootDir || __dirname,
                paths: options.paths || this.paths,
                karma: options.karma,
                karmaOptions: options.karmaOptions || {},
                autoprefixerOptions: options.autoprefixerOptions || {},
                // Set our default to target ES5, but allow overrides from the user
                tscOptions: _.merge({target: 'ES5'}, options.tscOptions),
                tsLintOptions: options.tsLintOptions || {
                        // Use the default tslint we have set up if no options passed
                        configuration: JSON.parse(fs.readFileSync(__dirname + '/tslint.json'))
                    },
                gulpTaskOptions: options.gulpTaskOptions || {},
            }
        }
    }
};
