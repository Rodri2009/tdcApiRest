const { validateCurrentUrl } = require('../lib/urlValidator');

describe('validateCurrentUrl', () => {
    test('no marca como bloqueo una redirección normal de login de Mercado Libre', async () => {
        const page = {
            url: () => 'https://www.mercadolibre.com/jms/mla/lgz/msl/login/H4sIAAAAAAAEA1VPS47CMAy9i9eoZYbPqF3ORSKTusWapAmJ24AQd8cBNrP0-_rdwYWJZyO3SNADXaNjywIbiA5lDMkbHpTwUaHMQp_TYZVgQk9CKUN_r0ETDb-kpho1osukIlzkbEYXimKvLsU4G7qqb0ZnCpWpsr-cyS6LJRVowTPKzoezKtP7VNQ8CwSc9-2pZTGU7I4hIhTaGzwDaYWrfDKwpThsdHoLEYS2j_oJS2kb8W6FIXD_J503HeH76_dtuu2--PhBx5PU5Dk-BsBAAA/user-legal-id-social'
        };

        const result = await validateCurrentUrl(page, '/activities');

        expect(result.valid).toBe(false);
        expect(result.reason).not.toContain('Posible bloqueo detectado');
        expect(result.reason).toContain('URL inesperada');
    });

    test('sigue detectando páginas bloqueadas reales', async () => {
        const page = {
            url: () => 'https://www.example.com/blocked'
        };

        const result = await validateCurrentUrl(page, '/activities');

        expect(result.valid).toBe(false);
        expect(result.reason).toContain('Posible bloqueo detectado');
    });
});
