// Simple in-memory metrics for quick observability (not persisted)
// - counters: numeric counters (increment)
// - last: store last-seen metadata (file names, timestamps)

const counters = {};
const last = {};

function increment(name, n = 1) {
    counters[name] = (counters[name] || 0) + n;
}

function set(key, value) {
    last[key] = value;
}

function getCounter(name) {
    return counters[name] || 0;
}

function getLast(key) {
    return last[key] || null;
}

function getAll() {
    return {
        counters: { ...counters },
        last: { ...last },
        collectedAt: new Date().toISOString()
    };
}

function resetAll() {
    Object.keys(counters).forEach(k => delete counters[k]);
    Object.keys(last).forEach(k => delete last[k]);
}

module.exports = {
    increment,
    set,
    getCounter,
    getLast,
    getAll,
    resetAll
};
