<h1>DocScraper</h1>

import { useState } from 'react'
import './App.css'; // Puedes añadir estilos básicos aquí
import { runScraper } from './scraper';


function App() {

  // Estados para el formulario 

  const [projectName, setProjectName] = useState('TauriDocs');
  const [baseUrl, setBaseUrl] = useState('https://v2.tauri.app');
  const [startPaths, setStartPaths] = useState('https://v2.tauri.app/start/');
  const [maxPages, setMaxPages] = useState(5);

  // Estados para control y feedback
  const [status, setStatus] = useState('Listo para comenzar')
  const [isScraping, setIsScraping] = useState(false)

  // Manejar el inicio del scraping
  const handleStartScrape = async () => {
    if (isScraping) return
    // Validación básica
    if (!projectName.trim()) {
      setStatus('Error: El nombre del proyecto es obligatorio')
      return
    }

    if (!baseUrl.trim()) {
      setStatus('Error: La URL base es obligatoria')
      return
    }

    try {
      // Verificar que la URL base sea válida
      new URL(baseUrl)
    } catch (e) {
      setStatus('Error: La URL base no es válida')
      return
    }

    const paths = startPaths
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)

    if (paths.length === 0) {
      setStatus('Error: Al menos una ruta de inicio es obligatoria')
      return
    }

    if (maxPages <= 0) {
      setStatus('Error: El numero máximo de páginas debe ser mayor a 0')
      return
    }

    // Todo validado, comenzar scraping
    setIsScraping(true)

    try {
      // LLamar a la función de scraping
      await runScraper(
        {
          projectName,
          baseUrl,
          startPaths: paths,
          maxPages
        },
        // Pasar la función seStatus para actualizacipon directa
        setStatus
      )

      // Al final, mostrar un mensaje de éxito
      setStatus(prevStatus => `${prevStatus}\n\nScraping completado con éxito!`)
    } catch (error) {
      setStatus(`Error durante el scraping: ${error}`)
      console.error('Error durante el scraping:', error)
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="container">
      <h1>Docs Scraper</h1>
      <p className="subtitle">Herramienta para extraer documentación técnica</p>
      
      <div className="form-container">
        <div className="input-group">
          <label htmlFor="projectName">Nombre del Proyecto:</label>
          <input
            id="projectName"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            disabled={isScraping}
            placeholder="Mi Proyecto"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="baseUrl">URL Base:</label>
          <input
            id="baseUrl"
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            disabled={isScraping}
            placeholder="https://ejemplo.com"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="startPaths">Rutas de Inicio (una por línea):</label>
          <textarea
            id="startPaths"
            value={startPaths}
            onChange={(e) => setStartPaths(e.target.value)}
            disabled={isScraping}
            rows={3}
            placeholder="/docs\n/guide\n/api"
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="maxPages">Número Máximo de Páginas:</label>
          <input
            id="maxPages"
            type="number"
            value={maxPages}
            onChange={(e) => setMaxPages(parseInt(e.target.value, 10) || 1)}
            disabled={isScraping}
            min="1"
            max="500"
          />
        </div>
        
        <button 
          onClick={handleStartScrape}
          disabled={isScraping}
          className={isScraping ? "button-scraping" : "button-ready"}
        >
          {isScraping ? 'Scraping en Progreso...' : 'Iniciar Scraping'}
        </button>
      </div>
      
      <div className="status-container">
        <h3>Estado:</h3>
        <pre className="status-text">{status}</pre>
      </div>
    </div>
  )
}

export default App