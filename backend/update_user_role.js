const mariadb = require('mariadb');

async function updateUserRole() {
    const pool = mariadb.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: 3306,
        user: process.env.DB_USER || 'tdc_user',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'tdc_db'
    });

    try {
        const conn = await pool.getConnection();

        // Verificar usuario actual
        let result = await conn.query(
            "SELECT id_usuario, email, rol FROM usuarios WHERE email = ?",
            ['temploclaypole@gmail.com']
        );

        if (result.length === 0) {
            console.log('❌ Usuario no encontrado');
            conn.release();
            pool.end();
            return;
        }

        console.log('👤 Usuario encontrado:', result[0]);

        // Actualizar rol a admin
        const updateResult = await conn.query(
            "UPDATE usuarios SET rol = ? WHERE email = ?",
            ['admin', 'temploclaypole@gmail.com']
        );

        console.log('✅ Rol actualizado a admin');
        console.log('📊 Registros actualizados:', updateResult.affectedRows);

        // Verificar cambio
        result = await conn.query(
            "SELECT id_usuario, email, rol FROM usuarios WHERE email = ?",
            ['temploclaypole@gmail.com']
        );

        console.log('📋 Usuario después del cambio:', result[0]);

        conn.release();
        pool.end();
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateUserRole();
