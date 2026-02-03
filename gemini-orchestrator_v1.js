const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ora = require("ora");
const GNUdiff = require('diff');
const OpenAI = require("openai");

// --- 1. CONFIGURACIÓN DE ARGUMENTOS (Primero definimos args) ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
    console.log(`
        📖 USUARIO Y COMANDOS - Gemini Orchestrator v2.5
        -----------------------------------------------
        Uso: node gemini-orchestrator.js [OPCIONES] "TAREA"

        Opciones:
        --auto      Ejecuta comandos (como apt) sin preguntar.
        --reset     Borra la sesión guardada y fuerza un inicio limpio.
        --dry-run   Simula las acciones pero no escribe nada.
        --readonly  Modo de solo lectura. No modifica archivos.
        --help      Muestra esta ayuda.
    `);
    process.exit(0);
}
// --- 1. CONFIGURACIÓN DE ARGUMENTOS ---
const SESSION_FILE = ".agente_session.json";

// Lógica de Reset: Se ejecuta antes de cualquier otra cosa
if (args.includes("--reset")) {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        console.log("🧹 Memoria de sesión eliminada. Comenzando desde cero...");
    } else {
        console.log("ℹ️ No había ninguna sesión guardada que eliminar.");
    }
}



// --- 2. VARIABLES GLOBALES Y CONFIGURACIÓN ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
const localAI = new OpenAI(LOCAL_AI_CONFIG);

const MAX_STEPS = 10;
const DRY_RUN = args.includes("--dry-run");
const AUTO_MODE = args.includes("--auto");
const READ_ONLY = args.includes("--readonly");
const HISTORY_LIMIT = 5;
const TASK = args.filter(a => !a.startsWith("-")).join(" ");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --- 3. FUNCIONES DE APOYO ---
async function callModelWithRetry(prompt, retryCount = 0) {
    const spinner = ora("Consultando cerebro (Híbrido)...").start();

    try {
        // 1. INTENTO LOCAL (Qwen 14B)
        spinner.text = "Intentando con Qwen 14B (Local)...";
        const response = await localAI.chat.completions.create({
            model: "qwen-14b",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.1, // Baja temperatura para razonamiento técnico
            max_tokens: 2048
        });
        spinner.succeed("Respuesta de Server Local recibida");
        return response.choices[0].message.content;

    } catch (error) {
        // 2. FALLBACK A GEMINI (Si el local falla)
        spinner.warn("Server Local no disponible. Saltando a Gemini Cloud...");

        try {
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(prompt);
            spinner.succeed("Respuesta de Gemini Cloud recibida");
            return result.response.text();

        } catch (geminiError) {
            spinner.fail("Ambos cerebros han fallado.");

            // Manejo de cuota 429 en Gemini (el que ya teníamos)
            if (geminiError.status === 429 && retryCount < 3) {
                const wait = 30000;
                console.log(`Esperando ${wait / 1000}s por cuota...`);
                await new Promise(r => setTimeout(r, wait));
                return callModelWithRetry(prompt, retryCount + 1);
            }
            throw geminiError;
        }
    }
}

