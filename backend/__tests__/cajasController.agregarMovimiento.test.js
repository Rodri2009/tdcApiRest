jest.mock('../db', () => ({
    query: jest.fn()
}));

const db = require('../db');
const { agregarMovimiento } = require('../controllers/cajasController');

describe('cajasController.agregarMovimiento', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            params: { id: 3 },
            body: {
                tipo: 'ingreso',
                categoria: 'manual',
                subcategoria: 'manual',
                descripcion: 'Ingreso manual',
                monto: 1500,
                metodo_pago: 'transferencia'
            },
            user: { id_usuario: 7 }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    test('usa id_usuario del JWT para registrar el movimiento manual', async () => {
        db.query.mockImplementation(async (sql, params) => {
            const s = String(sql).toLowerCase();

            if (s.includes('select id, estado from cajas where id = ?')) {
                return [{ id: 3, estado: 'cerrada' }];
            }

            if (s.includes('insert into movimientos_caja')) {
                return { insertId: 99 };
            }

            return [];
        });

        await agregarMovimiento(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(db.query).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO movimientos_caja'),
            expect.arrayContaining([
                3,
                'ingreso',
                'manual',
                'manual',
                'Ingreso manual',
                1500,
                'transferencia',
                null,
                7,
                null,
                null
            ])
        );
    });
});
