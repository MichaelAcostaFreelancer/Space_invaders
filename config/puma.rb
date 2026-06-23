workers = Integer(ENV.fetch('WEB_CONCURRENCY', RUBY_PLATFORM.match?(/mswin|mingw/) ? 0 : 2))
threads_count = Integer(ENV.fetch('MAX_THREADS', 5))
threads threads_count, threads_count

workers workers if workers.positive?
port ENV.fetch('PORT', 3000)
environment ENV.fetch('RACK_ENV', 'development')
