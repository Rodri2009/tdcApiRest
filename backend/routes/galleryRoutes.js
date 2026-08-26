const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const GALLERY_BASE_PATH = path.join(__dirname, '../uploads/gallery');

/**
 * GET /api/gallery/:category
 * Retorna la lista de imágenes de una categoría específica (shows, workshops, events)
 * 
 * Respuesta:
 * {
 *   category: 'shows',
 *   images: [
 *     { id: 'show1.jpg', url: '/uploads/gallery/shows/show1.jpg', name: 'show1.jpg' },
 *     { id: 'show2.jpg', url: '/uploads/gallery/shows/show2.jpg', name: 'show2.jpg' }
 *   ]
 * }
 */
router.get('/gallery/:category', (req, res) => {
    const { category } = req.params;
    
    // Validar que sea una categoría permitida
    const allowedCategories = ['shows', 'workshops', 'events'];
    if (!allowedCategories.includes(category)) {
        return res.status(400).json({ 
            error: 'Categoría inválida. Permitidas: ' + allowedCategories.join(', ')
        });
    }

    const categoryPath = path.join(GALLERY_BASE_PATH, category);

    try {
        // Verificar que la carpeta existe
        if (!fs.existsSync(categoryPath)) {
            return res.json({
                category,
                images: []
            });
        }

        // Leer archivos de la carpeta
        const files = fs.readdirSync(categoryPath);
        
        // Filtrar solo imágenes
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const images = files
            .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
            .sort()
            .map(file => ({
                id: file,
                url: `/uploads/gallery/${category}/${file}`,
                name: file,
                timestamp: fs.statSync(path.join(categoryPath, file)).mtime.getTime()
            }));

        res.json({
            category,
            count: images.length,
            images
        });
    } catch (error) {
        console.error(`[Gallery] Error al leer categoría ${category}:`, error);
        res.status(500).json({ 
            error: 'Error al leer la galería',
            details: error.message 
        });
    }
});

module.exports = router;
