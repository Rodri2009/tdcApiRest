const { validateUploadFile, sanitizeFileName } = require('../utils/uploadValidation');

describe('uploadValidation', () => {
    test('rejects suspicious filenames', () => {
        expect(() => sanitizeFileName('../evil.jsp')).toThrow(/sospechoso|inválido/i);
        expect(() => sanitizeFileName('archivo con espacios?.png')).toThrow(/sospechoso|inválido/i);
    });

    test('accepts JPEG and PNG magic bytes', () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
        const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

        expect(validateUploadFile(jpeg, 'photo.jpg', 'image/jpeg')).toMatchObject({ ok: true, extension: '.jpg' });
        expect(validateUploadFile(png, 'photo.png', 'image/png')).toMatchObject({ ok: true, extension: '.png' });
    });

    test('rejects HTML or wrong content types', () => {
        const html = Buffer.from('<!doctype html><html>bad</html>');
        expect(validateUploadFile(html, 'bad.html', 'text/html')).toMatchObject({ ok: false });
        expect(validateUploadFile(Buffer.from([0x00, 0x00, 0x00]), 'bad.bin', 'image/jpeg')).toMatchObject({ ok: false });
    });
});
