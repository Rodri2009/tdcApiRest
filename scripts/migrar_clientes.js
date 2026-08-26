#!/usr/bin/env node

/**
 * scripts/migrar_clientes.js
 * Script para crear usuarios automáticamente para todos los clientes sin usuario
 */

require('dotenv').config({ path: '/app/../.env' });
const bcrypt = require('bcryptjs');
const pool = require('../db');

const PASSWORD_DEFECTO = '12345678';
const SALT_ROUNDS = 10;

async function migrarClientesAUsuarios() {
  console.log('🚀 Iniciando migración de clientes a usuarios...\n');

  let conn;
  try {
    conn = await pool.getConnection();

    const clientesSinUsuario = await conn.query(`
      SELECT id_cliente, nombre, apellido, email 
      FROM clientes 
      WHERE id_usuario IS NULL 
      ORDER BY id_cliente ASC
    `);

    if (clientesSinUsuario.length === 0) {
      console.log('✅ No hay clientes sin usuario.');
      return;
    }

    console.log(`📊 Encontrados ${clientesSinUsuario.length} clientes sin usuario\n`);

    let contadorExitosos = 0;
    let contadorErrores = 0;

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(PASSWORD_DEFECTO, salt);

    for (const cliente of clientesSinUsuario) {
      try {
        const nombreCompleto = [cliente.nombre, cliente.apellido]
          .filter(Boolean)
          .join(' ') || `Cliente #${cliente.id_cliente}`;

        const email = cliente.email || `cliente_${cliente.id_cliente}@templo.com`;

        const [usuarioExistente] = await conn.query(
          'SELECT id_usuario FROM usuarios WHERE email = ?',
          [email]
        );

        if (usuarioExistente) {
          console.log(`⚠️  Cliente #${cliente.id_cliente}: Email duplicado, saltando...`);
          contadorErrores++;
          continue;
        }

        const resultado = await conn.query(`
          INSERT INTO usuarios (email, password_hash, nombre, rol, activo, creado_en)
          VALUES (?, ?, ?, ?, 1, NOW())
        `, [email, passwordHash, nombreCompleto, 'cliente']);

        const nuevoIdUsuario = Number(resultado.insertId);

        await conn.query(
          'UPDATE clientes SET id_usuario = ? WHERE id_cliente = ?',
          [nuevoIdUsuario, cliente.id_cliente]
        );

        console.log(`✅ Cliente #${cliente.id_cliente} → Usuario #${nuevoIdUsuario} (${email})`);
        contadorExitosos++;
      } catch (err) {
        console.log(`❌ Cliente #${cliente.id_cliente}: ${err.message}`);
        contadorErrores++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📈 RESUMEN');
    console.log('='.repeat(80));
    console.log(`✅ Exitosos: ${contadorExitosos}`);
    console.log(`❌ Errores:  ${contadorErrores}`);
    console.log(`📝 Total:    ${clientesSinUsuario.length}`);
    console.log('='.repeat(80));
    console.log('\n🔐 Contraseña usada: ' + PASSWORD_DEFECTO + '\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    if (conn) conn.release();
  }
}

migrarClientesAUsuarios().then(() => {
  console.log('✨ Migración finalizada\n');
  process.exit(0);
}).catch(err => {
  console.error('Error fatal:', err);
  process.exit(1);
});
