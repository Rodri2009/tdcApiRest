/**
 * Genera un delay aleatorio entre min y max milisegundos
 * Útil para evitar patrones de polling detectables por sistemas anti-bot
 */
function getRandomDelay(minSeconds = 5, maxSeconds = 10) {
    const minMs = minSeconds * 1000;
    const maxMs = maxSeconds * 1000;
    return Math.random() * (maxMs - minMs) + minMs;
}

/**
 * Espera un tiempo aleatorio
 */
async function randomWait(minSeconds = 5, maxSeconds = 10) {
    const delay = getRandomDelay(minSeconds, maxSeconds);
    return new Promise(resolve => setTimeout(resolve, delay));
}

module.exports = {
    getRandomDelay,
    randomWait
};
