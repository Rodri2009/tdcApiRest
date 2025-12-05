-- ===========================================================================
-- 02_seed.sql - Datos iniciales para TDC
-- Versión refactorizada - Diciembre 2025
-- ===========================================================================

-- Configurar charset para soportar emojis
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- ---------------------------------------------------------------------------
-- TIPOS DE EVENTO (opciones_tipos)
-- Categorías principales: ALQUILER_SALON, FECHA_BANDAS, TALLERES_ACTIVIDADES, SERVICIOS
-- ---------------------------------------------------------------------------
INSERT INTO opciones_tipos (id_evento, nombre_para_mostrar, descripcion, categoria, es_publico) VALUES
-- === ALQUILER_SALON (subtipos para alquiler del salón) ===
('SIN_SERVICIO_DE_MESA', 'Sin Servicio de Mesa (en desuso)', '🏠 **PACK BÁSICO - ALQUILER SIN SERVICIO**

✅ **INCLUYE:**
🍳 Cocina totalmente equipada:
   • Cocina a gas y eléctrica
   • Horno eléctrico y microondas
   • 2 heladeras + freezer de 200 litros

🍽️ Vajilla completa para 120 personas:
   • Vasos de vidrio
   • Platos llanos y platos chicos
   • Cubiertos (juego completo por persona)
   • Fuentes de vidrio
   • Juegos de jarra y balde para hielo

🔥 Parrilla y horno de barro

❌ **NO INCLUYE:**
   • Personal de servicio
   • Limpieza post-evento

⚠️ **NOTA:** Este pack está actualmente en desuso.', 'ALQUILER_SALON', 0),

('CON_SERVICIO_DE_MESA', 'Con Servicio de Mesa', '🌟 **PACK INTERMEDIO - CON SERVICIO DE MESA**

✅ **INCLUYE TODO LO DEL PACK BÁSICO:**
🍽️ Vajilla para 120 personas
🍳 Cocina completamente equipada
🔥 Parrilla y horno de barro

➕ **MÁS PERSONAL DE SERVICIO:**
👩‍🍳 Encargada general
👨‍🍳 Cocinera
🚪 Personal de puerta
🍷 Meseras (según cantidad de invitados)
👨‍🍳 Ayudante de cocina (para eventos grandes)

💫 **SERVICIO INCLUIDO:**
   • Servimos TODO lo que el cliente trae
   • Atención completa a los invitados
   • 🧹 Limpieza total del salón al finalizar

📌 **IDEAL PARA:** Eventos formales, casamientos, cumpleaños de adultos, aniversarios.', 'ALQUILER_SALON', 1),

('INFORMALES', 'Informales', '🎉 **PACK BÁSICO AMPLIADO - FIESTAS INFORMALES**

✅ **INCLUYE TODO LO DEL PACK BÁSICO:**
🍽️ Vajilla para 120 personas
🍳 Cocina completamente equipada
🔥 Parrilla y horno de barro

➕ **PLUS:**
👩 Encargada general
🚪 Personal de puerta (recibe a los invitados)
🧹 Limpieza del salón al finalizar

💡 **CONCEPTO:**
Ideal para fiestas más "descontracturadas" donde los invitados se sirven solos (tipo picada, asado informal, etc.)

📌 **IDEAL PARA:** Reuniones de amigos, cumpleaños informales, juntadas familiares, after office.', 'ALQUILER_SALON', 1),

('INFANTILES', 'Infantiles', '🎈 **PACK INFANTIL - CUMPLEAÑOS DE NIÑOS**

✅ **INCLUYE:**

👥 **Personal:**
   • 👩 Encargada general
   • 🚪 Encargada de puerta
   • 👨‍🍳 Cocinera

🎮 **Entretenimiento:**
   • 🏰 Inflable 3x3
   • ⚽ Dos metegoles
   • 🏓 Ping Pong
   • 🎱 Pool
   • 🧱 Jenga gigante
   • ⚽ Cancha de fútbol (exclusiva hasta 12 años)
   • 🎵 Música y juego de luces

🍽️ **Mobiliario y utensilios:**
   • Mesas, sillas y mantelería
   • Bowls para snacks
   • Platos descartables
   • Servilleteros con servilletas
   • Vasos descartables
   • Botellas para jugo/agua

🏠 **Instalaciones:**
   • Uso de barra, heladera y freezer
   • Baño equipado
   • ⏰ 20 min previos para decorar (sin cargo)

❌ **NO INCLUYE:**
   • Bebidas ni alimentos
   • Animación o fotografía
   • Vajilla de cristal ni cubiertos de metal

📋 **NORMAS IMPORTANTES:**
1️⃣ Pago de cuotas entre el 1° y 10° de cada mes
2️⃣ Lista de invitados con 1 día de anticipación
3️⃣ Saldo restante 1 día antes del evento
4️⃣ Solo personal autorizado en cocina
5️⃣ Cancha solo para niños hasta 12 años
6️⃣ Responsabilidad por daños o pérdidas
7️⃣ Recargos por incumplimiento', 'ALQUILER_SALON', 1),

('ADOLESCENTES', 'Adolescentes', '🎧 **PACK ADOLESCENTES - FIESTAS DE 15 Y MÁS**

🌟 **10 AÑOS DE EXPERIENCIA** en fiestas juveniles

✅ **INCLUYE:**

🔊 **Sonido e Iluminación profesional:**
   • Sistema de sonido de alta potencia
   • Luces LED y efectos
   • Máquina de humo

🎵 **DJ Profesional:**
   • El mejor DJ para fiestas de jóvenes
   • Música actual y pedidos especiales
   • Conducción de la fiesta

💃 **Concepto de la fiesta:**
   • Formato tipo boliche
   • La cumpleañera es la PROTAGONISTA de la noche
   • Entradas controladas
   • Ambiente seguro

📌 **IDEAL PARA:** Fiestas de 15, cumpleaños de adolescentes, egresados.

⚠️ **HORARIOS:** Viernes y Sábados de 20:00 a 04:00', 'ALQUILER_SALON', 1),

('BABY_SHOWERS', 'Baby Showers', '👶 **PACK BABY SHOWER**

🎀 Celebrá la llegada de tu bebé en nuestro hermoso salón

✅ **INCLUYE TODO LO DEL PACK INFANTIL:**

👥 **Personal:**
   • 👩 Encargada general
   • 🚪 Encargada de puerta
   • 👨‍🍳 Cocinera

🎮 **Entretenimiento disponible:**
   • Espacio decorable a tu gusto
   • 🎵 Música ambiental
   • Zona para juegos y dinámicas

🍽️ **Mobiliario:**
   • Mesas y sillas
   • Mantelería
   • Vajilla completa

💡 **SUGERENCIAS:**
   • Ideal para 20-60 personas
   • Podés traer tu propia decoración temática
   • Mesa dulce, torta y catering por tu cuenta

📌 **IDEAL PARA:** Baby showers, gender reveal, bautismos pequeños.', 'ALQUILER_SALON', 1),

-- === FECHA_BANDAS (categoría independiente) ===
('FECHA_BANDAS', 'Fecha para Bandas', '🎸 **ALQUILER PARA EVENTOS MUSICALES**

🎤 Convertí tu fecha en un show memorable

✅ **INCLUYE:**

🔊 **Sonido Profesional:**
   • Consola de mezcla
   • Sistema de PA de alta potencia
   • Monitores de escenario
   • Microfonería completa

💡 **Iluminación:**
   • Luces de escenario
   • Efectos LED
   • Máquina de humo

🎭 **Escenario:**
   • Escenario montado
   • Backline básico disponible

👥 **Personal técnico:**
   • Sonidista
   • Personal de puerta
   • Seguridad (según evento)

📌 **HORARIOS DISPONIBLES:**
   • Viernes: 18:00 a 04:00
   • Sábados: 18:00 a 04:00
   • Domingos: 14:00 a 23:00

💰 **MODALIDAD:** División de puerta o alquiler fijo (a convenir)', 'FECHA_BANDAS', 1),

-- === SERVICIOS (cuidado personal) ===
('MASAJES', 'Masajes', '💆 **SERVICIO DE MASAJES**

Relajate y renovate con nuestros masajes profesionales

✅ **TIPOS DISPONIBLES:**
   • 💪 Masaje descontracturante
   • 🧘 Masaje relajante
   • 🦶 Reflexología podal
   • 🌿 Masaje con piedras calientes

⏰ **DURACIÓN:** 45 min a 90 min según tipo

📍 **ATENCIÓN:** Con turno previo', 'SERVICIOS', 1),

('ESTETICA', 'Estética', '✨ **SERVICIOS DE ESTÉTICA**

Cuidá tu piel con nuestros tratamientos profesionales

✅ **TRATAMIENTOS:**
   • 🧴 Limpieza facial profunda
   • 💎 Hidratación intensiva
   • 🌟 Tratamiento anti-age
   • 🎯 Tratamiento para acné

👩‍⚕️ Profesionales certificadas

📍 **ATENCIÓN:** Con turno previo', 'SERVICIOS', 1),

('DEPILACION', 'Depilación', '🌸 **SERVICIO DE DEPILACIÓN**

Depilación profesional con cera

✅ **ZONAS:**
   • 🦵 Piernas completas
   • 🦵 Media pierna
   • 💪 Brazos
   • 👙 Cavado / Rebaje
   • 😊 Bozo
   • 🙆 Axilas

💡 **MÉTODO:** Cera tibia descartable

📍 **ATENCIÓN:** Con turno previo', 'SERVICIOS', 1),

('DEPILACION_DEFINITIVA', 'Depilación Definitiva', '⚡ **DEPILACIÓN DEFINITIVA**

Olvidate del vello con tecnología láser

✅ **ZONAS TRATABLES:**
   • Rostro
   • Axilas  
   • Brazos
   • Piernas
   • Zona íntima
   • Espalda

🔬 **TECNOLOGÍA:** Láser de última generación

📋 **INCLUYE:**
   • Evaluación inicial gratuita
   • Sesiones programadas
   • Seguimiento personalizado

📍 **ATENCIÓN:** Con turno previo - Consultar disponibilidad', 'SERVICIOS', 1),

-- === TALLERES_ACTIVIDADES ===
('ARTE', 'Arte y Manualidades', '🎨 **TALLERES DE ARTE Y MANUALIDADES**

Desarrollá tu creatividad con nuestros talleres

✅ **ACTIVIDADES:**
   • 🖌️ Pintura en acrílico y óleo
   • ✏️ Dibujo artístico
   • 🏺 Cerámica y modelado
   • ✂️ Manualidades creativas
   • 🧵 Tejido y bordado

👩‍🎨 **MODALIDADES:**
   • Clases grupales (máx. 12 personas)
   • Talleres intensivos de fin de semana
   • Clases particulares

📦 **MATERIALES:** Incluidos en el precio

📍 **HORARIOS:** Consultar disponibilidad', 'TALLERES_ACTIVIDADES', 1),

('YOGA', 'Yoga', '🧘 **CLASES DE YOGA**

Encontrá tu equilibrio interior

✅ **ESTILOS:**
   • 🌅 Hatha Yoga (tradicional)
   • 💪 Vinyasa Flow (dinámico)
   • 🌙 Yoga Restaurativo (relajación)
   • 🤰 Yoga para embarazadas

📋 **INCLUYE:**
   • Mats disponibles
   • Props (bloques, cintas, mantas)
   • Música ambiental

👥 **NIVELES:** Principiantes a avanzados

⏰ **HORARIOS:** Mañana y tarde - Consultar agenda

💡 **TIP:** Traé ropa cómoda y venís descalzo/a', 'TALLERES_ACTIVIDADES', 1),

('DANZA', 'Danza', '💃 **CLASES DE DANZA**

Movete al ritmo que más te guste

✅ **ESTILOS:**
   • 🇦🇷 Folklore argentino
   • 🌹 Tango y milonga
   • 🎭 Danza contemporánea
   • 💃 Salsa y bachata
   • 🩰 Expresión corporal

👥 **MODALIDADES:**
   • Clases grupales
   • Clases de pareja
   • Clases particulares

📍 **NIVELES:** Inicial, intermedio y avanzado

⏰ **HORARIOS:** Tarde y noche - Consultar agenda', 'TALLERES_ACTIVIDADES', 1),

('MUSICA', 'Música', '🎵 **TALLERES Y CLASES DE MÚSICA**

Aprendé o perfeccioná tu instrumento

✅ **INSTRUMENTOS:**
   • 🎸 Guitarra (criolla, eléctrica, bajo)
   • 🎹 Teclado y piano
   • 🥁 Batería y percusión
   • 🎤 Canto y técnica vocal
   • 🎺 Vientos (flauta, saxo, etc.)

📚 **INCLUYE:**
   • Material didáctico
   • Instrumentos disponibles para práctica
   • Grabaciones de seguimiento

👥 **MODALIDADES:**
   • Clases individuales
   • Clases grupales reducidas
   • Ensambles y bandas

📍 **NIVELES:** Desde cero hasta avanzado', 'TALLERES_ACTIVIDADES', 1);

-- ---------------------------------------------------------------------------
-- CONFIGURACIÓN GENERAL DEL SISTEMA
-- ---------------------------------------------------------------------------
INSERT INTO configuracion (Clave, Valor) VALUES
('NOMBRE_NEGOCIO', 'El Templo de Claypole'),
('EMAIL_CONTACTO', 'contacto@eltemplodeclaypole.com'),
('TELEFONO', '1155551234'),
('DIRECCION', 'Claypole, Buenos Aires'),
('HORARIO_ATENCION', 'Lunes a Sábado 10:00 - 22:00'),
('ANTICIPACION_MINIMA_DIAS', '3'),
('ANTICIPACION_MAXIMA_DIAS', '90');

-- ---------------------------------------------------------------------------
-- PRECIOS VIGENCIA
-- ---------------------------------------------------------------------------
INSERT INTO precios_vigencia (id_evento, id_duracion, precio_anticipado, precio_puerta, vigente_desde, vigente_hasta) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 4, 150000.00, 180000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 5, 170000.00, 200000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 6, 200000.00, 230000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 7, 230000.00, 260000.00, '2025-11-01', '2025-12-31'),
('SIN_SERVICIO_DE_MESA', 8, 270000.00, 300000.00, '2025-11-01', '2025-12-31'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 4, 250000.00, 300000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 5, 280000.00, 330000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 6, 320000.00, 370000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 7, 370000.00, 430000.00, '2025-11-01', '2025-12-31'),
('CON_SERVICIO_DE_MESA', 8, 430000.00, 500000.00, '2025-11-01', '2025-12-31'),
-- INFORMALES
('INFORMALES', 4, 200000.00, 240000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 5, 220000.00, 260000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 6, 250000.00, 290000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 7, 290000.00, 340000.00, '2025-11-01', '2025-12-31'),
('INFORMALES', 8, 340000.00, 400000.00, '2025-11-01', '2025-12-31'),
-- INFANTILES
('INFANTILES', 4, 300000.00, 360000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 5, 330000.00, 390000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 6, 370000.00, 440000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 7, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('INFANTILES', 8, 480000.00, 560000.00, '2025-11-01', '2025-12-31'),
-- ADOLESCENTES
('ADOLESCENTES', 4, 350000.00, 420000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 5, 380000.00, 450000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 6, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 7, 470000.00, 550000.00, '2025-11-01', '2025-12-31'),
('ADOLESCENTES', 8, 520000.00, 600000.00, '2025-11-01', '2025-12-31'),
-- BABY_SHOWERS
('BABY_SHOWERS', 4, 300000.00, 360000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 5, 330000.00, 390000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 6, 370000.00, 440000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 7, 420000.00, 500000.00, '2025-11-01', '2025-12-31'),
('BABY_SHOWERS', 8, 480000.00, 560000.00, '2025-11-01', '2025-12-31'),
-- FECHA_BANDAS
('FECHA_BANDAS', 4, 200000.00, 230000.00, '2025-11-01', '2025-12-31'),
('FECHA_BANDAS', 5, 220000.00, 250000.00, '2025-11-01', '2025-12-31'),
('FECHA_BANDAS', 6, 250000.00, 280000.00, '2025-11-01', '2025-12-31');

-- ---------------------------------------------------------------------------
-- DURACIONES POR TIPO
-- ---------------------------------------------------------------------------
INSERT INTO opciones_duracion (id_evento, duracion_horas, descripcion) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 4, '4 horas'),
('SIN_SERVICIO_DE_MESA', 5, '5 horas'),
('SIN_SERVICIO_DE_MESA', 6, '6 horas'),
('SIN_SERVICIO_DE_MESA', 7, '7 horas'),
('SIN_SERVICIO_DE_MESA', 8, '8 horas'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 4, '4 horas'),
('CON_SERVICIO_DE_MESA', 5, '5 horas'),
('CON_SERVICIO_DE_MESA', 6, '6 horas'),
('CON_SERVICIO_DE_MESA', 7, '7 horas'),
('CON_SERVICIO_DE_MESA', 8, '8 horas'),
-- INFORMALES
('INFORMALES', 4, '4 horas'),
('INFORMALES', 5, '5 horas'),
('INFORMALES', 6, '6 horas'),
('INFORMALES', 7, '7 horas'),
('INFORMALES', 8, '8 horas'),
-- INFANTILES
('INFANTILES', 4, '4 horas'),
('INFANTILES', 5, '5 horas'),
('INFANTILES', 6, '6 horas'),
('INFANTILES', 7, '7 horas'),
('INFANTILES', 8, '8 horas'),
-- ADOLESCENTES
('ADOLESCENTES', 4, '4 horas'),
('ADOLESCENTES', 5, '5 horas'),
('ADOLESCENTES', 6, '6 horas'),
('ADOLESCENTES', 7, '7 horas'),
('ADOLESCENTES', 8, '8 horas'),
-- BABY_SHOWERS
('BABY_SHOWERS', 4, '4 horas'),
('BABY_SHOWERS', 5, '5 horas'),
('BABY_SHOWERS', 6, '6 horas'),
('BABY_SHOWERS', 7, '7 horas'),
('BABY_SHOWERS', 8, '8 horas'),
-- FECHA_BANDAS
('FECHA_BANDAS', 4, '4 horas'),
('FECHA_BANDAS', 5, '5 horas'),
('FECHA_BANDAS', 6, '6 horas');

-- ---------------------------------------------------------------------------
-- HORARIOS POR TIPO
-- ---------------------------------------------------------------------------
INSERT INTO configuracion_horarios (id_evento, dia_semana, hora_inicio, hora_fin) VALUES
-- SIN_SERVICIO_DE_MESA
('SIN_SERVICIO_DE_MESA', 'lunes', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'martes', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'miercoles', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'jueves', '10:00:00', '23:00:00'),
('SIN_SERVICIO_DE_MESA', 'viernes', '10:00:00', '02:00:00'),
('SIN_SERVICIO_DE_MESA', 'sabado', '10:00:00', '02:00:00'),
('SIN_SERVICIO_DE_MESA', 'domingo', '10:00:00', '23:00:00'),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 'lunes', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'martes', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'miercoles', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'jueves', '10:00:00', '23:00:00'),
('CON_SERVICIO_DE_MESA', 'viernes', '10:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'sabado', '10:00:00', '02:00:00'),
('CON_SERVICIO_DE_MESA', 'domingo', '10:00:00', '23:00:00'),
-- INFORMALES
('INFORMALES', 'lunes', '10:00:00', '23:00:00'),
('INFORMALES', 'martes', '10:00:00', '23:00:00'),
('INFORMALES', 'miercoles', '10:00:00', '23:00:00'),
('INFORMALES', 'jueves', '10:00:00', '23:00:00'),
('INFORMALES', 'viernes', '10:00:00', '02:00:00'),
('INFORMALES', 'sabado', '10:00:00', '02:00:00'),
('INFORMALES', 'domingo', '10:00:00', '23:00:00'),
-- INFANTILES
('INFANTILES', 'lunes', '10:00:00', '23:00:00'),
('INFANTILES', 'martes', '10:00:00', '23:00:00'),
('INFANTILES', 'miercoles', '10:00:00', '23:00:00'),
('INFANTILES', 'jueves', '10:00:00', '23:00:00'),
('INFANTILES', 'viernes', '10:00:00', '02:00:00'),
('INFANTILES', 'sabado', '10:00:00', '02:00:00'),
('INFANTILES', 'domingo', '10:00:00', '23:00:00'),
-- ADOLESCENTES
('ADOLESCENTES', 'viernes', '20:00:00', '04:00:00'),
('ADOLESCENTES', 'sabado', '20:00:00', '04:00:00'),
-- BABY_SHOWERS
('BABY_SHOWERS', 'lunes', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'martes', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'miercoles', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'jueves', '10:00:00', '23:00:00'),
('BABY_SHOWERS', 'viernes', '10:00:00', '02:00:00'),
('BABY_SHOWERS', 'sabado', '10:00:00', '02:00:00'),
('BABY_SHOWERS', 'domingo', '10:00:00', '23:00:00'),
-- FECHA_BANDAS
('FECHA_BANDAS', 'viernes', '18:00:00', '04:00:00'),
('FECHA_BANDAS', 'sabado', '18:00:00', '04:00:00'),
('FECHA_BANDAS', 'domingo', '14:00:00', '23:00:00');

-- ---------------------------------------------------------------------------
-- ADICIONALES
-- ---------------------------------------------------------------------------
INSERT INTO opciones_adicionales (nombre, precio, descripcion, url_imagen) VALUES
('Cama elástica', 30000.00, 'Cama elástica con red lateral para niños hasta 10 años', 'https://lh3.googleusercontent.com/pw/AP1GczMM-aZTEqkYM4KlsY5A79dD5IMy03IVXb0EgLUWVPlflvdfCikVlgkn3p6PVwELvS4qtBoD9HGf8LiIVAHNIuTzn3FxMxYcIecyqjeE1Ew-PZfl723Rt1kQGs-ClWpThLxG77uaRM153VQfVvD4O8fJ=w700-h933-s-no-gm?authuser=0'),
('Inflable Cocodrilo', 30000.00, 'Inflable con forma de cocodrilo de 4x7 metros con tobogan', 'https://lh3.googleusercontent.com/pw/AP1GczM9WbWMorMn_fPb7f9_uS7-IWAsKEj0LcCn8Zvi7U14_7Kjdjge28_RV50Gcu7wkinQk_W5mK5NFNXh1iFjv-Uq-EHjvQWigm3TcSlMvNhhM3ZOZMT05WkaWaxuL-QNciykkIuCmLe0YwQYRrFieHTl=w394-h231-s-no-gm?authuser=0'),
('Inflable Mickey/Minnie', 25000.00, 'Inflable de 4x4 metros con caras gigantes de Mickey y Minnie en la entrada', 'https://lh3.googleusercontent.com/pw/AP1GczMQl1ffjotYB0j0jFCInMgBquqvsgAITDe31BuKk14RFS3Bky5eSfrTjuDJFDCqZ8bAkeVK1xqPFz3xzJBw8R_YXNyS6Zo0ZIytnwaHNIQCJvghvfhwP5xetCI7Xg2cVqFmbbDUuJ3Cv_-SHFU3BI6f=w340-h358-s-no-gm?authuser=0'),
('Inflable Princesa', 22000.00, 'Inflable con la tematica de Princesas de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOYtkKsvQOWJsscPoXvPKxmGWHFzXBUCnWMVr3jyPXvQLDPJFLKivYfqf0HP0DCFCiDZeuF_OHT2Dg7mY5gdOva0YQL94uS9aGQOhRviny_ZNoIPCAR-9p5x2gOXjrNYaAIzRnEKbOOqseXBmWgwfnT=w377-h360-s-no-gm?authuser=0'),
('Inflable Spiderman', 22000.00, 'Inflable con la tematica del Hombre Araña de 3x3 metros', 'https://lh3.googleusercontent.com/pw/AP1GczOlO48NaDkNnHM_ZPKJT-4eHH36bUYMJUZFlAObTvGgIgHy6H0hwaSbyxFJvAjmIrucr12rvG2FTpeLcezzfGBVUCmADUhhTYXZAUdUPw4bw2gdvjts1P-GOH4XPD3MrxLG3AfhHWlHtnk2IosfgBhl=w418-h349-s-no-gm?authuser=0'),
('Manteles negros con camino blanco', 30000.00, 'Manteles negros con camino blanco para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczPfoLiluF0pE9tFCtHRtuXpK0pFM3BQRZ97t81cE9aapbIAzlsJ5srLNeaJYfmI_2F247p2zH33ilH6oW3D-N_nM7BQKZL0CcrE49wNHZ1hQALYnGrsjMk3VsdwQ66In8Ub11R8bW8rD4Riyl6WJTjp=w999-h779-s-no-gm?authuser=0'),
('Manteles negros sólos', 20000.00, 'Manteles negros para todas las mesas', 'https://lh3.googleusercontent.com/pw/AP1GczOSpOTKTwuEAckvaWRc8thYEivYe0el_Fno_l6-ylS331QQaBD7L8zRVPQ1BVBXGdCjdyFbinue3OMV6BtZXpndGSbE4AuCCH710iGesDuGLotzH3gHsirHRral9vmMs-x8pG1S-rrSV0odj9BLrCSV=w800-h749-s-no-gm?authuser=0');

-- ---------------------------------------------------------------------------
-- PERSONAL DISPONIBLE
-- ---------------------------------------------------------------------------
INSERT INTO personal_disponible (id_personal, nombre_completo, rol, celular, activo, cvu_alias) VALUES
('P001', 'Chony', 'Encargada,Puerta', '11 5959-7348', 1, NULL),
('P002', 'Leila', 'Limpieza,Puerta,Cocinera,Mesera', '11 3199-6780', 1, NULL),
('P003', 'Anita', 'Limpieza,Puerta', '11 5313-4502', 1, NULL),
('P004', 'Belen', 'Ayudante de cocina,Mesera', '11 2672-0497', 1, NULL),
('P005', 'Amelia', 'Mesera', '11 5064-1123', 1, NULL),
('P006', 'Giselle', 'Depiladora', NULL, 0, NULL),
('P007', 'Rodrigo', 'Encargado,Puerta,Cocinera,Mesera,Sonido', NULL, 0, NULL);

-- ---------------------------------------------------------------------------
-- ROLES POR EVENTO (según cantidad de personas)
-- ---------------------------------------------------------------------------
INSERT INTO roles_por_evento (id_evento, rol_requerido, cantidad, min_personas, max_personas) VALUES
-- INFANTILES
('INFANTILES', 'Encargada', 1, 0, 120),
('INFANTILES', 'Cocinera', 1, 0, 120),
('INFANTILES', 'Puerta', 1, 0, 120),
('INFANTILES', 'Mesera', 1, 51, 60),
('INFANTILES', 'Mesera', 2, 61, 80),
('INFANTILES', 'Mesera', 3, 81, 100),
('INFANTILES', 'Mesera', 4, 101, 120),
('INFANTILES', 'Ayudante de cocina', 1, 51, 80),
('INFANTILES', 'Ayudante de cocina', 2, 81, 120),
-- CON_SERVICIO_DE_MESA
('CON_SERVICIO_DE_MESA', 'Encargada', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Cocinera', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Puerta', 1, 0, 120),
('CON_SERVICIO_DE_MESA', 'Mesera', 1, 51, 60),
('CON_SERVICIO_DE_MESA', 'Mesera', 2, 61, 80),
('CON_SERVICIO_DE_MESA', 'Mesera', 3, 81, 100),
('CON_SERVICIO_DE_MESA', 'Mesera', 4, 101, 120),
('CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 1, 51, 80),
('CON_SERVICIO_DE_MESA', 'Ayudante de cocina', 2, 81, 120),
-- BABY_SHOWERS
('BABY_SHOWERS', 'Encargada', 1, 0, 120),
('BABY_SHOWERS', 'Cocinera', 1, 0, 120),
('BABY_SHOWERS', 'Puerta', 1, 0, 120),
('BABY_SHOWERS', 'Mesera', 1, 51, 60),
('BABY_SHOWERS', 'Mesera', 2, 61, 80),
('BABY_SHOWERS', 'Mesera', 3, 81, 100),
('BABY_SHOWERS', 'Mesera', 4, 101, 120),
('BABY_SHOWERS', 'Ayudante de cocina', 1, 51, 80),
('BABY_SHOWERS', 'Ayudante de cocina', 2, 81, 120),
-- INFORMALES
('INFORMALES', 'Encargada', 1, 0, 120),
('INFORMALES', 'Puerta', 1, 0, 120);

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE ROLES (roles disponibles para asignar al personal)
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_roles (nombre, descripcion) VALUES
('Encargada', 'Responsable general del evento'),
('Cocinera', 'Preparación de alimentos'),
('Puerta', 'Recepción de invitados'),
('Mesera', 'Servicio de mesas'),
('Ayudante de cocina', 'Asistente en cocina'),
('Limpieza', 'Limpieza del salón'),
('Depiladora', 'Servicio de depilación'),
('Encargado', 'Responsable general (masculino)'),
('Sonido', 'Técnico de sonido'),
('DJ', 'Disc Jockey'),
('Bartender', 'Servicio de bar y bebidas'),
('Seguridad', 'Personal de seguridad');

-- ---------------------------------------------------------------------------
-- CUPONES DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO cupones (codigo, tipo_descuento, valor_fijo, porcentaje_descuento, usos_maximos, usos_actuales, fecha_expiracion, activo, aplica_a) VALUES
('ROCK20', 'PORCENTAJE', NULL, 20.00, 50, 0, '2025-12-31', 1, 'TODAS'),
('A-TODO-O-NADA', 'MONTO_FIJO', 1000.00, NULL, NULL, 0, NULL, 1, 'ANTICIPADA'),
('ENPUERTA25', 'PORCENTAJE', NULL, 25.00, 100, 0, '2025-12-31', 1, 'PUERTA');

-- ---------------------------------------------------------------------------
-- CATÁLOGO DE INSTRUMENTOS
-- ---------------------------------------------------------------------------
INSERT INTO catalogo_instrumentos (nombre, categoria, icono) VALUES
-- Cuerdas
('Guitarra eléctrica', 'Cuerdas', 'fa-guitar'),
('Guitarra acústica', 'Cuerdas', 'fa-guitar'),
('Guitarra criolla', 'Cuerdas', 'fa-guitar'),
('Bajo eléctrico', 'Cuerdas', 'fa-guitar'),
('Bajo acústico', 'Cuerdas', 'fa-guitar'),
('Violín', 'Cuerdas', 'fa-violin'),
('Viola', 'Cuerdas', 'fa-violin'),
('Violonchelo', 'Cuerdas', 'fa-violin'),
('Contrabajo', 'Cuerdas', 'fa-violin'),
('Ukelele', 'Cuerdas', 'fa-guitar'),
('Charango', 'Cuerdas', 'fa-guitar'),
('Banjo', 'Cuerdas', 'fa-guitar'),
('Mandolina', 'Cuerdas', 'fa-guitar'),
-- Percusión
('Batería', 'Percusión', 'fa-drum'),
('Cajón peruano', 'Percusión', 'fa-drum'),
('Congas', 'Percusión', 'fa-drum'),
('Bongó', 'Percusión', 'fa-drum'),
('Timbales', 'Percusión', 'fa-drum'),
('Djembé', 'Percusión', 'fa-drum'),
('Pandeiro', 'Percusión', 'fa-drum'),
('Percusión menor', 'Percusión', 'fa-drum'),
-- Teclados
('Teclado', 'Teclados', 'fa-keyboard'),
('Piano', 'Teclados', 'fa-keyboard'),
('Sintetizador', 'Teclados', 'fa-keyboard'),
('Acordeón', 'Teclados', 'fa-keyboard'),
('Órgano', 'Teclados', 'fa-keyboard'),
-- Vientos
('Saxofón', 'Vientos', 'fa-wind'),
('Trompeta', 'Vientos', 'fa-wind'),
('Trombón', 'Vientos', 'fa-wind'),
('Flauta traversa', 'Vientos', 'fa-wind'),
('Clarinete', 'Vientos', 'fa-wind'),
('Armónica', 'Vientos', 'fa-wind'),
('Quena', 'Vientos', 'fa-wind'),
('Sikus/Zampoña', 'Vientos', 'fa-wind'),
-- Voz
('Voz principal', 'Voz', 'fa-microphone'),
('Coros', 'Voz', 'fa-microphone'),
('Segunda voz', 'Voz', 'fa-microphone'),
-- Electrónico
('DJ / Controlador', 'Electrónico', 'fa-compact-disc'),
('Sampler', 'Electrónico', 'fa-sliders'),
('Secuenciador', 'Electrónico', 'fa-sliders'),
('Laptop/Producción', 'Electrónico', 'fa-laptop');

-- ---------------------------------------------------------------------------
-- BANDAS/ARTISTAS DE EJEMPLO
-- ---------------------------------------------------------------------------
INSERT INTO bandas_artistas (nombre, genero_musical, bio, instagram, facebook, youtube, spotify, contacto_nombre, contacto_email, contacto_telefono, contacto_rol, verificada, activa) VALUES
('Reite', 'Rock / Tributo La Renga', 'Tributo a La Renga con más de 10 años de trayectoria en la zona sur. Fieles al estilo riojano.', '@reite.tributo', 'ReiteOficial', 'https://youtube.com/@reitetributo', 'https://open.spotify.com/artist/reite', 'Carlos Pérez', 'reite.tributo@gmail.com', '1155001122', 'Manager', 1, 1),
('Pateando Bares', 'Rock Nacional', 'Rock nacional con temas propios y algunos covers. Energía pura en cada show.', '@pateando.bares', 'PateandobaresOk', NULL, NULL, 'Martín Gómez', 'pateando.bares@gmail.com', '1155003344', 'Líder', 1, 1),
('Las Mentas', 'Rock Alternativo', 'Banda femenina de rock alternativo. Letras potentes y sonido moderno.', '@lasmentas.rock', NULL, 'https://youtube.com/@lasmentas', 'https://open.spotify.com/artist/lasmentas', 'Laura Fernández', 'lasmentas@gmail.com', '1155005566', 'Cantante', 1, 1),
('Los Desconocidos del Sur', 'Blues / Rock', 'Blues sureño con raíces bien argentinas. Guitarras filosas y voces gastadas.', '@desconocidosdelsur', NULL, NULL, NULL, 'Roberto Silva', 'desconocidos.sur@gmail.com', '1155007788', 'Guitarrista', 0, 1),
('Cumbia Sudaka', 'Cumbia', 'Cumbia villera con letras sociales. Bailamos y pensamos.', '@cumbiasudaka', 'CumbiaSudakaOficial', 'https://youtube.com/@cumbiasudaka', NULL, 'Diego Ramírez', 'cumbiasudaka@gmail.com', '1155009900', 'Manager', 1, 1);

-- ---------------------------------------------------------------------------
-- FORMACIÓN DE LAS BANDAS
-- ---------------------------------------------------------------------------
-- Reite (tributo La Renga - formato clásico)
INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas) VALUES
(1, 'Carlos', 'Guitarra eléctrica', 1, 'Guitarra líder'),
(1, 'Pablo', 'Guitarra eléctrica', 0, 'Guitarra rítmica'),
(1, 'Gustavo', 'Bajo eléctrico', 0, NULL),
(1, 'Chicha', 'Batería', 0, NULL),
(1, 'El Tano', 'Voz principal', 0, NULL);

-- Pateando Bares
INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas) VALUES
(2, 'Martín', 'Guitarra eléctrica', 1, 'Guitarra y voz'),
(2, 'Martín', 'Voz principal', 0, NULL),
(2, 'Fede', 'Bajo eléctrico', 0, NULL),
(2, 'Nico', 'Batería', 0, NULL);

-- Las Mentas
INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas) VALUES
(3, 'Laura', 'Voz principal', 1, NULL),
(3, 'Camila', 'Guitarra eléctrica', 0, NULL),
(3, 'Sol', 'Bajo eléctrico', 0, NULL),
(3, 'Maia', 'Batería', 0, NULL),
(3, 'Vale', 'Teclado', 0, 'Sintetizadores');

-- Cumbia Sudaka
INSERT INTO bandas_formacion (id_banda, nombre_integrante, instrumento, es_lider, notas) VALUES
(5, 'Diego', 'Voz principal', 1, NULL),
(5, NULL, 'Teclado', 0, NULL),
(5, NULL, 'Guitarra eléctrica', 0, NULL),
(5, NULL, 'Bajo eléctrico', 0, NULL),
(5, NULL, 'Batería', 0, NULL),
(5, NULL, 'Timbales', 0, NULL),
(5, NULL, 'Percusión menor', 0, 'Güiro, cencerro');

-- ---------------------------------------------------------------------------
-- EVENTOS DE EJEMPLO (para agenda de bandas)
-- ---------------------------------------------------------------------------
INSERT INTO eventos (tipo_evento, nombre_banda, genero_musical, descripcion, fecha, hora_inicio, hora_fin, precio_anticipada, precio_puerta, aforo_maximo, estado, es_publico, activo) VALUES
('BANDA', 'Reite', 'Rock nacional', 'Gran noche de rock nacional con alto Tributo a La Renga, no te lo pierdas!', '2025-12-06', '21:00:00', '02:00:00', 3000.00, 4000.00, 150, 'Confirmado', 1, 1),
('BANDA', 'Jazz en el Templo', 'Jazz', 'Noche de jazz con los mejores músicos de la zona sur', '2025-12-21', '20:00:00', '01:00:00', 2500.00, 3500.00, 100, 'Confirmado', 1, 1),
('BANDA', 'Cumbia Power', 'Cumbia', 'La mejor cumbia para cerrar el año bailando!', '2025-12-28', '22:00:00', '04:00:00', 2000.00, 3000.00, 180, 'Confirmado', 1, 1);

-- ---------------------------------------------------------------------------
-- BANDAS INVITADAS POR EVENTO (orden = orden en que tocan, principal cierra)
-- ---------------------------------------------------------------------------
INSERT INTO eventos_bandas_invitadas (id_evento, nombre_banda, orden) VALUES
(1, 'Pateando Bares', 1),
(1, 'Las Mentas', 2);

-- ---------------------------------------------------------------------------
-- LINEUP DE EVENTOS (qué bandas tocan en cada evento - detalle horario)
-- ---------------------------------------------------------------------------
-- Evento 1: Reite / Pateando Bares / Las Mentas (06/12)
INSERT INTO eventos_lineup (id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, hora_inicio, duracion_minutos, estado) VALUES
(1, 3, 'Pateando Bares', 0, 0, 0, '21:30:00', 45, 'confirmada'),
(1, 2, 'Las Mentas', 1, 0, 0, '22:30:00', 50, 'confirmada'),
(1, 1, 'Reite', 2, 1, 1, '23:45:00', 90, 'confirmada');

-- Evento 3: Cumbia Power (28/12)
INSERT INTO eventos_lineup (id_evento, id_banda, nombre_banda, orden_show, es_principal, es_solicitante, hora_inicio, duracion_minutos, estado) VALUES
(3, 5, 'Cumbia Power', 0, 1, 1, '22:30:00', 120, 'confirmada');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE EJEMPLO (todas las categorías)
-- ---------------------------------------------------------------------------
-- Alquileres
INSERT INTO solicitudes (tipo_de_evento, tipo_servicio, es_publico, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('INFANTILES', NULL, 0, '2025-12-20', '15:00', '4 horas', '25', 45000.00, 'María García', '1155667788', 'maria.garcia@email.com', 'Cumpleaños de 7 años temático de Minecraft', 'Solicitado'),
('ADOLESCENTES', NULL, 0, '2025-12-22', '20:00', '5 horas', '40', 55000.00, 'Carlos López', '1144556677', 'carlos.lopez@email.com', 'Fiesta de 15 para mi hija Valentina', 'Solicitado'),
('CON_SERVICIO_DE_MESA', NULL, 0, '2025-12-27', '13:00', '4 horas', '30', 75000.00, 'Roberto Fernández', '1133445566', 'roberto.f@email.com', 'Almuerzo familiar de fin de año', 'Solicitado');

-- Servicios (cuidado personal)
INSERT INTO solicitudes (tipo_de_evento, tipo_servicio, es_publico, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('MASAJES', 'Masaje descontracturante', 0, '2025-12-10', '10:00', '1 hora', '1', 3500.00, 'Laura Martínez', '1122334455', 'laura.m@email.com', 'Sesión de masaje descontracturante', 'Solicitado'),
('ESTETICA', 'Limpieza facial profunda', 0, '2025-12-11', '16:00', '1.5 horas', '1', 4500.00, 'Ana Rodríguez', '1166778899', 'ana.rod@email.com', 'Limpieza facial con extracción', 'Solicitado'),
('DEPILACION', 'Piernas completas', 0, '2025-12-12', '11:00', '1 hora', '1', 2800.00, 'Sofía Pérez', '1177889900', 'sofia.p@email.com', 'Depilación con cera piernas completas', 'Solicitado');

-- Talleres
INSERT INTO solicitudes (tipo_de_evento, tipo_servicio, es_publico, fecha_evento, hora_evento, duracion, cantidad_de_personas, precio_basico, nombre_completo, telefono, email, descripcion, estado) VALUES
('ARTE', 'Pintura en acuarela', 1, '2025-12-14', '10:00', '3 horas', '12', 1500.00, 'Patricia González', '1188990011', 'patricia.g@email.com', 'Taller de acuarela para principiantes, incluye materiales', 'Solicitado'),
('YOGA', 'Yoga restaurativo', 1, '2025-12-15', '09:00', '1.5 horas', '15', 800.00, 'Diego Sánchez', '1199001122', 'diego.s@email.com', 'Clase de yoga restaurativo, traer mat', 'En revisión'),
('DANZA', 'Folklore argentino', 1, '2025-12-16', '18:00', '2 horas', '20', 1200.00, 'Elena Castro', '1100112233', 'elena.c@email.com', 'Clase de folklore, nivel inicial', 'En revisión');

-- ---------------------------------------------------------------------------
-- SOLICITUDES DE BANDAS (para aprobar y convertir en eventos)
-- ---------------------------------------------------------------------------
INSERT INTO bandas_solicitudes (
    nombre_banda, genero_musical, formacion_json,
    instagram, youtube, spotify,
    contacto_nombre, contacto_email, contacto_telefono,
    fecha_preferida, fecha_alternativa, hora_preferida,
    invitadas_json, cantidad_bandas,
    precio_anticipada_propuesto, precio_puerta_propuesto, expectativa_publico,
    mensaje, estado
) VALUES
(
    'Los Pericos del Sur', 'Reggae/Ska', '[{"instrumento":"Guitarra","cantidad":2},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1},{"instrumento":"Teclado","cantidad":1},{"instrumento":"Vientos","cantidad":2},{"instrumento":"Voz","cantidad":2}]',
    '@lospericosdelsur', 'https://youtube.com/@lospericosdelsur', 'https://open.spotify.com/artist/lospericosdelsur',
    'Juan Reggae', 'juan.reggae@email.com', '1155443322',
    '2026-01-10', '2026-01-17', '21:00',
    '[{"nombre":"Ska-P Tribute"}]', 2,
    2500.00, 3500.00, '100-120',
    'Queremos hacer una fecha de reggae/ska con tributo a Ska-P como banda invitada. Traemos equipo de sonido propio.',
    'pendiente'
),
(
    'Blues Brothers Tribute', 'Blues/Soul', '[{"instrumento":"Guitarra","cantidad":1},{"instrumento":"Bajo","cantidad":1},{"instrumento":"Batería","cantidad":1},{"instrumento":"Teclado","cantidad":1},{"instrumento":"Saxo","cantidad":2},{"instrumento":"Trompeta","cantidad":1},{"instrumento":"Voz","cantidad":2}]',
    '@bluesbrostribute', NULL, NULL,
    'Pedro Blues', 'pedro.blues@email.com', '1166554433',
    '2026-01-24', '2026-01-31', '22:00',
    NULL, 1,
    3000.00, 4000.00, '80-100',
    'Somos una banda de tributo a Blues Brothers. Noche de soul y rhythm and blues.',
    'pendiente'
);

-- ===========================================================================
-- FIN DEL SEED
-- ===========================================================================
