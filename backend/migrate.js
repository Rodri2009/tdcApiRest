async function run() {
    const mariadb = await import('mariadb');
    const pool = mariadb.createPool({
        host: 'mariadb',
        user: 'root',
        password: 'sys8102root',
        database: 'tdc_db',
        connectionLimit: 5
    });
    
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('🔄 Conectado a BD. Iniciando migración...\n');
        
        try {
            await conn.query(`ALTER TABLE usuarios ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0`);
            console.log('✅ email_verified agregado');
        } catch(e) {
            console.log('⚠️  email_verified:', e.message.split('\n')[0]);
        }
        
        try {
            await conn.query(`ALTER TABLE usuarios ADD COLUMN verification_token VARCHAR(255) UNIQUE DEFAULT NULL`);
            console.log('✅ verification_token agregado');
        } catch(e) {
            console.log('⚠️  verification_token:', e.message.split('\n')[0]);
        }
        
        try {
            await conn.query(`ALTER TABLE usuarios ADD COLUMN verification_token_expires_at TIMESTAMP NULL DEFAULT NULL`);
            console.log('✅ verification_token_expires_at agregado');
        } catch(e) {
            console.log('⚠️  verification_token_expires_at:', e.message.split('\n')[0]);
        }
        
        console.log('\n✅ Migración completada!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        if (conn) conn.end();
        await pool.end();
    }
}

run();
