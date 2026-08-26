// Helper utilities to manage `clientes`

const getOrCreateClient = async (conn, { nombre, telefono, email, creado_por_id_usuario = null }) => {
    // Prefer match by email
    if (email && String(email).trim().length > 0) {
        const [byEmail] = await conn.query('SELECT id_cliente FROM clientes WHERE email = ? LIMIT 1', [email]);
        if (byEmail && byEmail.id_cliente) return byEmail.id_cliente;
    }
    // Fallback match by telefono
    if (telefono && String(telefono).trim().length > 0) {
        const [byPhone] = await conn.query('SELECT id_cliente FROM clientes WHERE telefono = ? LIMIT 1', [telefono]);
        if (byPhone && byPhone.id_cliente) return byPhone.id_cliente;
    }
    // Otherwise create a new cliente
    const insertResult = await conn.query('INSERT INTO clientes (nombre, telefono, email, creado_por_id_usuario, activo) VALUES (?, ?, ?, ?, 1)', [nombre || null, telefono || null, email || null, creado_por_id_usuario || null]);
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
    await conn.query(`UPDATE clientes SET ${set.join(', ')} WHERE id_cliente = ?`, params);
};

/**
 * Resolve a contact update with the following business rules:
 *
 *  - If currentClienteId is null/undefined → getOrCreateClient (find by email/phone or create).
 *  - If nombre changes (non-empty, different from stored) → find-or-create a separate client
 *      record (search by new email; create if not found). Returns the new id_cliente so the
 *      caller can update the FK in the parent table.
 *  - If nombre stays the same (or is not provided) → update the existing client in place.
 *      If the new email already belongs to a DIFFERENT client, throws with code 'EMAIL_CONFLICT'
 *      so the caller can handle it (e.g. link to that client or return 409).
 *
 * Returns { id_cliente: number, fkChanged: boolean }
 *   fkChanged=true means the caller must write the new id_cliente into the parent FK column.
 */
const resolveContactUpdate = async (conn, {
    currentClienteId,
    nombre,   // may be undefined if not changing
    email,    // may be undefined if not changing
    telefono, // may be undefined if not changing
    creado_por_id_usuario = null
}) => {
    // ── No existing client: find or create ──────────────────────────────────────
    if (!currentClienteId) {
        const newId = await getOrCreateClient(conn, {
            nombre: nombre || null,
            email: email || null,
            telefono: telefono || null,
            creado_por_id_usuario
        });
        return { id_cliente: newId, fkChanged: true };
    }

    // ── Fetch current client data ────────────────────────────────────────────────
    const [current] = await conn.query(
        'SELECT id_cliente, nombre, email FROM clientes WHERE id_cliente = ?',
        [currentClienteId]
    );
    if (!current) {
        // Record disappeared; create a new one
        const newId = await getOrCreateClient(conn, {
            nombre: nombre || null,
            email: email || null,
            telefono: telefono || null,
            creado_por_id_usuario
        });
        return { id_cliente: newId, fkChanged: true };
    }

    // ── Determine if the name is genuinely changing ──────────────────────────────
    const incomingNombre = (nombre !== undefined && nombre !== null) ? String(nombre).trim() : null;
    const currentNombre  = (current.nombre || '').trim();
    const nameChanging   = incomingNombre !== null
        && incomingNombre !== ''
        && incomingNombre.toLowerCase() !== currentNombre.toLowerCase();

    if (nameChanging) {
        // Name changed → resolve by new email first; otherwise create a new record
        const newEmail = email !== undefined ? email : current.email;
        let targetId = null;

        if (newEmail && String(newEmail).trim().length > 0) {
            const [byEmail] = await conn.query(
                'SELECT id_cliente FROM clientes WHERE email = ? LIMIT 1',
                [newEmail]
            );
            if (byEmail && byEmail.id_cliente) targetId = byEmail.id_cliente;
        }

        if (!targetId) {
            const insertResult = await conn.query(
                'INSERT INTO clientes (nombre, telefono, email, creado_por_id_usuario, activo) VALUES (?, ?, ?, ?, 1)',
                [
                    incomingNombre,
                    telefono !== undefined ? (telefono || null) : null,
                    email    !== undefined ? (email    || null) : null,
                    creado_por_id_usuario || null
                ]
            );
            targetId = Number(insertResult.insertId);
        }

        return { id_cliente: targetId, fkChanged: targetId !== currentClienteId };
    }

    // ── Name not changing → update existing client in place ─────────────────────
    // Validate email uniqueness before updating
    if (email !== undefined && email !== null && email !== '' && email !== current.email) {
        const [conflict] = await conn.query(
            'SELECT id_cliente FROM clientes WHERE email = ? AND id_cliente != ? LIMIT 1',
            [email, currentClienteId]
        );
        if (conflict && conflict.id_cliente) {
            const err = new Error('El email ya pertenece a otro cliente (ID ' + conflict.id_cliente + ').');
            err.code = 'EMAIL_CONFLICT';
            err.existingClienteId = conflict.id_cliente;
            throw err;
        }
    }

    await updateClient(conn, currentClienteId, {
        ...(nombre   !== undefined ? { nombre }   : {}),
        ...(email    !== undefined ? { email }    : {}),
        ...(telefono !== undefined ? { telefono } : {})
    });
    return { id_cliente: currentClienteId, fkChanged: false };
};

module.exports = { getOrCreateClient, updateClient, resolveContactUpdate };