/**
 * Process Lock Manager
 * Evita que se inicie múltiples instancias del servidor simultaneously
 * Usa un archivo PID lock + port binding
 */

const fs = require('fs');
const path = require('path');
const net = require('net');
const { logError, logWarning, logSuccess } = require('./debugFlags');

class ProcessLockManager {
    constructor(options = {}) {
        this.pidFile = options.pidFile || path.join('/tmp', `server-${options.port || 9999}.pid`);
        this.port = options.port || 9999;
        this.timeout = options.timeout || 5000;
        this.isLocked = false;
    }

    /**
     * Intenta obtener lock exclusivo
     * @returns {Promise<boolean>} true si consiguió lock, false si hay otra instancia
     */
    async acquireLock() {
        try {
            // 1. Verificar si hay un proceso existente usando el puerto
            const portAvailable = await this.isPortAvailable();

            if (!portAvailable) {
                logWarning(`⚠️ Puerto ${this.port} ya está en uso. Otra instancia está corriendo.`);
                return false;
            }

            // 2. Limpiar PID file viejo si el proceso no existe
            if (fs.existsSync(this.pidFile)) {
                try {
                    const oldPid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim());

                    if (!this.isProcessRunning(oldPid)) {
                        logWarning(`🧹 Limpiando PID file antiguo del proceso ${oldPid}`);
                        fs.unlinkSync(this.pidFile);
                    } else {
                        logError(`❌ Otro proceso (PID: ${oldPid}) está usando este puerto`);
                        return false;
                    }
                } catch (err) {
                    logWarning(`Limpiando PID file corrupto: ${err.message}`);
                    fs.unlinkSync(this.pidFile);
                }
            }

            // 3. Crear nuevo PID file
            const pid = process.pid;
            fs.writeFileSync(this.pidFile, pid.toString());
            this.isLocked = true;

            logSuccess(`🔒 Lock adquirido (PID: ${pid}, archivo: ${this.pidFile})`);
            return true;

        } catch (error) {
            logError(`Error adquiriendo lock: ${error.message}`);
            return false;
        }
    }

    /**
     * Verifica si el puerto está disponible
     * @returns {Promise<boolean>}
     */
    isPortAvailable() {
        return new Promise((resolve) => {
            const server = net.createServer();

            server.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });

            server.once('listening', () => {
                server.close();
                resolve(true);
            });

            server.listen(this.port, '127.0.0.1');
        });
    }

    /**
     * Verifica si un proceso está corriendo
     * @param {number} pid
     * @returns {boolean}
     */
    isProcessRunning(pid) {
        try {
            // En Linux/Unix, process.kill(pid, 0) verifica si el proceso existe sin matarlo
            process.kill(pid, 0);
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * Libera el lock
     */
    releaseLock() {
        if (this.isLocked && fs.existsSync(this.pidFile)) {
            try {
                fs.unlinkSync(this.pidFile);
                logSuccess(`🔓 Lock liberado`);
                this.isLocked = false;
            } catch (err) {
                logWarning(`Error liberando lock: ${err.message}`);
            }
        }
    }

    /**
     * Obtiene información del lock
     * @returns {Object}
     */
    getStatus() {
        const hasLockFile = fs.existsSync(this.pidFile);
        let lockPid = null;

        if (hasLockFile) {
            try {
                lockPid = parseInt(fs.readFileSync(this.pidFile, 'utf-8').trim());
            } catch (err) {
                // ignore
            }
        }

        return {
            locked: this.isLocked,
            pidFile: this.pidFile,
            lockPid: lockPid,
            currentPid: process.pid,
            port: this.port
        };
    }
}

module.exports = ProcessLockManager;
