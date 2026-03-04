// Simple async mutex to serialize acciones que navegan/interactúan con `page`.
// Uso: await pageLock.runExclusive(async () => { /* navegacion + scraping */ });

class PageLock {
    constructor() {
        this._locked = false;
        this._waiters = [];
    }

    async acquire() {
        if (!this._locked) {
            this._locked = true;
            return;
        }
        return new Promise(resolve => this._waiters.push(resolve));
    }

    release() {
        if (this._waiters.length > 0) {
            const next = this._waiters.shift();
            // transfer lock to next waiter
            next();
        } else {
            this._locked = false;
        }
    }

    async runExclusive(fn) {
        await this.acquire();
        try {
            return await fn();
        } finally {
            this.release();
        }
    }
}

module.exports = new PageLock();
