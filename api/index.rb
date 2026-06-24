require 'erb'
require 'json'

Handler = Proc.new do |request, response|
  path = request.path.to_s

  case path
  when '/health'
    response.status = 200
    response['Content-Type'] = 'application/json'
    response.body = JSON.generate({ status: 'ok', game: 'space-invaders-remastered' })

  else
    # Renderiza views/index.erb desde la raíz del proyecto
    project_root = File.expand_path('../', __dir__)
    template_path = File.join(project_root, 'views', 'index.erb')

    if File.exist?(template_path)
      html = ERB.new(File.read(template_path)).result(binding)
      response.status = 200
      response['Content-Type'] = 'text/html; charset=utf-8'
      response.body = html
    else
      response.status = 404
      response['Content-Type'] = 'text/plain'
      response.body = 'Not found'
    end
  end
end