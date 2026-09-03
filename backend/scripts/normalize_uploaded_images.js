const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const flyersDir = path.join(__dirname, '..', 'uploads', 'flyers');
const bandasDir = path.join(__dirname, '..', 'uploads', 'bandas');

const flyerDeleteList = [
    'Partidos_de_la_seleccion.jpeg',
    '1788122124323-lqs9bv.jpeg',
    '1779315159204-llmhl8.jpg',
    'solicitud_bnd_12.jpg',
    'solicitud_alq_11.jpeg',
    'solicitud_alq_11.png',
    'solicitud_srv_8.jpg',
    'Cronograma_Junio.jpg',
    'Partidos_de_La_selecci_na_rgentina.png',
    '1785447704578-f59a1s.jpeg',
    '1788057175183-bzaj2r.png',
    'solicitud_5.jpg',
    'solicitud_6.png',
    'solicitud_9.jpg',
    'solicitud_9.png'
];

const bandaDeleteList = [
    'logo_feliz_entierro.jpeg',
    'logo_perros_de_paja.jpeg',
    'logo_scones_de_la_chola.jpeg'
];

const flyerRenameMap = {
    'solicitud_12.jpeg': 'solicitud_12.jpg',
    'solicitud_tll_13.jpeg': 'solicitud_13.jpg',
    '2026-06-06_-_CONURTRASH.jpeg': 'solicitud_11.jpg',
    'solicitud_10.jpeg': 'solicitud_10.jpg',
    'solicitud_5.jpeg': 'solicitud_5.jpg',
    'solicitud_6.jpeg': 'solicitud_6.jpg',
    'solicitud_9.jpeg': 'solicitud_9.jpg'
};

const deleteIfExists = (dir, file) => {
    const fullPath = path.join(dir, file);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`Deleted: ${file}`);
    }
};

const renameIfExists = (dir, source, target) => {
    const from = path.join(dir, source);
    const to = path.join(dir, target);
    if (fs.existsSync(from) && !fs.existsSync(to)) {
        fs.renameSync(from, to);
        console.log(`Renamed: ${source} -> ${target}`);
    }
};

const normalizeFlyers = () => {
    console.log('Cleaning flyer files...');
    for (const file of flyerDeleteList) {
        deleteIfExists(flyersDir, file);
    }

    console.log('Normalizing flyer naming...');
    for (const [source, target] of Object.entries(flyerRenameMap)) {
        renameIfExists(flyersDir, source, target);
    }
};

const normalizeBandLogos = async () => {
    console.log('Cleaning logo files...');
    for (const file of bandaDeleteList) {
        deleteIfExists(bandasDir, file);
    }

    let sharp;
    try {
        sharp = require('sharp');
    } catch (err) {
        console.log('No sharp installed; skipping PNG conversion for historical logos.');
        return;
    }

    const files = fs.readdirSync(bandasDir)
        .filter(file => /\.(jpe?g)$/i.test(file));

    for (const file of files) {
        const fullPath = path.join(bandasDir, file);
        const base = path.basename(file, path.extname(file));
        const target = path.join(bandasDir, `${base}.png`);
        if (fs.existsSync(target)) {
            fs.unlinkSync(fullPath);
            console.log(`Removed duplicate legacy logo: ${file}`);
            continue;
        }

        const input = fs.readFileSync(fullPath);
        const output = await sharp(input).png({ compressionLevel: 9, quality: 90 }).toBuffer();
        fs.writeFileSync(target, output);
        fs.unlinkSync(fullPath);
        console.log(`Converted logo: ${file} -> ${base}.png`);
    }
};

const dbUpdateSql = `
  UPDATE solicitudes SET url_flyer = NULL WHERE id_solicitud = 5 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'solicitudes');
  UPDATE solicitudes SET url_flyer = '/uploads/flyers/solicitud_6.jpg' WHERE id_solicitud = 6;
  UPDATE solicitudes SET url_flyer = '/uploads/flyers/solicitud_12.jpg' WHERE id_solicitud = 12;
  UPDATE solicitudes SET url_flyer = '/uploads/flyers/solicitud_13.jpg' WHERE id_solicitud = 13;
  UPDATE solicitudes SET url_flyer = '/uploads/flyers/solicitud_11.jpg' WHERE id_solicitud = 11;
  UPDATE solicitudes SET url_flyer = '/uploads/flyers/solicitud_9.jpg' WHERE id_solicitud = 9;

  UPDATE eventos_confirmados SET url_flyer = NULL WHERE id = 5;
  UPDATE eventos_confirmados SET url_flyer = NULL WHERE id = 6;
  UPDATE eventos_confirmados SET url_flyer = NULL WHERE id = 7;

  UPDATE bandas_artistas
    SET logo_url = REPLACE(REPLACE(logo_url, '.jpeg', '.png'), '.jpg', '.png')
    WHERE logo_url IS NOT NULL
      AND (logo_url LIKE '%/uploads/bandas/logo_%.jpeg' OR logo_url LIKE '%/uploads/bandas/logo_%.jpg');

  UPDATE bandas_artistas SET logo_url = NULL WHERE id_banda BETWEEN 40 AND 53;
`;

const normalizeDb = async () => {
    const mariadb = await import('mariadb');
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const pool = mariadb.createPool({
        host: dbHost,
        port: Number(process.env.DB_PORT || 3306),
        user: process.env.DB_USER || 'rodrigo',
        password: process.env.DB_PASSWORD || 'desa8102test',
        database: process.env.DB_NAME || 'tdc_db',
        connectionLimit: 5
    });

    try {
        console.log('Updating DB image URLs...');
        const conn = await pool.getConnection();
        await conn.query(dbUpdateSql);
        console.log('DB consistency updates applied.');
        conn.release();
    } finally {
        await pool.end();
    }
};

(async () => {
    normalizeFlyers();
    await normalizeBandLogos();
    await normalizeDb();
    console.log('Normalization completed.');
})();
