const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ora = require("ora@5.1.0");
const GNUdiff = require('diff'); // Librería para aplicar parches

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
let model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- CONFIGURACIÓN DE SEGURIDAD ---
const MAX_STEPS = 10; // Evita bucles infinitos
const DRY_RUN = process.argv.includes("--dry-run");
const AUTO_MODE = process.argv.includes("--auto");
const HISTORY_LIMIT = 5; // Solo recordamos los últimos 5 pasos relevantes
const READ_ONLY = args.includes("--readonly");
const TASK = args.filter(a => !a.startsWith("-")).join(" ");

// --- MANEJO DE ARGUMENTOS Y HELP ---
const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
    console.log(`
        📖 USUARIO Y COMANDOS - Gemini Orchestrator v2.5
        -----------------------------------------------
        Uso: node gemini-orchestrator.js [OPCIONES] "TAREA"

        Opciones:
        --auto      Ejecuta comandos (como apt) sin preguntar (usa sudo -y).
        --dry-run   Simula las acciones pero no escribe nada en disco.
        --readonly  Modo de solo lectura. El agente no podrá modificar ni crear archivos.
        --help      Muestra esta ayuda.

        Ejemplos:
        node gemini-orchestrator.js --readonly "Analiza la seguridad de routes/auth.js"
        node gemini-orchestrator.js --auto "Instala jq y genera un reporte de logs"
    `);
    process.exit(0);
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function callModelWithRetry(prompt, retryCount = 0) {
    const spinner = ora("Gemini está pensando...").start();
    try {
        const result = await model.generateContent(prompt);
        spinner.succeed("Respuesta recibida");
        return result.response.text();
    } catch (error) {
        spinner.fail("Error en la petición");

        if (error.status === 429 && retryCount < 3) {
            const waitTime = 25000 + (retryCount * 5000);
            console.warn(`⚠️ Cuota excedida. Reintentando en ${waitTime / 1000}s...`);
            await sleep(waitTime);
            return callModelWithRetry(prompt, retryCount + 1);
        } else if (error.status === 404 && model.modelName.includes("pro")) {
            console.warn("⚠️ Modelo Pro no disponible o fallando. Cambiando a Flash...");
            model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            return callModelWithRetry(prompt, retryCount);
        }
        throw error;
    }
}

function writeAuditLog(entry) {
    const logPath = path.join(__dirname, "agente_auditoria.log");
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${entry}\n`);
}

async function runAgente(task) {

    console.log(`\n🚀 Misión: ${task}`);
    if (DRY_RUN) console.log("🧪 MODO SIMULACIÓN: No se realizarán cambios físicos.");

    let history = [];
    let stepCount = 0;
    let active = true;
    let fileContext = "";

    while (active && stepCount < MAX_STEPS) {
        stepCount++;

        // Filtramos el historial para no saturar de tokens
        const recentHistory = history.slice(-HISTORY_LIMIT);

        let systemPrompt = `
        Eres un Agente experto en Node.js. 
        Para modificar archivos, usa preferentemente la acción "patch" enviando un diff unificado. 
        Esto ahorra tokens y es más preciso.

        Responde en JSON:
        {
        "thought": "razonamiento",
        "action": "read" | "patch" | "command" | "finish",
        "target": "ruta del archivo",
        "content": "aquí va el diff unificado (formato patch)"
        }
        `;


        const responseText = await callModelWithRetry(systemPrompt + "\nPasos recientes: " + JSON.stringify(recentHistory));

        // Extracción robusta de JSON
        let decision;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            decision = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("❌ Error de formato. Gemini no envió un JSON válido.");
            history.push("Error: Formato JSON inválido. Por favor, intenta de nuevo.");
            continue;
        }

        console.log(`\n[Paso ${stepCount}] 🧠 Pensamiento: ${decision.thought}`);

        try {

            // Bloqueo de seguridad en las acciones:
            if ((decision.action === "patch" || decision.action === "command") && READ_ONLY) {
                console.warn(`⚠️ Intento de acción '${decision.action}' bloqueado por modo --readonly.`);
                history.push(`Error: El sistema está en modo solo lectura. No puedes realizar esa acción.`);
                continue;
            }
            else if (decision.action === "command") {
                if (DRY_RUN) {
                    console.log(`🧪 [Simulación] Ejecutaría: ${decision.target}`);
                } else {
                    let cmd = decision.target;
                    if (cmd.startsWith("apt") && AUTO_MODE) cmd = `sudo ${cmd} -y`;
                    const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
                    history.push(`Ejecutado: ${cmd}. Resultado: ${output.substring(0, 200)}...`);
                }
            }
            else if (decision.action === "read") {
                const content = fs.readFileSync(decision.target, "utf8");
                console.log(`📖 Leyendo: ${decision.target}`);
                // Guardamos en fileContext para que persista en todos los pasos siguientes
                fileContext += `\n--- Contenido de ${decision.target} ---\n${content}\n`;
                history.push(`Leíste ${decision.target}.`);
                writeAuditLog(`LECTURA: ${decision.target}`);
            }
            else if (decision.action === "write") {
                if (DRY_RUN) {
                    console.log(`🧪 [Simulación] Escribiría en: ${decision.target}`);
                } else {
                    fs.writeFileSync(decision.target, decision.content);
                    console.log(`📝 Modificado: ${decision.target}`);
                    history.push(`Modificaste ${decision.target}.`);
                }
            }
            else if (decision.action === "patch") {
                if (DRY_RUN) {
                    console.log(`🧪 [Simulación] Aplicaría parche en: ${decision.target}`);
                } else {
                    const oldContent = fs.readFileSync(decision.target, "utf8");
                    // Aplicamos el parche sobre el contenido viejo
                    const patches = GNUdiff.parsePatch(decision.content);
                    const newContent = GNUdiff.applyPatch(oldContent, patches[0]);

                    if (newContent === false) {
                        throw new Error("El parche no pudo aplicarse (el archivo cambió o el diff es inválido)");
                    }

                    fs.writeFileSync(decision.target, newContent);
                    console.log(`🩹 Parche aplicado con éxito en: ${decision.target}`);
                    writeAuditLog(`PATCH: ${decision.target}`);
                    history.push(`Aplicaste un parche exitoso en ${decision.target}.`);
                }
            }
            else if (decision.action === "finish") {
                console.log("🏁 Agente reporta tarea finalizada.");
                active = false;
            }


        } catch (err) {
            console.error(`❌ Error ejecutando acción: ${err.message}`);
            history.push(`Error: ${err.message}`);
        }
    }

    if (stepCount >= MAX_STEPS) console.log("⚠️ Se alcanzó el límite de pasos permitido.");
}

const task = process.argv.filter(a => !a.startsWith("-")).slice(2).join(" ");
if (task) runAgente(task);



