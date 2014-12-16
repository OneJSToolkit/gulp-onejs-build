'use strict';

module.exports = function(options) {
    var size = require('gulp-size');
    var uglify = require('gulp-uglifyjs');
    var rename = require('gulp-rename');
    var tsc = require('gulp-typescript');
    var git = require('gulp-git');
    var inquirer = require('inquirer');
    var semver = require('semver');
    var prompt = require('gulp-prompt');
    var fs = require('fs');
    var del = require('del');
    var _ = require('lodash');
    var gutil = require('gulp-util');

    var gulp = options.gulp;
    var paths = options.paths;
    var rootDir = options.rootDir;
    var tscOptions = options.tscOptions;
    var gulpTaskOptions = options.gulpTaskOptions;

    var bumpType;
    var newVersion;

    /** Creates a minified version of your application */
    gulp.task('build-app-minify', _.union(['build-app-amd'], gulpTaskOptions['build-app-minify']), function() {
        return gulp.src([paths.app.jsGlob])
            .pipe(uglify())
            .pipe(size({
                gzip: true
            }))
            .pipe(rename('app.min.js'))
            .pipe(gulp.dest(paths.app.min.root));
    });

    /** Copies the minified static files to your application path */
    gulp.task('copy-minified-static-files', _.union(['nuke'], ['copy-minified-static-files']), function() {
        return gulp.src(paths.staticFiles.js)
            .pipe(uglify())
            .pipe(gulp.dest(paths.app.min.root));
    });

    /** Creates the amd distributable directory */
    gulp.task('build-dist-amd', _.union(['build-app-preprocess'], gulpTaskOptions['build-dist-amd']), function() {
        var tsResult = gulp.src(paths.temp.srcGlob)
            // Allow tscOption overrides, but ensure that we're targeting amd
            .pipe(tsc(_.merge(tscOptions, {module: 'amd', declarationFiles: true})));

        tsResult.dts.pipe(gulp.dest(paths.dist.amd));
        return tsResult.js.pipe(gulp.dest(paths.dist.amd));
    });

    /** Creates the commonjs distributable directory */
    gulp.task('build-dist-commonjs', _.union(['build-app-preprocess'], gulpTaskOptions['build-dist-commonjs']), function() {
        var tsResult = gulp.src(paths.temp.srcGlob)
            // Allow tscOption overrides, but ensure that we're targeting commonjs
            .pipe(tsc(_.merge(tscOptions, {module: 'commonjs', declarationFiles: true})));

        tsResult.dts.pipe(gulp.dest(paths.dist.commonjs));
        return tsResult.js.pipe(gulp.dest(paths.dist.commonjs));
    });

    gulp.task('copy-dist-css', _.union(['build-app-preprocess'], gulpTaskOptions['build-app-preprocess']), function() {
        return gulp.src(paths.app.cssGlob)
            .pipe(gulp.dest(paths.dist.amd))
            .pipe(gulp.dest(paths.dist.commonjs));
    });

    gulp.task('copy-dist-templates', _.union(['build-app-preprocess'], gulpTaskOptions['copy-dist-templates']), function() {
        return gulp.src(paths.app.htmlGlob)
            .pipe(gulp.dest(paths.dist.amd))
            .pipe(gulp.dest(paths.dist.commonjs));
    })

    /** Creates both dist flavors */
    gulp.task('build-dist', _.union(['build-dist-commonjs', 'build-dist-amd', 'copy-dist-css', 'copy-dist-templates'], gulpTaskOptions['build-dist']));

    /**
     * This next section of tasks are intentionally a bunch of small tasks
     * so they can play nicely with Gulp's build system.
     * Taks dealing with git, or writing back the package/bower.json files
     * need to be synchronous, ergo the callback usage or sync versions
     * of the node fs methods.
     */

    /** Prompts the user for info about the version */
    gulp.task('prompt-release', _.union(['build-dist'], gulpTaskOptions['prompt-release']), function() {
        var questions = [
            {
                type: 'confirm',
                name: 'isConfirmed',
                message: 'This task will create, tag, and release a new version of your repo based on your current branch.\nEnsure you have already pulled the latest version of your current branch and dist branch or else you may be publishing old bits!\nDo you want to continue?',
            },
            {
                type: 'list',
                name: 'bumpType',
                message: 'What type of version bump is this?',
                choices: ['Major', 'Minor', 'Patch'],
                when: function(answers) {
                    return !!answers.isConfirmed;
                }
            }
        ];

        return gulp.src(paths.staticFiles.npmPackage)
            .pipe(prompt.prompt(questions, function(answers) {
                if (!answers.isConfirmed) {
                    gutil.log(gutil.colors.red('Release cancelled. No tags written.'));
                    process.exit(1);
                }
                bumpType = answers.bumpType;
                writeUpdatedVersionNumbers();
            }));
    });

    /** Temporarily copies the built folder to a temp dir so it will persist
        when switching git branches that have different gitignores */
    gulp.task('pre-release', _.union(['prompt-release'], gulpTaskOptions['pre-release']), function() {
        return gulp.src(paths.dist.glob)
            .pipe(gulp.dest(paths.release.dist));
    });

    gulp.task('pre-release-meta', _.union(['prompt-release'], gulpTaskOptions['pre-release-meta']), function() {
        return gulp.src(paths.dist.metaGlob)
            .pipe(gulp.dest(paths.release.root));
    });

    /** Helper function to bump the version number and write it to the npm package and bower files */
    var writeUpdatedVersionNumbers = function() {
        var packageJson;
        var bowerJson;

        try {
            packageJson = JSON.parse(fs.readFileSync(paths.staticFiles.npmPackage, 'utf8'));
            bowerJson = JSON.parse(fs.readFileSync(paths.staticFiles.bowerPackage, 'utf8'));
        } catch (e) {
            // Do nothing, we just won't write to the files that don't exist
        }

        if (packageJson && bowerJson && (packageJson.version !== bowerJson.version)) {
            gutil.log(gutil.colors.red('Your package.json and bower.json files have different version numbers.'));
            gutil.log(gutil.colors.red('Please reconcile the version numbers and rerun `gulp release`.'));
            process.exit(1);
        }

        if (packageJson) {
            newVersion = semver.inc(packageJson.version, bumpType.toLowerCase());
            packageJson.version = newVersion;
            fs.writeFileSync(paths.staticFiles.npmPackage, JSON.stringify(packageJson, null, 2));
        }
        if (bowerJson) {
            if (!newVersion) {
                newVersion = semver.inc(bowerJson.version, bumpType.toLowerCase());
            }
            bowerJson.version = newVersion;
            fs.writeFileSync(paths.staticFiles.bowerPackage, JSON.stringify(bowerJson, null, 2));
        }
    }

    /** Helper function to generate a git message based on version */
    var generateBumpMessage = function() {
        return 'Version bump to ' + newVersion;
    }

    /** Commits the npm and bower packages with bumped versions */
    gulp.task('commit-bumped-versions', _.union(['prompt-release'], gulpTaskOptions['commit-bumped-versions']), function() {
        return gulp.src([rootDir + '/' + paths.staticFiles.npmPackage, rootDir + '/' + paths.staticFiles.bowerPackage])
            .pipe(git.commit(generateBumpMessage()));
    });

    /** Checks out the git dist branch */
    gulp.task('checkout-dist', _.union(['commit-bumped-versions'], gulpTaskOptions['checkout-dist']), function(cb) {
        git.checkout('dist', function(err) {
            if (err) {
                gutil.log(gutil.colors.red('No dist branch found locally, can\'t complete release task.'));
                process.exit(1);
                return cb(err);
            }
            cb();
        });
    });

    /** Cleans the dist folder before adding the new bits in */
    gulp.task('clean-dist', _.union(['checkout-dist'], gulpTaskOptions['clean-dist']), function(cb) {
        del([paths.dist.gitGlob], cb);
    });

    /** Copies the dist files to their rightful location */
    gulp.task('copy-dist-bits', _.union(['clean-dist'], gulpTaskOptions['copy-dist-bits']), function() {
        return gulp.src(paths.release.distGlob)
            .pipe(gulp.dest(paths.dist.root));
    });

    /** Copies the meta files (package/bower.json) to their rightful location */
    gulp.task('copy-meta-dist-bits', _.union(['clean-dist'], gulpTaskOptions['copy-meta-dist-bits']), function() {
        return gulp.src(paths.release.metaGlob)
            .pipe(gulp.dest(rootDir));
    })

    /** Removes the temporary dist files after copying the new bits */
    gulp.task('clean-temp-bits', _.union(['copy-dist-bits', 'copy-meta-dist-bits'], gulpTaskOptions['clean-temp-bits']), function(cb) {
        del([paths.release.root], cb);
    });

    /** Commits the bower/npm package files and the dist folder */
    gulp.task('commit-dist', _.union(['clean-temp-bits'], gulpTaskOptions['commit-dist']), function() {
        return gulp.src([paths.staticFiles.npmPackage, paths.staticFiles.bowerPackage, paths.dist.gitGlob])
            .pipe(git.commit(generateBumpMessage()));
    });

    /** Creates a git tag with the new version number */
    gulp.task('write-dist-tag', _.union(['commit-dist'], gulpTaskOptions['write-dist-tag']), function(cb) {
        return git.tag('v' + newVersion, generateBumpMessage(), function(err) {
            if (err) {
                gutil.log(gutil.colors.red('Error while writing the new tag. Can\'t complete release task, your branches may be in an unsafe state!'));
                gutil.log(gutil.colors.red(err));
                process.exit(1);
                return cb(err);
            }
            cb();
        });
    });

    /** The main task for bumping versions and publishing to dist branch */
    gulp.task('release', _.union(['write-dist-tag'], gulpTaskOptions['release']), function() {
        gutil.log(gutil.colors.green('Version bumped!'));
        gutil.log(gutil.colors.green('Please run `git push --follow-tags` and `git push --tags` and `npm/bower publish` to make updates available.'));
    });

    /** Builds the minified version of your app */
    gulp.task('build-minify', _.union(['build-app-minify', 'copy-minified-static-files'], gulpTaskOptions['build-minify']));
};
