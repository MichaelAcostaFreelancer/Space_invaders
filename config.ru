require_relative 'app'

SpaceInvadersApp.set :run, false
SpaceInvadersApp.set :environment, ENV.fetch('RACK_ENV', 'production').to_sym

run SpaceInvadersApp