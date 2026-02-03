// --- CHECK DE DEPENDENCIAS ---
const dependenciasNecesarias = [
    { name: "openai", package: "openai" },
    { name: "@google/generative-ai", package: "@google/generative-ai" },
    { name: "ora", package: "ora" },
    { name: "diff", package: "diff" }
];

const dependenciasFaltantes = [];

dependenciasNecesarias.forEach(dep => {
    try {
        require.resolve(dep.package);
    } catch (e) {
        dependenciasFaltantes.push(dep.package);
    }
});

if (dependenciasFaltantes.length > 0) {
    console.error("\n❌ Faltan dependencias para ejecutar el Orquestador.");
    console.log("🛠️  Por favor, ejecuta el siguiente comando para instalarlas:\n");
    console.log(`npm install ${dependenciasFaltantes.join(" ")}`);
    console.log("\n---------------------------------------------------\n");
    process.exit(1);
}

const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ora = require("ora");
const GNUdiff = require('diff');
const OpenAI = require("openai");

// --- 1. CONFIGURACIÓN DE ARGUMENTOS ---
const args = process.argv.slice(2);
const SESSION_FILE = ".agente_session.json";

if (args.includes("--help") || args.length === 0) {
    console.log(`
        📖 MODO DE USO - Agente Híbrido v2.7
        -----------------------------------------------
        Uso: node gemini-orchestrator.js [OPCIONES] "TAREA"

        Opciones:
        --auto      Ejecuta comandos (como apt) sin preguntar.
        --reset     Borra la sesión guardada y empieza de cero.
        --readonly  Modo de solo lectura (seguridad).
        --dry-run   Simula cambios sin escribir.
    `);
    process.exit(0);
}

if (args.includes("--reset") && fs.existsSync(SESSION_FILE)) {
    fs.unlinkSync(SESSION_FILE);
    console.log("🧹 Memoria de sesión eliminada.");
}

// --- 2. CONFIGURACIÓN DE CONEXIONES ---
const LOCAL_AI_CONFIG = {
    baseURL: "http://localhost:8080/v1",
    apiKey: "TDC_MASTER_KEY_2026"
};

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const localAI = new OpenAI(LOCAL_AI_CONFIG);

// --- 3. VARIABLES GLOBALES ---
const MAX_STEPS = 10;
const DRY_RUN = args.includes("--dry-run");
const AUTO_MODE = args.includes("--auto");
const READ_ONLY = args.includes("--readonly");
const HISTORY_LIMIT = 5;
const TASK = args.filter(a => !a.startsWith("-")).join(" ");
const CONTEXT_THRESHOLD = 12000;
const LIMIT_GEMINI = 10;
const LIMIT_LOCAL = 100;
let currentAIType = "local"; // Por defecto intentamos local


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 4. FUNCIONES DE APOYO ---

async function callModelWithRetry(prompt, retryCount = 0) {
    const spinner = ora("Consultando cerebro...").start();
    try {
        const response = await localAI.chat.completions.create({
            model: "qwen-14b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1
        });
        currentAIType = "local"; // <--- Seteamos el tipo
        spinner.succeed(`[Paso ${stepCount}] Respuesta Local (Qwen)`);
        return response.choices[0].message.content;
    } catch (error) {
        spinner.warn("Local caído. Saltando a Gemini...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            currentAIType = "gemini"; // <--- Seteamos el tipo
            spinner.succeed(`[Paso ${stepCount}] Respuesta Cloud (Gemini)`);
            return result.response.text();
        } catch (geminiError) {
            // ... (manejo de errores de Gemini)
        }
    }
}

async function summarizeContext(longContext) {
    const prompt = `Resume lo esencial de estos archivos leídos. No pierdas rutas ni nombres de funciones:\n\n${longContext}`;
    const result = await callModelWithRetry(prompt);
    return "\n--- Resumen previo ---\n" + result + "\n";
}

