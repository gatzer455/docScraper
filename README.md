# docScraper
tauri app specifically designed to scrape docs for using then for development with AI

## Características principales
- Extracción de documentación de fuentes web/APIs
- Almacenamiento dual en formatos:
  - JSONL (para procesamiento automatizado)
  - Markdown (para visualización humana)
- Interfaz Tauri multiplataforma

## Formatos de salida

### JSON Lines (.jsonl)
- Estructura por línea: `{"url": "...", "content": "...", "metadata": {...}}`
- Ventajas:
  - Fácil procesamiento incremental
  - Ideal para indexación y búsqueda
  - Mantiene estructura semántica original

### Markdown (.md)
- Organizado por categorías/temas
- Ventajas:
  - Legible directamente
  - Compatible con wikis/documentación
  - Soporta formato básico (encabezados, listas, código)

## Recomendación para indexación

El formato **JSONL es superior para indexación** porque:
1. Conserva metadatos estructurados
2. Permite búsquedas por campos específicos (ej: `url`, `title`)
3. Es más eficiente para procesamiento por lotes
4. Mantiene relaciones semánticas entre elementos