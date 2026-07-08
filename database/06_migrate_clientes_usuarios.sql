-- =============================================================================
-- database/06_migrate_clientes_usuarios.sql
-- Migración: Crear automaticamente usuarios para clientes sin usuario asignado
-- =============================================================================
-- 
-- PROPÓSITO:
-- La tabla 'clientes' tiene una FK opcional 'id_usuario' que permite clientes
-- sin usuario asociado. Esta migración crea usuarios automáticamente para 
-- cualquier cliente que no tenga usuario.
--
-- DEPENDENCIAS:
-- - Este archivo solo DOCUMENTA la migración
-- - La ejecución real se hace con: backend/scripts/migrar_clientes.js
-- - Razón: MySQL no soporta bcryptjs; se necesita Node.js
--
-- EJECUCIÓN (Dentro de Docker):
-- docker exec <backend-container> node backend/scripts/migrar_clientes.js
--
-- RESULTADO ESPERADO:
-- - Todos los clientes sin usuario tendrán uno nuevo
-- - Emails: tomados del cliente.email o generados (cliente_ID@templo.com)
-- - Contraseña: "12345678" (hasheada con bcryptjs)
-- - Rol: "cliente"
-- - Estado: activo
--
-- ESTADO EN BASE DE DATOS (PARA REFERENCIA):
-- Antes: clientes.id_usuario IS NULL
-- Después: clientes.id_usuario referencia a nuevo usuario creado
-- =============================================================================

-- Verificar estado PRE-migración (query informativa)
-- SELECT COUNT(*) as 'Clientes sin usuario'
-- FROM clientes WHERE id_usuario IS NULL;

-- Verificar estado POST-migración (query informativa)
-- SELECT COUNT(*) as 'Clientes con usuario'
-- FROM clientes WHERE id_usuario IS NOT NULL;

-- Tabla usuarios ya existe y tiene constraints apropiados
-- CONSTRAINT fk_clientes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)

-- Para más detalles de la implementación, ver:
-- - backend/scripts/migrar_clientes.js
-- - backend/db.js (conexión a BD)
-- - backend/package.json (dependencias: bcryptjs, dotenv)

DELIMITER $$

-- Procedimiento auxiliar para logging (opcional)
CREATE PROCEDURE IF NOT EXISTS log_migracion (mensaje VARCHAR(500))
BEGIN
    INSERT INTO migraciones_log (procedimiento, mensaje, ejecutado_en)
    VALUES ('06_migrate_clientes_usuarios', mensaje, NOW());
END$$

DELIMITER ;

-- Nota: Si necesitas invertir esta migración (rollback):
-- UPDATE clientes SET id_usuario = NULL 
-- WHERE id_usuario IN (
--     SELECT id_usuario FROM usuarios 
--     WHERE rol = 'cliente' AND email LIKE 'cliente_%@templo.com'
-- );
-- DELETE FROM usuarios 
-- WHERE rol = 'cliente' AND email LIKE 'cliente_%@templo.com';