function writeAuditLog(entry) {
    const logPath = path.join(__dirname, "agente_auditoria.log");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${entry}\n`);
}

// --- 5. ORQUESTADOR ---
async function runAgente(task) {
    const saved = fs.existsSync(SESSION_FILE) ? JSON.parse(fs.readFileSync(SESSION_FILE)) : null;
    const isSameTask = saved && saved.task === task;

    console.log(`\n🚀 Misión: ${task}`);

    let history = isSameTask ? saved.history : [`Estrategia inicial.`];
    let fileContext = isSameTask ? saved.fileContext : "";
    let stepCount = isSameTask ? saved.stepCount : 0;
    let essentialFiles = isSameTask ? saved.essentialFiles : "";
    let active = true;

    if (!isSameTask) {
        const projectMap = fs.existsSync('project-map.md') ? fs.readFileSync('project-map.md', 'utf8') : "Sin mapa.";
        const plan = await callModelWithRetry(`Mapa:\n${projectMap}\nTarea: "${task}"\nLista 5 archivos clave (CSV).`);
        essentialFiles = plan.trim();
    }

    while (active) {
        stepCount++;

        // Determinamos el límite actual basado en el último motor usado
        const currentLimit = (currentAIType === "local") ? LIMIT_LOCAL : LIMIT_GEMINI;

        // Verificación de límite antes de consultar a la IA
        if (stepCount > currentLimit) {
            console.log(`\n🛑 Límite de seguridad alcanzado para modo ${currentAIType.toUpperCase()} (${currentLimit} pasos).`);
            console.log("💡 Tip: Si estás en remoto, verifica que el túnel SSH esté abierto para usar los 100 pasos de Qwen.");
            saveSession({ task, history, fileContext, stepCount: stepCount - 1, essentialFiles });
            break;
        }

        if (fileContext.length > CONTEXT_THRESHOLD) {
            fileContext = await summarizeContext(fileContext);
        }

        const systemPrompt = `Paso ${stepCount}/${currentLimit}. Misión: ${task}\nArchivos: ${essentialFiles}\nContexto: ${fileContext}\nResponde SOLO JSON: {"thought": "...", "action": "read|patch|write|command|finish", "target": "...", "content": "..."}`;

        const responseText = await callModelWithRetry(systemPrompt + "\nHistorial: " + JSON.stringify(history.slice(-HISTORY_LIMIT)));

        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido.");

            const decision = JSON.parse(jsonMatch[0]);
            console.log(`\n[${stepCount}/${currentLimit}] 🧠 (${currentAIType}): ${decision.thought}`);

            // SEGURIDAD READ-ONLY
            if (READ_ONLY && ["patch", "write", "command"].includes(decision.action)) {
                console.warn(`⚠️ Acción ${decision.action} bloqueada por seguridad.`);
                history.push(`Bloqueado: Intento de ${decision.action} en modo lectura.`);
                saveSession({ task, history, fileContext, stepCount, essentialFiles });
                continue;
            }

            // EJECUCIÓN DE ACCIONES (Read con fix de múltiples archivos)
            if (decision.action === "read") {
                const targets = decision.target.split(',').map(t => t.trim());
                for (const target of targets) {
                    if (fs.existsSync(target)) {
                        const content = fs.readFileSync(target, "utf8");
                        fileContext += `\n[${target}]\n${content}\n`;
                        console.log(`📖 Leyendo: ${target}`);
                    } else {
                        console.warn(`❌ Archivo no encontrado: ${target}`);
                        history.push(`Error: El archivo ${target} no existe.`);
                    }
                }
                history.push(`Leído: ${decision.target}`);
            }
            else if (decision.action === "write" || decision.action === "patch") {
                if (DRY_RUN) {
                    console.log(`🧪 [DRY-RUN] Escribiría en ${decision.target}`);
                } else {
                    let finalContent = decision.content;
                    if (decision.action === "patch") {
                        const old = fs.readFileSync(decision.target, "utf8");
                        finalContent = GNUdiff.applyPatch(old, GNUdiff.parsePatch(decision.content)[0]);
                    }

                    if (decision.target.endsWith(".js")) {
                        const tmp = `.tmp_${path.basename(decision.target)}`;
                        fs.writeFileSync(tmp, finalContent);
                        try { execSync(`node --check ${tmp}`); fs.unlinkSync(tmp); }
                        catch (e) { fs.unlinkSync(tmp); throw new Error("Error de sintaxis JS en el código generado."); }
                    }

                    fs.writeFileSync(decision.target, finalContent);
                    console.log(`✅ Archivo actualizado: ${decision.target}`);
                    writeAuditLog(`MODIFICADO: ${decision.target}`);
                    history.push(`Modificado: ${decision.target}`);
                }
            }
            else if (decision.action === "command") {
                let cmd = decision.target;
                if (cmd.startsWith("apt") && AUTO_MODE) cmd = `sudo ${cmd} -y`;
                console.log(`💻 Ejecutando: ${cmd}`);
                const out = execSync(cmd, { encoding: 'utf-8' });
                history.push(`Comando: ${cmd}. Salida: ${out.substring(0, 50)}...`);
            }
            else if (decision.action === "finish") {
                active = false;
                if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
                console.log("🏁 Misión cumplida. Sesión cerrada.");
            }

            // Guardar progreso después de cada acción exitosa
            if (active) saveSession({ task, history, fileContext, stepCount, essentialFiles });

        } catch (e) {
            console.error(`❌ Error en paso ${stepCount}: ${e.message}`);
            history.push(`Error en paso ${stepCount}: ${e.message}`);
            // Guardamos la sesión con el error para que la IA sepa qué falló en el reintento
            saveSession({ task, history, fileContext, stepCount, essentialFiles });

            // Pequeña espera para no entrar en bucle infinito de errores muy rápido
            await sleep(2000);
        }
    }
}

if (TASK) runAgente(TASK);