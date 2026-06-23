# SPACE INVADERS REMASTERED

Juego arcade inspirado en el clásico Space Invaders.

## 🎮 Descripción

Remake del clásico Space Invaders con estética pixel art, controles táctiles y soporte completo para PC y móvil.

## 🕹️ Controles

### PC
- ← → mover
- Espacio disparar

### Móvil
- Botones táctiles en pantalla

## 🚀 Características
- 10 niveles progresivos
- Jefes con dificultad aumentada
- Power-ups raros
- Estilo pixel art retro
- Sonido arcade clásico
- Soporte móvil completo

## 📦 Instalación

```bash
bundle install
```

## ▶️ Ejecución local

```bash
bundle exec ruby app.rb -p 4567
```

## 🌐 Deploy en Render

1. Subir el repositorio a GitHub
2. Crear un nuevo Web Service en Render
3. Conectar el repositorio
4. Usar el comando de inicio: `bundle exec ruby app.rb -p $PORT`
5. El puerto se asigna automáticamente por Render

## 🧰 Configuración para Render

- El proyecto ya incluye [app.rb](app.rb), [config.ru](config.ru) y [Procfile](Procfile)
- Render puede servir la app con Puma/Sinatra directamente
- Los assets estáticos quedan en [public](public)

## 📁 Estructura

- /public
- /api
- index.html
- vercel.json

## 🧠 Notas

El juego se adapta automáticamente a cualquier pantalla. En móvil, el panel de información queda disponible con scroll y los controles táctiles permanecen fijos en la parte inferior.
