require 'erb'
require 'json'


def content_type_for(path)
  case File.extname(path)
  when '.css'
    'text/css; charset=utf-8'
  when '.js'
    'application/javascript; charset=utf-8'
  when '.json'
    'application/json; charset=utf-8'
  when '.png'
    'image/png'
  when '.jpg', '.jpeg'
    'image/jpeg'
  when '.svg'
    'image/svg+xml'
  when '.ico'
    'image/x-icon'
  when '.wav', '.mp3'
    'audio/mpeg'
  else
    'text/plain; charset=utf-8'
  end
end


def serve_static(path)
  public_root = File.expand_path('../public', __dir__)
  safe_path = path.sub(%r{\A/}, '')
  file_path = File.expand_path(safe_path, public_root)
  return nil unless file_path.start_with?(public_root) && File.file?(file_path)

  [200, { 'Content-Type' => content_type_for(file_path) }, [File.binread(file_path)]]
end


def render_index
  template_path = File.expand_path('../views/index.erb', __dir__)
  body = ERB.new(File.read(template_path)).result
  [200, { 'Content-Type' => 'text/html; charset=utf-8' }, [body]]
end


Handler = lambda do |event, _context|
  method = (event['httpMethod'] || 'GET').upcase
  path = event['path'] || '/'

  return {
    statusCode: 405,
    headers: { 'Content-Type' => 'text/plain; charset=utf-8' },
    body: 'Method not allowed'
  } unless %w[GET HEAD].include?(method)

  if path == '/health' || path == '/api/health'
    return {
      statusCode: 200,
      headers: { 'Content-Type' => 'application/json; charset=utf-8' },
      body: { status: 'ok', game: 'space-invaders-remastered' }.to_json
    }
  end

  if path.start_with?('/css/') || path.start_with?('/js/') || path.start_with?('/assets/') 
    status, headers, body = serve_static(path)
    return {
      statusCode: status,
      headers: headers,
      body: body.join
    } if status
  end

  status, headers, body = render_index
  {
    statusCode: status,
    headers: headers,
    body: body.join
  }
end
