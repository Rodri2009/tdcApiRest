// scripts/apply_migration_profesionales.js
// Ejecuta la migración SQL para añadir cliente_id a profesionales_servicios
const fs = require('fs');
const pool = require('../backend/db');

(async () => {
  const sql = fs.readFileSync('./database/migrations/20260206_add_clienteid_to_profesionales.sql', 'utf8');
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Ejecutando migración: 20260206_add_clienteid_to_profesionales.sql');
    await conn.query(sql);
    console.log('Migración aplicada correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('Error aplicando migración:', err.message || err);
    process.exit(2);
  } finally {
    if (conn) conn.release();
  }
})();
