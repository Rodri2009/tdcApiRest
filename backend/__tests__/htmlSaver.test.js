const fs = require('fs');
const path = require('path');
const os = require('os');

const HtmlSaver = require('../utils/htmlSaver');

describe('HtmlSaver', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'html-saver-'));
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('borra snapshots viejos de más de 24 horas antes de guardar uno nuevo', async () => {
        const staleFile = path.join(tempDir, 'stale-old.html');
        const freshFile = path.join(tempDir, 'fresh.html');

        fs.writeFileSync(staleFile, '<html>old</html>');
        fs.writeFileSync(freshFile, '<html>fresh</html>');

        const staleTime = Date.now() - (25 * 60 * 60 * 1000);
        const freshTime = Date.now() - (2 * 60 * 60 * 1000);

        fs.utimesSync(staleFile, new Date(staleTime), new Date(staleTime));
        fs.utimesSync(freshFile, new Date(freshTime), new Date(freshTime));

        const saver = new HtmlSaver(tempDir);
        const page = { content: async () => '<html>nuevo</html>' };

        await saver.savePage(page, 'snapshot-test');

        expect(fs.existsSync(staleFile)).toBe(false);
        expect(fs.existsSync(freshFile)).toBe(true);
    });
});
