require 'sinatra/base'
require 'json'

class SpaceInvadersApp < Sinatra::Base
  set :root, __dir__
  set :public_folder, File.expand_path('public', __dir__)
  set :views, File.expand_path('views', __dir__)
  set :protection, except: [:host_authorization]

  get '/' do
    erb :index
  end

  get '/health' do
    content_type :json
    { status: 'ok', game: 'space-invaders-remastered' }.to_json
  end

  not_found do
    status 404
    erb :index
  end
end