function writeAuditLog(entry) {
    const logPath = path.join(__dirname, "agente_auditoria.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${entry}\n`);
}

// --- NUEVA CONFIGURACIÓN ---
const CONTEXT_THRESHOLD = 15000; // ~4000 tokens. Si supera esto, limpiamos.
async function summarizeContext(longContext) {
    const spinner = ora("Limpiando contexto para ahorrar tokens...").start();
    const prompt = `Resume lo esencial de los siguientes archivos leídos para mantener solo la lógica relevante para la tarea. No pierdas detalles de rutas o nombres de funciones críticos:\n\n${longContext}`;

    try {
        // Usamos una llamada directa para no entrar en bucle con el orquestador
        const result = await model.generateContent(prompt);
        spinner.succeed("Contexto optimizado.");
        return "\n--- Resumen de contexto previo ---\n" + result.response.text() + "\n";
    } catch (e) {
        spinner.fail("No se pudo resumir, continuando con contexto completo.");
        return longContext;
    }
}

// --- CONFIGURACIÓN DE CONEXIONES ---
const LOCAL_AI_CONFIG = {
    baseURL: "http://192.168.1.15:8080/v1", // IP de tu server
    apiKey: "TDC_MASTER_KEY_2026"           // La que pongas en el .sh
};


// ---- FUNCIONES DE PERSISTENCIA ---
function saveSession(data) {
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}
function loadSession() {
    if (fs.existsSync(SESSION_FILE)) {
        console.log("📂 Recuperando sesión anterior para continuar el trabajo...");
        return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
    return null;
}

// --- 4. ORQUESTADOR PRINCIPAL ---
async function runAgente(task) {
    const saved = loadSession();

    // 1. DEFINIR ESTADO (Primero definimos si es la misma tarea)
    const isSameTask = saved && saved.task === task;

    console.log(`\n🚀 Misión: ${task}`);
    if (READ_ONLY) console.log("🛡️  MODO SEGURIDAD: Solo lectura activado.");

    let history = isSameTask ? saved.history : [`Estrategia inicial definida.`];
    let fileContext = isSameTask ? saved.fileContext : "";
    let stepCount = isSameTask ? saved.stepCount : 0;
    let essentialFiles = isSameTask ? saved.essentialFiles : "";
    let active = true;

    // 2. FASE DE PLANIFICACIÓN (Solo si no hay sesión previa)
    if (!isSameTask) {
        const projectMap = fs.existsSync('project-map.md') ? fs.readFileSync('project-map.md', 'utf8') : "No hay mapa disponible.";
        const planningSpinner = ora("Planificando estrategia desde cero...").start();

        const planningPrompt = `Mapa del proyecto:\n${projectMap}\nTarea: "${task}"\nIdentifica los 5 archivos clave. Responde SOLO una lista separada por comas (CSV).`;

        try {
            const planningResponse = await callModelWithRetry(planningPrompt);
            essentialFiles = planningResponse.trim();
            planningSpinner.succeed(`Estrategia definida. Archivos clave: ${essentialFiles}`);
        } catch (error) {
            planningSpinner.fail("Error en planificación.");
            throw error;
        }
    } else {
        console.log(`✅ Continuando estrategia previa: ${essentialFiles}`);
    }

    // FASE DE EJECUCIÓN
    while (active && stepCount < MAX_STEPS) {
        stepCount++;

        // --- LÓGICA DEL LIMPIADOR ---
        if (fileContext.length > CONTEXT_THRESHOLD) {
            console.log("♻️  Contexto muy grande. Optimizando...");
            fileContext = await summarizeContext(fileContext);
        }

        const recentHistory = history.slice(-HISTORY_LIMIT);

        let systemPrompt = `
        Eres un Agente en Debian 13. Paso ${stepCount}/${MAX_STEPS}.
        ${READ_ONLY ? "MODO SOLO LECTURA ACTIVADO." : ""}
        Archivos clave: ${essentialFiles}
        Objetivo: ${task}
        Contexto acumulado (resumen): ${fileContext}

        Responde en JSON:
        {
          "thought": "razonamiento",
          "action": "read" | "patch" | "write" | "command" | "finish",
          "target": "ruta o comando",
          "content": "datos"
        }`;

        const responseText = await callModelWithRetry(systemPrompt + "\nHistorial reciente: " + JSON.stringify(recentHistory));

        let decision;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            decision = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("❌ Error de formato JSON.");
            continue;
        }

        console.log(`\n[Paso ${stepCount}] 🧠: ${decision.thought}`);

        try {
            // Protección Read-Only
            if ((decision.action === "patch" || decision.action === "write" || decision.action === "command") && READ_ONLY) {
                console.warn(`⚠️ Acción ${decision.action} bloqueada.`);
                history.push(`Error: No puedes ejecutar ${decision.action} en modo --readonly.`);
                continue;
            }

            if (decision.action === "read") {
                const content = fs.readFileSync(decision.target, "utf8");
                console.log(`📖 Leyendo: ${decision.target}`);
                fileContext += `\n--- ${decision.target} ---\n${content}\n`;
                history.push(`Leído: ${decision.target}`);
            }
            else if (decision.action === "patch" || decision.action === "write") {
                if (DRY_RUN) {
                    console.log(`🧪 [Simulación] Escribiría en ${decision.target}`);
                } else {
                    let finalContent = decision.content;
                    if (decision.action === "patch") {
                        const oldContent = fs.readFileSync(decision.target, "utf8");
                        const patches = GNUdiff.parsePatch(decision.content);
                        finalContent = GNUdiff.applyPatch(oldContent, patches[0]);
                    }

                    // Check de sintaxis para JS
                    if (decision.target.endsWith(".js")) {
                        const tempFile = `.temp_${path.basename(decision.target)}`;
                        fs.writeFileSync(tempFile, finalContent);
                        try {
                            execSync(`node --check ${tempFile}`);
                            fs.unlinkSync(tempFile);
                        } catch (e) {
                            fs.unlinkSync(tempFile);
                            throw new Error("Error de sintaxis detectado en el código propuesto.");
                        }
                    }

                    fs.writeFileSync(decision.target, finalContent);
                    console.log(`✅ ${decision.target} actualizado.`);
                    writeAuditLog(`UPDATE: ${decision.target}`);
                }
            }
            else if (decision.action === "command") {
                let cmd = decision.target;
                if (cmd.startsWith("apt") && AUTO_MODE) cmd = `sudo ${cmd} -y`;
                const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
                history.push(`Comando: ${cmd}. Salida: ${output.substring(0, 100)}`);
            }

            // Justo después de procesar la decisión de Gemini:
            saveSession({ task, history, fileContext, stepCount, essentialFiles });

            if (decision.action === "finish") {
                active = false;
                console.log("🏁 Tarea finalizada.");
                if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
            }
        } catch (err) {
            console.error(`❌ Error: ${err.message}`);
            history.push(`Error: ${err.message}`);
        }
    }
}

// --- 5. EJECUCIÓN ---
if (TASK) {
    runAgente(TASK);
} else if (!args.includes("--help")) {
    console.log("Error: No has especificado una tarea.");
}