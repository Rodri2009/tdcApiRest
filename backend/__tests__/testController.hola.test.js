const { hola } = require('../controllers/testController');

describe('testController.hola', () => {
    test('responde con mensaje hola', () => {
        const req = {};
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        hola(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'hola' });
    });
});
