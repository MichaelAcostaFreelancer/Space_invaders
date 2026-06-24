require 'sinatra/base'
require 'json'

class SpaceInvadersApp < Sinatra::Base
  set :root, __dir__
  set :public_folder, File.expand_path('public', __dir__)
  set :views, File.expand_path('views', __dir__)
  set :protection, except: [:host_authorization]

  # Logging en producción para facilitar debug
  configure :production do
    set :logging, true
  end

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

# Permite correr tanto con `ruby app.rb` como con `rackup config.ru`
# run! solo se activa si este archivo es el punto de entrada directo
if $PROGRAM_NAME == __FILE__
  port = ENV.fetch('PORT', 4567).to_i
  SpaceInvadersApp.run!(
    host: '0.0.0.0',
    port: port
  )
end