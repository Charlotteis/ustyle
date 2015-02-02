var autoprefixer = require('autoprefixer-core');

module.exports = function(grunt) {
  grunt.initConfig({
    shell: {
      publish : {
        command: 'bundle exec rake ustyle:publish'
      }
    },
    postcss: {
        options: {
            processors: [
              autoprefixer({ browsers: ['last 5 versions', 'Firefox 22', 'Explorer 8', '> 1%', 'Opera 12.1'] }).postcss
            ]
        },
        dist: { src: 'build/**/*.css' }
    },
    watch: {
      options: {
        spawn: false // Very important, don't miss this
      },
      build: {
        files: ['vendor/assets/**/*', 'styleguide/**/*', 'styleguide/build/ustyle.json'],
        tasks: ['styleguide', 'sass', 'coffee', 'sassdoc', 'postcss', 'browserSync-inject', 'cssstats', 'builder']
      },
      scripts: {
        files: ['styleguide/**/*.js', 'vendor/**/*.coffee'],
        tasks: ['concat']
      }
    },
    styleguide: {
      dist: {
        src: 'vendor/assets/stylesheets/ustyle/**/*.scss',
        output: 'build/ustyle.json',
        static: 'styleguide/static/*.tpl'
      }
    },
    cssstats: {
      dist: {
        src: 'build/ustyle-latest.css',
        output: 'build/stats.json'
      }
    },
    builder: {
      dist:{
        files: {
          'build/docs/': 'build/ustyle.json',
          'build/': 'build/stats.json'
        }
      }
    },
    sass: {
      dist: {
        options: {
          loadPath: ['vendor/assets/stylesheets/ustyle', 'styleguide/assets/sass'],
          require: './lib/ustyle.rb',
          style: 'compressed'
        },
        files: {
          'build/ustyle-latest.css': 'vendor/assets/stylesheets/ustyle.scss',
          'build/ustyle-content.css': 'vendor/assets/stylesheets/ustyle-content.scss',
          'build/docs/css/main.css': 'styleguide/assets/sass/main.scss'
        }
      }
    },
    coffee: {
      compile: {
        files: {
          'build/ustyle.js': [
            'vendor/assets/javascripts/ustyle/utils.js.coffee',
            'vendor/assets/javascripts/ustyle/anchor.js.coffee',
            'vendor/assets/javascripts/ustyle/tabs.js.coffee',
            'vendor/assets/javascripts/ustyle/overlay.js.coffee',
          ]
        }
      },
    },
    concat: {
      dist: {
        src: ['styleguide/assets/javascripts/vendor/*.js', 'build/ustyle.js', 'styleguide/assets/javascripts/*.js'],
        dest: 'build/docs/js/app.js'
      }
    },
    sassdoc: {
      default: {
        src: 'vendor/assets/stylesheets/ustyle',
        dest: 'build/docs/sass',
        options: {
          config: "grunt/sassdoc/view.json"
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-sassdoc');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-browser-sync');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-postcss');
  grunt.loadTasks('grunt/tasks');

  grunt.registerTask('build', ['sass', 'coffee', 'sassdoc', 'styleguide', 'concat', 'postcss','cssstats', 'builder']);
  grunt.registerTask('default', ['build', 'browserSync-init', 'watch']);
  grunt.registerTask('publish', ['build', 'shell:publish']);

};