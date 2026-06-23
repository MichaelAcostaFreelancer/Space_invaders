require 'sinatra/base'
require 'json'

class App < Sinatra::Base
  set :public_folder, File.expand_path('../public', __dir__)

  get '/' do
    content_type 'text/html'
    File.read(File.expand_path('../index.html', __dir__))
  end

  get '/health' do
    content_type :json
    { status: 'ok', game: 'space-invaders-remastered' }.to_json
  end

  get '/api/health' do
    content_type :json
    { status: 'ok', game: 'space-invaders-remastered' }.to_json
  end
end
