const pool = require('/app/backend/db');
(async () => {
    const conn = await pool.getConnection();
    try {
        const sql = `SELECT id_solicitud as solicitudId, tipo_de_evento as tipoEvento, tipo_servicio as tipoServicio, fecha_evento, fingerprintid FROM solicitudes WHERE id_solicitud = ?`;
        const rows = await conn.query(sql, [46]);
        console.log('ROWS:', rows);
    } catch (e) {
        console.error('ERR', e);
    } finally { if (conn) conn.release(); process.exit(0); }
})();
