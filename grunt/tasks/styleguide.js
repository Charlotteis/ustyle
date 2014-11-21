"use strict";

// Expose
module.exports = function(grunt){
  grunt.registerMultiTask('dss', 'Parse DSS comment blocks', function(){

    var handlebars = require('handlebars'),
        dss        = require('dss'),
        _          = require('lodash'),
        async      = require('async'),
        promise    = this.async(),
        files      = this.files,
        styleguide = [];

    // Merge task-specific and/or target-specific options with defaults
    var options = this.options({
        template: './template/',
        templateOutput: './docs/',
        templateIndex: 'index.handlebars',
        defaultPartials: {
          style_block: grunt.file.read('./template/partials/style_block.handlebars'),
          sidebar: grunt.file.read('./template/partials/sidebar.handlebars')
        },
        parsers: {
          section: function(i, line, block){ return line; }
        }
    });

    function addParsers(parsers){
      for(var key in parsers){
        dss.parser(key, options.parsers[key]);
      }
    }

    addParsers(options.parsers);

    async.waterfall([
      parseDSS,
      groupDSS,
      generateStyleguide
    ], completeTask);

    function completeTask(){
      promise();
    }

    function parseDSS(callback){
      var styleguide = [];

      async.forEach(files[0].src, function(f){
        var filename = f;

        grunt.log.writeln('• ' + grunt.log.wordlist([filename], {color: 'cyan'}));

        dss.parse(grunt.file.read(filename), { file: filename }, function(parsed) {

          // Continue only if file contains DSS annotation
          if (parsed.blocks.length) {
            // Add filename
            parsed['file'] = filename;
            // Add comment block to styleguide
            parsed.blocks.map(function(block){
              block['file'] = filename;
              // Normalize @state and @variable to array
              ['state', 'variable'].forEach(function(prop) {
                if (block.hasOwnProperty(prop) && typeof block[prop].slice !== 'function') {
                  block[prop] = [block[prop]];
                }
              });

              if(block.markup){
                block.markup.escaped = removeModifiersFromMarkup(block.markup.escaped);  
              }

              if(block.hasOwnProperty('state')){
                block.state.map(function(state){
                  state.markup = {
                    example: addStateToExample(block.markup.example, state.escaped)
                  }
                })
              }
            });
            styleguide.push(parsed.blocks);
          }
        });
      });
      callback(null, styleguide);
    }

    function groupDSS(styleguide, callback){
      var sections = _.chain(styleguide).flatten().groupBy('section')
                    .map(function(value, key) {
                      return {
                          name: key,
                          blocks: value
                      }
                    })
                    .compact()
                    .value();

      callback(null, sections);
    }

    function generateStyleguide(sections, callback){
      grunt.log.writeln(JSON.stringify(sections))
      sections.map(function(section){

        var templateFilePath = options.template + options.templateIndex,
            outputFilePath = options.templateOutput + section.name.toLowerCase() + '.html';

        var partials = handlebars.registerPartial(options.defaultPartials);

        var html = handlebars.compile(grunt.file.read(templateFilePath))({
          project: grunt.file.readJSON('package.json'),
          section: section
        });

        var outputType = 'created', output = null;

        if (grunt.file.exists(outputFilePath)) {
          outputType = 'overwrited';
          output = grunt.file.read(outputFilePath);
        }
        // avoid write if there is no change
        if (output !== html) {
          // Render file
          grunt.file.write(outputFilePath, html);
          grunt.log.writeln('✓ Styleguide ' + outputType + ' at: ' + grunt.log.wordlist([f.dest], {color: 'cyan'}));
        } else {
          grunt.log.writeln('‣ Styleguide unchanged');
        }
      });
      callback(null, 'done');
    }

    function addStateToExample(markup, state){
      return markup.replace(/{\$modifiers}/g, state);
    }

    function removeModifiersFromMarkup(escaped){
      return escaped.replace(/(\sclass='{\$modifiers}'|\s{\$modifiers})/g, "");
    }

  });

};