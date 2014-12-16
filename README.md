# [gulp](https://github.com/gulpjs/gulp)-onejs-build
A set of handy gulp tasks to build, test, and release your OneJS project.

## How to use
Install the plugin through npm
`npm install gulp-onejs-build --save-dev`

Add it to your gulpfile.js and register all of the gulp tasks
```javascript
var gulp = require('gulp');
var karma = require('karma').server;
var oneJsBuild = require('gulp-onejs-build');

oneJsBuild.gulpTasks.all({
    gulp: gulp,
    rootDir: __dirname,
    karma: karma
});
```

Run `gulp` at the command line and that's it! For a full listing of all tasks that are registered, run the standard `gulp --tasks`!

## Options
As show in the example above, there are options that you can pass while registering your gulp tasks.

| name | optional | description |
|------|----------|-------------|
| gulp | false | Pass in your local gulp instance so the tasks are registered on the proper instance |
| rootDir | false | The rootdir for your project, generally this is `__dirname` |
| paths | true | If you want to override our path structure, you can do so. This is not recommended as OneJS has an existing, expected directory structure |
| karma | false (for test) | Pass in your local karma instance so tests can be ran properly |
| autoprefixerOptions | true | Options for [gulp-autoprefixer](https://github.com/sindresorhus/gulp-autoprefixer) to help simplify LESS/CSS build steps |
| tscOptions | true | Options for [gulp-typescript](https://github.com/ivogabe/gulp-typescript) |
| deps | true | A map of src globs to destination paths for the build process to copy over before build time |
| tsLintOptions | true | Options for [gulp-tslint](https://www.npmjs.com/package/gulp-tslint) |
| gulpTaskOptions | true | A key -> value pair where the key is the gulp task name and the value is the additional gulp tasks to add as dependencies for that task |

## 4 flavors of gulp tasks
You can register all, or just a subset of the available gulp tasks.

### 1. All
Imports all the tasks available: dev, test, and release.

### 2. Dev
Only imports the gulp tasks needed for development (everything that is in ./tasks/dev.js).

### 3. Test
Imports the gulp tasks needed for testing (everything that is in ./tasks/test.js and ./tasks/dev.js).

### 4. Release
Imports the gulp tasks needed for releasing/publishing to npm/bower (everything that is in ./tasks/release.js and ./tasks/dev.js).
