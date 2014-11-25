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

    var gulp = options.gulp;
    var paths = options.paths;
    var rootDir = options.rootDir;
    var tscOptions = options.tscOptions;

    var bumpType;
    var newVersion;

    /** Creates a minified version of your application */
    gulp.task('minify', ['tsc-amd'], function() {
        return gulp.src([paths.app.jsGlob])
            .pipe(uglify())
            .pipe(size({
                gzip: true
            }))
            .pipe(rename('app.min.js'))
            .pipe(gulp.dest(paths.app.min.root));
    });

    /** Copies the minified static files to your application path */
    gulp.task('copy-static-files-minified', function() {
        return gulp.src(paths.staticFiles.js)
            .pipe(uglify())
            .pipe(gulp.dest(paths.app.min.root));
    });

    /** Creates the amd distributable directory */
    gulp.task('dist-amd', ['tsc-preprocess'], function() {
        return gulp.src(paths.temp.tsGlob)
            // Allow tscOption overrides, but ensure that we're targeting amd
            .pipe(tsc(_.merge(tscOptions, {module: 'amd'})))
            .pipe(gulp.dest(paths.dist.amd));
    });

    /** Creates the commonjs distributable directory */
    gulp.task('dist-commonjs', ['tsc-preprocess'], function() {
        return gulp.src(paths.temp.tsGlob)
            // Allow tscOption overrides, but ensure that we're targeting commonjs
            .pipe(tsc(_.merge(tscOptions, {module: 'commonjs'})))
            .pipe(gulp.dest(paths.dist.commonjs));
    });

    /** Creates both dist flavors */
    gulp.task('dist', ['dist-commonjs', 'dist-amd']);

    /**
     * This next section of tasks are intentionally a bunch of small tasks
     * so they can play nicely with Gulp's build system.
     * Taks dealing with git, or writing back the package/bower.json files
     * need to be synchronous, ergo the callback usage or sync versions
     * of the node fs methods.
     */

    /** Temporarily copies the built folder to a temp dir so it will persist
        when switching git branches that have different gitignores */
    gulp.task('pre-release', ['dist'], function() {
        return gulp.src(paths.dist.glob)
            .pipe(gulp.dest(paths.release.root));
    });

    /** Prompts the user for info about the version */
    gulp.task('prompt-release', ['pre-release'], function() {
        var questions = [
            {
                type: 'list',
                name: 'bumpType',
                message: 'What type of version bump is this?',
                choices: ['Major', 'Minor', 'Patch']
            }
        ];

        return gulp.src(paths.staticFiles.npmPackage)
            .pipe(prompt.prompt(questions, function(answers) {
                bumpType = answers.bumpType;
                writeUpdatedVersionNumbers();
            }));
    });

    /** Helper function to bump the version number and write it to the npm package and bower files */
    var writeUpdatedVersionNumbers = function() {
        var packageJson = JSON.parse(fs.readFileSync(paths.staticFiles.npmPackage, 'utf8'));
        var bowerJson = JSON.parse(fs.readFileSync(paths.staticFiles.bowerPackage, 'utf8'));
        newVersion = semver.inc(packageJson.version, bumpType.toLowerCase());

        packageJson.version = newVersion;
        bowerJson.version = newVersion;

        fs.writeFileSync(paths.staticFiles.npmPackage, JSON.stringify(packageJson, null, 2));

        fs.writeFileSync(paths.staticFiles.bowerPackage, JSON.stringify(bowerJson, null, 2));
    }

    /** Helper function to generate a git message based on version */
    var generateBumpMessage = function() {
        return 'Version bump to ' + newVersion;
    }

    /** Commits the npm and bower packages on master */
    gulp.task('commit-master', ['prompt-release'], function() {
        return gulp.src([rootDir + '/' + paths.staticFiles.npmPackage, rootDir + '/' + paths.staticFiles.bowerPackage])
            .pipe(git.commit(generateBumpMessage()));
    });

    /** Checks out the git dist branch */
    gulp.task('checkout-dist', ['commit-master'], function(cb) {
        git.checkout('dist', function(err) {
            if (err) { return cb(err); }
            cb();
        });
    });

    /** Copies the dist files to their rightful location */
    gulp.task('copy-dist-bits', ['checkout-dist'], function() {
        return gulp.src(paths.release.glob)
            .pipe(gulp.dest(paths.dist.root));
    });

    /** Removes the temporary dist files */
    gulp.task('clean-temp-bits', ['copy-dist-bits'], function(cb) {
        del([paths.release.root], cb);
    });

    /** Writes the bower and npm package files with new version number */
    gulp.task('write-version-updates', ['clean-temp-bits'], function() {
        return writeUpdatedVersionNumbers();
    });

    /** Commits the bower/npm package files and the dist folder */
    gulp.task('commit-dist', ['write-version-updates'], function() {
        return gulp.src([paths.staticFiles.npmPackage, paths.staticFiles.bowerPackage, paths.dist.gitGlob])
            .pipe(git.commit(generateBumpMessage()));
    });

    /** Creates a git tag with the new version number */
    gulp.task('write-dist-tag', ['commit-dist'], function(cb) {
        return git.tag('v' + newVersion, generateBumpMessage(), function(err) {
            if (err) { return cb(err); }
            cb();
        });
    });

    /** Checks out back to master branch */
    gulp.task('checkout-master', ['write-dist-tag'], function(cb) {
        return git.checkout('master', function(err) {
            if (err) { return cb(err); }
            cb();
        });
    });

    /** The main task for bumping versions and publishing to dist branch */
    gulp.task('release', ['checkout-master'], function() {
        console.log('Version bumped, please run `git push --tags` and `npm/bower publish` to make updates available.');
    });;

    /** Builds the minified version of your app */
    gulp.task('build-minify', ['minify', 'copy-static-files-minified']);
};
