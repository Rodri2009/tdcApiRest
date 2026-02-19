jest.mock('../db', () => ({
    getConnection: jest.fn()
}));

const pool = require('../db');
const adminController = require('../controllers/adminController');

describe('adminController.crearEvento', () => {
    let connStub;
    let req;
    let res;

    beforeEach(() => {
        connStub = {
            query: jest.fn(),
            release: jest.fn()
        };
        pool.getConnection.mockResolvedValue(connStub);

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('crea una solicitud automática cuando no se proporciona id_solicitud y crea el evento vinculado', async () => {
        // Simular INSERT INTO solicitudes -> devuelve array cuyo primer elemento contiene insertId
        connStub.query.mockImplementation(async (sql, params) => {
            const s = String(sql || '').toUpperCase();
            if (s.includes('INSERT INTO SOLICITUDES')) {
                return [{ insertId: 123 }];
            }
            if (s.includes('INSERT INTO EVENTOS_CONFIRMADOS')) {
                return { insertId: 456 };
            }
            return [];
        });

        req = {
            body: {
                nombre_banda: 'Test Band',
                fecha: '2026-06-01'
            }
        };

        await adminController.crearEvento(req, res);

        expect(pool.getConnection).toHaveBeenCalled();
        expect(connStub.query).toHaveBeenCalled();
        // Verificamos que se llamó al INSERT de solicitudes y luego al INSERT de eventos_confirmados
        expect(connStub.query.mock.calls.some(c => String(c[0]).toUpperCase().includes('INSERT INTO SOLICITUDES'))).toBeTruthy();
        console.log('HAS EVENTOS_INSERT:', connStub.query.mock.calls.some(c => String(c[0]).toUpperCase().includes('INSERT INTO EVENTOS_CONFIRMADOS')));
        expect(connStub.query.mock.calls.some(c => String(c[0]).toUpperCase().includes('INSERT INTO EVENTOS_CONFIRMADOS'))).toBeTruthy();

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 456 }));
        expect(connStub.release).toHaveBeenCalled();
    });

    test('valida id_solicitud proporcionado y lo utiliza cuando existe', async () => {
        connStub.query.mockImplementation(async (sql, params) => {
            const s = String(sql || '').toUpperCase();
            if (s.includes('SELECT ID FROM SOLICITUDES')) {
                return [{ id: 77 }];
            }
            if (s.includes('INSERT INTO EVENTOS_CONFIRMADOS')) {
                return { insertId: 888 };
            }
            return [];
        });

        req = {
            body: {
                id_solicitud: 77,
                nombre_banda: 'Existing Solicitud Band',
                fecha: '2026-07-01'
            }
        };

        await adminController.crearEvento(req, res);

        // Asegurarse que consultó la existencia y no intentó crear una nueva solicitud
        expect(connStub.query.mock.calls.some(c => String(c[0]).toUpperCase().includes('SELECT ID FROM SOLICITUDES'))).toBeTruthy();
        expect(connStub.query.mock.calls.some(c => String(c[0]).toUpperCase().includes('INSERT INTO SOLICITUDES'))).toBeFalsy();

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 888 }));
    });

    test('retorna 400 si id_solicitud proporcionado no existe', async () => {
        connStub.query.mockImplementation(async (sql, params) => {
            if (String(sql).startsWith('SELECT id FROM solicitudes')) {
                return [undefined];
            }
            return [];
        });

        req = {
            body: {
                id_solicitud: 9999,
                nombre_banda: 'Nonexistent',
                fecha: '2026-08-01'
            }
        };

        await adminController.crearEvento(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'id_solicitud inválido.' }));
    });
});
