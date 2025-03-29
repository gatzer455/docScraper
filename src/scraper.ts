// src/scraper.ts

import { fetch } from '@tauri-apps/plugin-http';
import { writeTextFile, mkdir} from '@tauri-apps/plugin-fs';
import { path } from '@tauri-apps/api';

interface ScrapeConfig {
    projectName: string;
    baseUrl: string;
    startPaths: string[];
    maxPages: number;
}

interface ScrapeResult {
    url: string;
    title: string;
    content: string;
}

// Función para extraer datos del HTML
function extractDataFromHtml(html: string, url: string): { title: string; content: string; links: string[] } {
    // Utilizamos DOMParser que esta disponible en el contexto del webview
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    //Extrear el titulo
    const title = doc.querySelector('title')?.textContent || 'Sin título';

    // Para el contenido principal, intentamos localizar elementos comunes de documentación
    let content = '';
    const mainElement =
        doc.querySelector('main') ||
        doc.querySelector('article') ||
        doc.querySelector('.content') ||
        doc.querySelector('.documentation') ||
        doc.body;

    if (mainElement) {
        // Limpiamos algo del contenido
        // Eliminamos scripts y estilos que no nos interesan
        const scripts = mainElement.querySelectorAll('script, style, nav, footer, header');
        scripts.forEach(script => script.remove());

        content = mainElement.textContent?.trim() || '';
    }

    //Extraer enlaces - siguiendo la estructura del dominio
    const links: string[] = [];
    try {
        const baseUrlObj = new URL(url);
        doc.querySelectorAll('a[href]').forEach(a => {
            const href = a.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                try {
                    // Convertir a URL absoluta
                    const absoluteUrl = new URL(href, url). toString();
                    // Solo incluir links del mismo dominio
                    if (absoluteUrl.startsWith(baseUrlObj.origin)) {
                        const normalizedUrl = absoluteUrl.split('#')[0] // Eliminar fragmentos
                        if (!links.includes(normalizedUrl)) {
                            links.push(normalizedUrl);
                        }
                    }
                } catch (e) {
                    // Ignorar URLs inválidas
                    console.warn(`URL invállida: ${href}`, e);
                }
            }
        });
    } catch (error) {
        console.error("Error procesando los enlaces:", error);
    }

    return {title, content, links };
}


// Función principal para ejecutar el scraping
export async function runScraper(config: ScrapeConfig, setStatus: (status: string) => void): Promise<ScrapeResult[]> {
    setStatus (`Iniciando scraping para ${config.projectName}...`);

    // Inicializar estructuras de datods para el rastreo BFS
    const results: ScrapeResult[] = [];
    const queue: string[] = [];
    const visited = new Set<string>();

    // Procesar URLs iniciales
    for (const path of config.startPaths) {
        try {
            const fullUrl = new URL(path, config.baseUrl).toString();
            queue.push(fullUrl);
            visited.add(fullUrl);
        } catch (error) {
            setStatus(`URL inválida: ${path} - ${error}`);
            console.error(`URL inválida: ${path}`, error)
        }
    }
    setStatus ('Cola inicial: ${queue.length} URLs');
    let fetchedPages = 0;

    // Algoritmo BFS para rastrear el sitio
    while (queue.length > 0 && fetchedPages < config.maxPages) {
        const currentUrl = queue.shift();
        if (!currentUrl) continue;

        setStatus(`Scraping (${fetchedPages + 1}/${config.maxPages}): ${currentUrl}`);

        try {
            // Realizr solicitud HTTP usando la API de Tauri v2
            const response = await fetch(currentUrl);

            if (response.ok) {
                // Incrementar contador de páginas procesadas
                fetchedPages++;
                const htmlContent = await response.text() as string;

                // Extraer datos usando el parser
                const extracted = extractDataFromHtml(htmlContent, currentUrl);

                // Guardar los rsultados
                results.push({
                    url: currentUrl,
                    title: extracted.title,
                    content: extracted.content
                });

                // Añadir nuevos enlaces a la cola si no han sido vistidaos
                for (const link of extracted.links) {
                    if (!visited.has(link) && (visited.size + queue.length) < config.maxPages) {
                        visited.add(link);
                        queue.push(link);
                    }
                }

                // Pequeño delay para ser amigable con el servidor
                await new Promise(resolve => setTimeout(resolve, 200));
            } else {
                setStatus(`Error en ${currentUrl}: Respuesta de ${response.status}`);
                console.warn(`Error en ${currentUrl}: Respuesta de ${response.status}`);
            }
        } catch (error) {
            setStatus(`Error procesando ${currentUrl}: ${error}`);
            console.error(`Error fetching ${currentUrl}:`, error);
            // Continuamos con la siguiente URL
        }
    }

    setStatus(`Scraping completado: ${results.length} paginas obtenidas.`);
    
    // Guardar los resultados
    await saveResults(results, config.projectName, setStatus);

    return results;
}

// Función para guardar los resultados en archivos

async function saveResults(results: ScrapeResult[], projectName: string, setStatus: (status: string) => void) {
    try {
        setStatus('Guardando resultados ...');

        //en Tauri v2, es recomendable usar appLocalDataDir para datos de la app
        const appDir = await path.appLocalDataDir();
        const outputDir = await path.join(appDir, 'docs_output');

        //Crear directorio si no existe
        await mkdir(outputDir, { recursive: true });

        // Crear nombres de archivo seguros ocn timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const safeProjectName = projectName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const baseFileName = `${safeProjectName}_${timestamp}`;

        // Guardar como JSONL
        const jsonlPath = await path.join(outputDir, `${baseFileName}_docs.jsonl`);
        const jsonlContent = results.map(r => JSON.stringify(r)).join('\n');
        await writeTextFile(jsonlPath, jsonlContent);

        // Guardaar como Markdown
        const mdPath = await path.join(outputDir, `${baseFileName}_docs.md`);
        let mdContent = `# ${projectName}\n\nDocumentación scrapeada el ${new Date().toLocaleString()}\n\n`;

        for (const result of results) {
            mdContent += `## ${result.title}\n\n`;
            mdContent += `**URL:** [$result.url}](${result.url})\n\n`;
            mdContent += `${result.content}\n\n---\n\n`;
        }

        await writeTextFile(mdPath, mdContent);

        setStatus(`Resultados guardados en: \n- ${jsonlPath}\n- ${mdPath}`);

        // Mostrar un mensaje más visible
        console.log('Archivos guardados en:', outputDir);
    } catch (error) {
        setStatus(`Error guardando resultados: ${error}`);
    }
}


