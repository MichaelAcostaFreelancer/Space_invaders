require 'erb'
require 'json'

Handler = Proc.new do |request, response|
  path = request.path.to_s.split('?').first

  if path == '/health'
    response.status = 200
    response['Content-Type'] = 'application/json'
    response.body = JSON.generate({ status: 'ok', game: 'space-invaders-remastered' })

  else
    # En Vercel, __dir__ es /var/task/api → subimos un nivel para llegar a la raíz
    project_root = File.expand_path('..', __dir__)
    template_path = File.join(project_root, 'views', 'index.erb')

    begin
      html = ERB.new(File.read(template_path)).result(binding)
      response.status = 200
      response['Content-Type'] = 'text/html; charset=utf-8'
      response.body = html
    rescue => e
      # Muestra el error real en vez de 404 silencioso
      response.status = 500
      response['Content-Type'] = 'text/html; charset=utf-8'
      response.body = <<~HTML
        <html><body style="font-family:monospace;padding:2rem">
          <h2>Deploy error — revisa Vercel logs</h2>
          <pre>#{e.class}: #{e.message}

        #{e.backtrace.first(8).join("\n")}</pre>
        </body></html>
      HTML
    end
  end
end