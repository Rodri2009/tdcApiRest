const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = 'project-map.md';

function generateMap() {
    console.log(`🗺️  Generando ${OUTPUT_FILE}...`);

    // Carpetas internas y pesadas que no aportan contexto a la IA
    const alwaysIgnore = [".git", "node_modules", "gemini-env", "package-lock.json", ".bak"];
    let ignorePatterns = [...alwaysIgnore];
    const gitignorePath = path.join(process.cwd(), '.gitignore');

    if (fs.existsSync(gitignorePath)) {
        const filePatterns = fs.readFileSync(gitignorePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        ignorePatterns = [...new Set([...ignorePatterns, ...filePatterns])];
    }

    try {
        const cleanPatterns = ignorePatterns.map(p => p.replace(/\/$/, ""));
        const ignoreArg = `-I "${cleanPatterns.join('|')}"`;

        // Generar el árbol
        const treeOutput = execSync(`tree -a ${ignoreArg} --prune -L 3`, { encoding: 'utf8' });

        // Contar archivos JS (excluyendo node_modules y el entorno virtual)
        const jsCount = execSync(`find . -name "*.js" -not -path "*/node_modules/*" -not -path "*/gemini-env/*" | wc -l`, { encoding: 'utf8' }).trim();

        // Construir el contenido Markdown
        const content = [
            `# 🏗️ Arquitectura del Proyecto: ${path.basename(process.cwd())}`,
            `> **Generado:** ${new Date().toLocaleString()}`,
            `> **Archivos JavaScript detectados:** ${jsCount}`,
            '',
            '## 📂 Estructura de Directorios',
            '```text',
            treeOutput,
            '```',
            '',
            '---',
            '*Este archivo sirve de contexto para el agente Gemini.*'
        ].join('\n');

        fs.writeFileSync(OUTPUT_FILE, content);

        // --- LA PARTE NUEVA ---
        console.log(`✅ ¡Mapa listo! Contenido de ${OUTPUT_FILE}:\n`);

        // Ejecutamos cat directamente desde Node para mostrarlo en la terminal
        // Usamos una línea divisoria para que se vea ordenado
        console.log("\x1b[36m%s\x1b[0m", "=".repeat(process.stdout.columns || 50));
        console.log(fs.readFileSync(OUTPUT_FILE, 'utf8'));
        console.log("\x1b[36m%s\x1b[0m", "=".repeat(process.stdout.columns || 50));

    } catch (error) {
        console.error("❌ Error generando o leyendo el mapa:", error.message);
    }
}

generateMap();