lib_path = File.join(File.dirname(__FILE__), 'lib')
$:.unshift(lib_path) unless $:.include?(lib_path)

require 'botoenv'
Botoenv.load

require 'ustyle'
require 'ustyle/deploy'
require 'autoprefixer-rails'
require 'aws/s3'
require 'mime/types'
require 'fileutils'

namespace :ustyle do
  desc "Publishes uStyle v#{Ustyle::VERSION}"
  task :publish => [ "version:check",
                     "version:update",
                     "git:push",
                     "build:images",
                     "deploy:images", "deploy:stylesheets", "deploy:styleguide"
                    ] do
    puts green("Publishing uStyle v#{Ustyle::VERSION}")
  end
end

namespace :version do
  desc "Check version before publishing"
  task :check do
    latest_version = `git describe --abbrev=0 --tags`.gsub(/(v|\n)/, "")

    if Ustyle::VERSION == latest_version
      raise red("You haven't updated the uStyle version from #{Ustyle::VERSION}, please do so before publishing")
    end
  end

  desc "Update version"
  task :update do
    `npm version #{Ustyle::VERSION} -m "Version %s"`
  end
end

namespace :git do
  desc "Push version #{Ustyle::VERSION} to github"
  task :push do
    `git push && git push --tags`
  end
end

namespace :build do
  desc "Building images and hashing them"
  task :images do
    images_dir = File.join Ustyle.assets_path, "images"
    FileUtils.rm_r "build/images"
    FileUtils.cp_r images_dir, "build"
    
    Dir["build/images/**/*"].each do |file|
      next if File.directory?(file)
      FileUtils.mv file, Ustyle.asset_digest(file), force: true
    end
  end
end

namespace :deploy do
  desc "Deploy stylesheet to S3"
  task :stylesheets do
    Ustyle.s3_connect!
    stylesheets = ["ustyle-latest.css", "ustyle-content.css", "ustyle-icons.css"]

    stylesheets.each do |stylesheet|
      Ustyle.s3_upload( Ustyle.versioned_path(stylesheet), "build/#{stylesheet}", "text/css" )
      Ustyle.s3_upload( "ustyle/#{stylesheet}", "build/#{stylesheet}", "text/css" )
    end

    Ustyle.invalidate( ["ustyle/ustyle-latest.css", "ustyle/ustyle-content.css", "ustyle/ustyle-icons.css"] )
  end

  desc "Deploy images to S3"
  task :images do
    Ustyle.s3_connect!
    Dir["build/images/**/*"].each do |file|
      next if File.directory?(file)
      stripped_name = file.gsub(/^build\//, "")
      content_type = Ustyle.mime_type_for(stripped_name)
      Ustyle.s3_upload( Ustyle.versioned_path(stripped_name), file, content_type)
    end
  end

  task :styleguide do
    Ustyle.s3_connect!
    Dir["build/docs/**/*"].each do |file|
      next if File.directory?(file)
      stripped_name = file.gsub(/^build\/docs\//, "")
      content_type = Ustyle.mime_type_for(stripped_name)
      Ustyle.s3_upload( stripped_name, file, content_type, "ustyle.uswitchinternal.com" )
    end
  end
end

def colorize(text, color_code)
  "\e[#{color_code}m#{text}\e[0m"
end

def red(text); colorize(text, 31); end
def green(text); colorize(text, 32); end