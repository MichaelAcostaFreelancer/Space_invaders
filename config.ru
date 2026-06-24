require_relative 'app'

# Asegura que Sinatra no intente iniciar su propio servidor interno
# cuando corre bajo Puma/rackup
SpaceInvadersApp.set :run, false
SpaceInvadersApp.set :environment, ENV.fetch('RACK_ENV', 'production').to_sym

run SpaceInvadersApp