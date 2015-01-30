'use strict';


module.exports = function(grunt){

  grunt.registerMultiTask("cssstats", function() {

    var fs              = require('fs'),
        async           = require('async'),
        _               = require('lodash'),
        cssstats        = require('cssstats'),
        StyleStats      = require('stylestats'),
        handlebars      = require('handlebars'),
        done            = this.async(),
        cssFile         = this.data.src,
        outputFilePath  = this.data.output;


    function readFile(callback) {
      fs.readFile(cssFile, 'utf8', callback);
    }

    function extractCssStats(data, callback) {
      var stats = new cssstats(data, {
        safe: true
      });
      callback(null,stats);
    }

    function extractStyleStats(stats, callback) {
      (new StyleStats(cssFile, {})).parse(function(err, styleStatsData){
        callback(null, stats, styleStatsData);
      })
    }

    function createModel(cssData, styleStatsData, callback) {

      var data = _.chain(cssData.selectors).map(function(key, value) {
        return {
          selector: key.selector,
          specificity: key.specificity_10
        }
      }).compact().value();

      var model = {
        sections: [{
          name: 'Stats',
          page: 'index.html',
          template: 'styleguide/templates/stats.tpl',
          content: {
            report: styleStatsData,
            complexity: data
          }
          }],
        project: grunt.file.readJSON('package.json')
      }
      callback(null, model);
    }

    function writeToFile(err, model) {
      grunt.file.write(outputFilePath, JSON.stringify(model));
      done();
    }

    async.waterfall([
      readFile,
      extractCssStats,
      extractStyleStats,
      createModel
    ], writeToFile );

  });
}
