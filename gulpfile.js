//*************************************
//     REQUIRED
//*************************************
var gulp         = require('gulp'),
    plumber      = require('gulp-plumber'),
    browserSync  = require('browser-sync'),
    uglify       = require('gulp-uglify'),
    pump         = require('pump'),
    rename       = require('gulp-rename');

//*************************************
//     SCRIPT TASK
//*************************************
gulp.task('scripts', function(cb) {
  pump([
    gulp.src(['./*.js', '!./*.min.js', '!./index.js']),
    rename({suffix:'.min'}),
    uglify(),
    gulp.dest('./')
  ], cb);
});

//*************************************
//     HTML TASK
//*************************************
gulp.task('html', function(cb) {
  pump([
    gulp.src('./*.html'),
    pipe(reload({stream:true}))
  ], cb);
});

//*************************************
//     BROWSER-SYNC TASK
//*************************************
gulp.task('browser-sync', function() {
  browserSync.init({
    server:{
      baseDir: "./"
    }
  });
  gulp.watch("./*.html").on('change', browserSync.reload);
});

//*************************************
//     WATCH TASK
//*************************************
gulp.task('watch', function() {
  gulp.watch('./**/*.js', ['scripts']);
})

//*************************************
//     DEFAULT TASK
//*************************************
gulp.task('default', ['scripts', 'browser-sync', 'watch']);
