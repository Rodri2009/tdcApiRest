jest.mock('../db', () => ({
    query: jest.fn()
}));

const db = require('../db');
const { actualizarMovimientoCaja } = require('../controllers/cajasController');

describe('cajasController.actualizarMovimientoCaja', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            params: { movimientoId: 42 },
            body: {
                tipo: 'ingreso',
                categoria: 'manual',
                subcategoria: 'manual',
                descripcion: 'Ajuste manual',
                monto: 1250,
                metodo_pago: 'efectivo'
            }
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    test('actualiza un movimiento existente y responde 200', async () => {
        db.query.mockImplementation(async (sql, params) => {
            const s = String(sql).toLowerCase();

            if (s.includes('select id_caja from movimientos_caja where id = ?')) {
                return [{ id_caja: 7 }];
            }

            if (s.includes('select estado from cajas where id = ?')) {
                return [{ estado: 'abierta' }];
            }

            if (s.includes('update movimientos_caja')) {
                return { affectedRows: 1 };
            }

            return [];
        });

        await actualizarMovimientoCaja(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            id: 42,
            tipo: 'ingreso',
            descripcion: 'Ajuste manual',
            monto: 1250
        }));
    });
});
