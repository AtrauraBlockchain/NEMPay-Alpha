var gulp = require('gulp');
var notify        = require('gulp-notify');
var source        = require('vinyl-source-stream');
var browserify    = require('browserify');
var babelify      = require('babelify');
var ngAnnotate    = require('browserify-ngannotate');
var browserSync   = require('browser-sync').create();
var gutil = require('gulp-util');
var bower = require('bower');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename = require('gulp-rename');
var templateCache = require('gulp-angular-templatecache');
var uglify        = require('gulp-uglify');
var merge         = require('merge-stream');
var glob          = require('glob');
var sass          = require('gulp-sass');
var sh = require('shelljs');

// Where our files are located
var jsFiles   = "apps/nanowallet/src/app/**/*.js";
var jsFiles2   = "apps/nemPay/app/**/*.js";

var viewFiles = "apps/nanowallet/src/app/**/*.html";
var viewFiles2 = "apps/nemPay/app/**/*.html";

var specFiles = "tests/specs/*.spec.js"
var specsArray = glob.sync(specFiles);

var interceptErrors = function(error) {
var args = Array.prototype.slice.call(arguments);

  // Send error to notification center with gulp-notify
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);

  // Keep gulp from hanging on this task
  this.emit('end');
};

// Task for app files
gulp.task('browserify', ['views'], function() {
  return browserify('./apps/nemPay/app/app.js')
      .transform(babelify, {presets: ["es2015"]})
      .transform(ngAnnotate)
      .bundle()
      .on('error', interceptErrors)
      //Pass desired output filename to vinyl-source-stream
      .pipe(source('main.js'))
      // Start piping stream to tasks!
      .pipe(gulp.dest('./www/'));
});

/* Task for test files
gulp.task('browserifyTests', function() {
  return browserify(specsArray)
      .transform(babelify, {presets: ["es2015"]})
      .transform(ngAnnotate)
      .bundle()
      .on('error', interceptErrors)
      //Pass desired output filename to vinyl-source-stream
      .pipe(source('tests.js'))
      // Start piping stream to tasks!
      .pipe(gulp.dest('./www/tests/'));
});*/


/*Just move files to build*/
gulp.task('html', function() {
  return gulp.src("apps/nanowallet/start.html")
      .on('error', interceptErrors)
      .pipe(rename('index.html'))
      .pipe(gulp.dest('./www/'));
}); 

/*gulp.task('tests', function() {
  return gulp.src("tests/start.html")
      .on('error', interceptErrors)
      .pipe(gulp.dest('./www/tests'));
});*/

  gulp.task('js', function() {
  return gulp.src("apps/nanowallet/vendors/**/*")
      .on('error', interceptErrors)
      .pipe(gulp.dest('./www/vendors'));
});

  gulp.task('sass', function () {
    return gulp.src('apps/nemPay/sass/nano.scss')
      .pipe(sass().on('error', sass.logError))
      .pipe(gulp.dest('./www/css'));
  });

    gulp.task('images', function() {
    return gulp.src("apps/nanowallet/images/**/*")
      .on('error', interceptErrors)
      .pipe(gulp.dest('./www/images'));
});

// Cache template
gulp.task('views', function() {
  return gulp.src([viewFiles,viewFiles2])
      .pipe(templateCache({
        standalone: true
      }))
      .on('error', interceptErrors)
      .pipe(rename("app.templates.js"))
      .pipe(gulp.dest('./apps/nemPay/app/'));
});

// This task is used for building production ready
// minified JS/CSS files into the dist/ folder
gulp.task('build', ['html', 'browserify'], function() {
  var html = gulp.src("build/index.html")
                 .pipe(gulp.dest('./dist/'));

  var js = gulp.src("build/main.js")
               .pipe(uglify())
               .pipe(gulp.dest('./dist/'));

  return merge(html,js);
});

// Run Tasks
gulp.task('default', ['html','js', 'sass', 'images', 'browserify'], function() {

  gulp.watch("www/index.html", ['html']);
  gulp.watch("apps/nempay/sass/**/*.scss", ['sass']);
  gulp.watch(viewFiles2, ['views']);
  gulp.watch(jsFiles2, ['browserify']);

});
