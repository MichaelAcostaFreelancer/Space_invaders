$env:PATH = "C:\Ruby34-x64\bin;" + $env:PATH
Write-Host "Usando Ruby: $(ruby -v)"
bundle exec puma -b tcp://0.0.0.0:4567 config.ru