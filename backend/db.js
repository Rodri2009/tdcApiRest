// Usar import() dinámico para mariadb 3.x (ESM)
// Esto funciona en CommonJS y espera a que el módulo sea cargado

let pool = null;

const initPool = (async () => {
    const mariadb = await import('mariadb');
    return mariadb.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        connectionLimit: 10
    });
})();

// Exportar un proxy que espere a que la promesa se resuelva
module.exports = {
    getConnection: function() {
        return initPool.then(p => p.getConnection());
    },
    execute: function(sql, params) {
        return initPool.then(p => p.execute(sql, params));
    },
    query: function(sql, params) {
        return initPool.then(p => p.query(sql, params));
    }
};