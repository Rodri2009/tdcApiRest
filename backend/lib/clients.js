// Helper utilities to manage `clientes`

const getOrCreateClient = async (conn, { nombre, telefono, email }) => {
    // Prefer match by email
    if (email && String(email).trim().length > 0) {
        const [byEmail] = await conn.query('SELECT id FROM clientes WHERE email = ? LIMIT 1', [email]);
        if (byEmail && byEmail.id) return byEmail.id;
    }
    // Fallback match by telefono
    if (telefono && String(telefono).trim().length > 0) {
        const [byPhone] = await conn.query('SELECT id FROM clientes WHERE telefono = ? LIMIT 1', [telefono]);
        if (byPhone && byPhone.id) return byPhone.id;
    }
    // Otherwise create a new cliente
    const insertResult = await conn.query('INSERT INTO clientes (nombre, telefono, email, creado_en) VALUES (?, ?, ?, NOW())', [nombre || null, telefono || null, email || null]);
    return Number(insertResult.insertId);
};

const updateClient = async (conn, id, { nombre, telefono, email }) => {
    const set = [];
    const params = [];
    if (typeof nombre !== 'undefined') { set.push('nombre = ?'); params.push(nombre); }
    if (typeof telefono !== 'undefined') { set.push('telefono = ?'); params.push(telefono); }
    if (typeof email !== 'undefined') { set.push('email = ?'); params.push(email); }
    if (set.length === 0) return;
    params.push(id);
    await conn.query(`UPDATE clientes SET ${set.join(', ')} WHERE id = ?`, params);
};

module.exports = { getOrCreateClient, updateClient };