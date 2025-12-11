const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// =================================================================
// ARCHIVO DE LÓGICA COMPARTIDA: formLogic.js
// Contiene el objeto App y la función de inicialización.
// =================================================================

const App = {
    // --- PROPIEDADES ---
    visitorId: null,
    solicitudId: null,
    config: {}, // Objeto de configuración (mode: 'create' o 'edit')
    tarifas: [],
    tiposDeEvento: [],
    opcionesCantidades: {},
    opcionesDuraciones: {},
    opcionesHoras: {},
    descripcionesTipos: {},
    calendario: null,
    feriadosGlobal: [],
    notificationTimer: null,
    loadAbortController: null, // Para cancelar requests pendientes
    elements: {},

    // =================================================================
    // MÉTODOS
    // =================================================================

    init: function (config) {
        this.config = config;
        this.bindElements();
        this.bindEvents();
        this.cargarOpcionesIniciales();
    },

    bindElements: function () {
        // Elementos comunes a ambas páginas
        this.elements = {
            tipoEventoContainer: document.getElementById('tipoEventoContainer'),
            cantidadPersonasSelect: document.getElementById('cantidadPersonas'),
            duracionEventoSelect: document.getElementById('duracionEvento'),
            horaInicioSelect: document.getElementById('horaInicio'),
            fechaEventoInput: document.getElementById('fechaEvento'),
            presupuestoDetalleDiv: document.getElementById('presupuestoDetalle'),
            detallePreciosDiv: document.getElementById('detallePrecios'),
            presupuestoTotalDiv: document.getElementById('presupuestoTotal'),
            loadingOverlay: document.getElementById('loadingOverlay'),
            precioBaseInput: document.getElementById('precioBase'),
            notificationBanner: document.getElementById('notification-banner'),
            tipoEventoDescripcionDiv: document.getElementById('tipoEventoDescripcion'),
        };

        // Campos específicos de banda (edición)
        this.elements.nombreBandaInput = document.getElementById('nombreBandaInput');
        this.elements.contactoEmailInput = document.getElementById('contactoEmailInput');
        this.elements.linkMusicaInput = document.getElementById('linkMusicaInput');
        this.elements.propuestaInput = document.getElementById('propuestaInput');
        this.elements.precioAnticipadaInput = document.getElementById('precioAnticipadaInput');
        this.elements.precioPuertaInput = document.getElementById('precioPuertaInput');

        // Elementos condicionales
        if (this.config.mode === 'create') {
            this.elements.btnAdicionales = document.getElementById('btn-adicionales');
            this.elements.btnContacto = document.getElementById('btn-contacto');
            this.elements.resetTipoEventoBtn = document.getElementById('resetTipoEventoBtn');
        } else { // modo 'edit'
            this.elements.saveButton = document.getElementById('save-button');
            this.elements.cancelButton = document.getElementById('cancel-button');
            this.elements.editFieldset = document.getElementById('edit-fieldset');
            this.elements.detallesAdicionalesTextarea = document.getElementById('detallesAdicionales');
            // band fields already bound above (may be null in non-band pages)
        }
    },

    bindEvents: function () {
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) window.location.reload();
        });

        if (this.config.mode === 'create') {
            this.elements.btnAdicionales.addEventListener('click', this.validarYEnviar.bind(this, 'adicionales'));
            this.elements.btnContacto.addEventListener('click', this.validarYEnviar.bind(this, 'contacto'));
            // Nuevo comportamiento: limpiar la selección de tipo sin navegar fuera de la página.
            if (this.elements.resetTipoEventoBtn) {
                this.elements.resetTipoEventoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const selected = document.querySelector('input[name="tipoEvento"]:checked');
                    if (selected) selected.checked = false;
                    document.querySelectorAll('.radio-option').forEach(opt => opt.style.display = '');
                    try { this.elements.resetTipoEventoBtn.style.display = 'none'; } catch (err) { }
                    try { this.actualizarTodo(); } catch (err) { console.warn('actualizarTodo fallo tras reset:', err); }
                    try { this.elements.tipoEventoContainer && this.elements.tipoEventoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (err) { }
                });
            }
        } else { // modo 'edit'
            this.elements.saveButton.addEventListener('click', this.guardarCambios.bind(this));
            this.elements.cancelButton.addEventListener('click', () => { window.location.href = '/admin_solicitudes.html'; });

            // En modo edición, también mostrar un botón de reset si existe
            if (this.elements.resetTipoEventoBtn) {
                this.elements.resetTipoEventoBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.querySelectorAll('.radio-option').forEach(opt => opt.style.display = '');
                    this.elements.resetTipoEventoBtn.style.display = 'none';
                });
            }
        }

        [this.elements.cantidadPersonasSelect, this.elements.duracionEventoSelect, this.elements.horaInicioSelect].forEach(el => {
            if (el) el.addEventListener('change', (e) => {
                // Si hay un valor seleccionado, removemos la clase de error
                if (e.target.value) {
                    e.target.classList.remove('campo-invalido');
                }
                this.actualizarTodo();
            });
        });
    },

    resetearCamposInvalidos: function () {
        const camposInvalidos = document.querySelectorAll('.campo-invalido');
        camposInvalidos.forEach(campo => {
            campo.classList.remove('campo-invalido');
            campo.style.animation = 'none';
            void campo.offsetWidth;
            campo.style.animation = '';
        });
    },

    // =================================================================
    // 2. LÓGICA DE CARGA DE DATOS
    // =================================================================
    cargarOpcionesIniciales: function () {
        this.toggleLoadingOverlay(true, 'Cargando opciones...');

        // --- ¡LÓGICA CONDICIONAL DE ENDPOINTS! ---
        const endpoints = {
            // La URL para 'tipos' ahora depende del modo de la aplicación
            tipos: this.config.mode === 'edit'
                ? '/api/admin/tipos-evento/all'
                : '/api/opciones/tipos-evento',

            // El resto de los endpoints son los mismos para ambos modos
            tarifas: '/api/opciones/tarifas',
            duraciones: '/api/opciones/duraciones',
            horas: '/api/opciones/horarios',
            cantidades: '/api/opciones/cantidades',
            fechasOcupadas: '/api/opciones/fechas-ocupadas',
            config: '/api/opciones/config'
        };


        Promise.all(
            Object.values(endpoints).map(url =>
                fetch(url).then(res => {
                    // Añadimos un chequeo de 401 para el caso del admin
                    if (res.status === 401) {
                        window.location.href = '/login.html';
                        throw new Error('No autorizado');
                    }
                    if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
                    return res.json();
                })
            )
        )

            .then(results => {
                const [tipos, tarifas, duraciones, horas, cantidades, fechasOcupadas, config] = results;

                this.tarifas = tarifas || [];
                this.tiposDeEvento = tipos || [];
                this.opcionesDuraciones = duraciones || {};
                this.opcionesHoras = horas || {};
                this.opcionesCantidades = cantidades || {};
                this.fechasOcupadasSeguro = fechasOcupadas || [];

                // Formatear duraciones: convertir números a strings "X horas"
                Object.keys(this.opcionesDuraciones).forEach(tipo => {
                    this.opcionesDuraciones[tipo] = this.opcionesDuraciones[tipo].map(d => `${d} horas`);
                });

                // Formatear cantidades para el select
                Object.keys(this.opcionesCantidades).forEach(tipo => {
                    this.opcionesCantidades[tipo] = this.opcionesCantidades[tipo].map(c => c.label);
                });

                this.descripcionesTipos = {};
                this.tiposDeEvento.forEach(tipo => { this.descripcionesTipos[tipo.id] = tipo.descripcion; });

                return this.cargarFeriados()
                    .then(() => {
                        this.decidirEstadoInicial();
                    });
            })
            .catch(error => {
                console.error("[FORM][ERROR] Fallo crítico:", error.message);
                this.showNotification('Error de conexión con el servidor: ' + error.message, 'error');
                this.toggleLoadingOverlay(false);
            });
    },

    cargarFeriados: function () {
        const anioActual = new Date().getFullYear();
        const feriadosUrl1 = `https://api.argentinadatos.com/v1/feriados/${anioActual}`;
        const feriadosUrl2 = `https://api.argentinadatos.com/v1/feriados/${anioActual + 1}`;

        return Promise.all([fetch(feriadosUrl1).then(res => res.json()), fetch(feriadosUrl2).then(res => res.json())])
            .then(([feriados1, feriados2]) => {
                this.feriadosGlobal = [...feriados1, ...feriados2].map(f => f.fecha.replace(/\//g, '-'));
            });
    },

    construirUI: function (fechaExcepcion = null) {

        // Filtrar tipos según la categoría configurada (para page.html usar ALQUILER_SALON)
        let tiposParaMostrar = this.tiposDeEvento;
        if (this.config.categoriaFiltro) {
            tiposParaMostrar = this.tiposDeEvento.filter(t => t.categoria === this.config.categoriaFiltro);
        }

        this.llenarRadioButtons(this.elements.tipoEventoContainer, 'tipoEvento', tiposParaMostrar);
        this.elements.tipoEventoContainer.querySelectorAll('input[name="tipoEvento"]').forEach(radio => radio.addEventListener('change', () => {
            // Remover la clase de error del contenedor principal
            this.elements.tipoEventoContainer.classList.remove('campo-invalido');
            // Actualizar visibilidad de campos según el tipo
            this.actualizarCamposCondicionales();
            // No filtrar en modo creación - permitir seleccionar cualquier tipo
            // if (this.config.mode === 'create') {
            //     this.filtrarTiposPorCategoria(radio.value);
            // }
            this.actualizarTodo();
        }));

        this.llenarSelect(this.elements.cantidadPersonasSelect, [], 'Seleccione tipo...');
        this.llenarSelect(this.elements.duracionEventoSelect, [], 'Seleccione tipo...');
        this.llenarSelect(this.elements.horaInicioSelect, [], 'Seleccione tipo...');
        this.inicializarCalendario(this.fechasOcupadasSeguro, this.feriadosGlobal, fechaExcepcion);
    },

    filtrarTiposPorCategoria: function (tipoId) {

        // Si se selecciona un tipo, mostrar solo los sub-tipos de su categoría
        if (!tipoId) {
            // Si se deselecciona, mostrar todos
            document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('radio-hidden'));
            return;
        }

        // Buscar el tipo seleccionado
        // Puede ser por ID directo (ej: FECHA_BANDAS) o por tipo_evento (ej: BANDA, ALQUILER)
        let tipoSeleccionado = this.tiposDeEvento.find(t => t.id === tipoId);

        // Si no se encuentra por ID directo, buscar por categoría
        // (para eventos que devuelven tipo_evento en lugar de id específico)
        if (!tipoSeleccionado) {
            tipoSeleccionado = this.tiposDeEvento.find(t => t.categoria === tipoId);
        }

        if (!tipoSeleccionado || !tipoSeleccionado.categoria) {
            document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('radio-hidden'));
            return;
        }

        const categoriaSeleccionada = tipoSeleccionado.categoria;

        // Mostrar solo los tipos de la misma categoría
        const radioButtons = this.elements.tipoEventoContainer.querySelectorAll('input[name="tipoEvento"]');

        let visiblesCount = 0;
        let ocultosCount = 0;

        radioButtons.forEach((radio, idx) => {
            const radioOption = radio.closest('.radio-option');

            if (!radioOption) {
                console.warn(`⚠️  Radio ${radio.value} no está en un .radio-option`);
                return;
            }

            // Obtener categoría de dos fuentes: 1) this.tiposDeEvento, 2) atributo data
            let tipoCategoria = null;
            const tipo = this.tiposDeEvento.find(t => t.id === radio.value);
            if (tipo) {
                tipoCategoria = tipo.categoria;
            } else {
                // Fallback: usar data-categoria del elemento
                tipoCategoria = radioOption.getAttribute('data-categoria');
            }

            const perteneceLaCategoria = tipoCategoria === categoriaSeleccionada;
            const tieneLaClase = radioOption.classList.contains('radio-hidden');
            const labelText = radioOption.querySelector('label')?.textContent || 'sin-label';

            if (perteneceLaCategoria) {
                // DEBE estar visible
                if (tieneLaClase) {
                    radioOption.classList.remove('radio-hidden');
                } else {
                }
                visiblesCount++;
            } else {
                // DEBE estar oculto
                if (!tieneLaClase) {
                    radioOption.classList.add('radio-hidden');
                } else {
                }
                ocultosCount++;
            }
        });


        // Verificación exhaustiva
        setTimeout(() => {
            const radios = this.elements.tipoEventoContainer.querySelectorAll('.radio-option');
            let verificacionVisibles = 0;
            let verificacionOcultos = 0;

            Array.from(radios).forEach((r, idx) => {
                const tieneClase = r.classList.contains('radio-hidden');
                const inputValue = r.querySelector('input')?.value;
                const esVisible = !tieneClase;

                if (esVisible) verificacionVisibles++;
                else verificacionOcultos++;

                const esperado = tipoSeleccionado && this.tiposDeEvento.find(t => t.id === inputValue)?.categoria === categoriaSeleccionada;
                const match = esVisible === esperado;
                const icon = match ? '✅' : '❌';

            });

        }, 10);
    },

    actualizarCamposCondicionales: function () {
        const selectedRadio = document.querySelector('input[name="tipoEvento"]:checked');
        if (!selectedRadio) {
            // Si no hay tipo seleccionado, ocultar campos de banda
            const bandFieldsContainer = document.getElementById('band-fields');
            if (bandFieldsContainer) {
                bandFieldsContainer.style.display = 'none';
            }
            return;
        }

        const tipoId = selectedRadio.value;
        const tipoSeleccionado = this.tiposDeEvento.find(t => t.id === tipoId);

        // Determinar si mostrar campos de banda según CATEGORÍA
        // Mostrar si es: BANDA, TALLER, SERVICIO
        // Ocultar si es: ALQUILER (alquiler de salón con subcategorías)
        const tieneCategoria = tipoSeleccionado && tipoSeleccionado.categoria;
        const categoria = tieneCategoria ? tipoSeleccionado.categoria.toUpperCase() : '';
        const mostrarCamposBanda = categoria === 'BANDA' || categoria === 'TALLER' || categoria === 'SERVICIO';

        const bandFieldsContainer = document.getElementById('band-fields');
        if (bandFieldsContainer) {
            bandFieldsContainer.style.display = mostrarCamposBanda ? 'block' : 'none';
        }

        // Ocultar "Cantidad de Personas" y "Duración del evento" para categoría BANDA
        // Estos campos no aplican para fechas de bandas en vivo
        const ocultarCantidadYDuracion = categoria === 'BANDA';

        const cantidadGroup = document.getElementById('cantidadPersonasGroup');
        const duracionGroup = document.getElementById('duracionEventoGroup');

        if (ocultarCantidadYDuracion) {
            if (cantidadGroup) cantidadGroup.style.display = 'none';
            if (duracionGroup) duracionGroup.style.display = 'none';
        } else {
            if (cantidadGroup) cantidadGroup.style.display = 'block';
            if (duracionGroup) duracionGroup.style.display = 'block';
        }
    },

    decidirEstadoInicial: function () {
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('solicitudId');

        if (this.config.mode === 'edit' && idFromUrl) {
            // MODO EDICIÓN
            this.solicitudId = idFromUrl;

            // Cancelar cualquier request anterior pendiente
            if (this.loadAbortController) {
                this.loadAbortController.abort();
            }
            this.loadAbortController = new AbortController();

            fetch(`/api/solicitudes/${this.solicitudId}`, {
                signal: this.loadAbortController.signal
            })
                .then(res => res.json())
                .then(solicitudData => {
                    if (!solicitudData) throw new Error("Solicitud no encontrada");
                    // Construimos la UI CON la fecha de excepción
                    this.construirUI(solicitudData.fechaEvento || solicitudData.fecha_evento);
                    // Rellenamos el formulario
                    this.populateForm(solicitudData);
                    this.toggleLoadingOverlay(false);
                    this.habilitarBotones();
                })
                .catch(err => {
                    // No mostrar error si fue cancelado por AbortController
                    if (err.name === 'AbortError') {
                        return;
                    }
                    console.error("[FORM][EDIT] Error al cargar solicitud:", err);
                    this.showNotification('Error: No se pudo cargar la solicitud', 'error');
                    this.toggleLoadingOverlay(false);
                });
        } else {
            // MODO CREACIÓN
            this.construirUI(); // Construimos la UI sin excepción de fecha
            // Procesar si se pasó un parámetro `tipo` en la URL (ej: page.html?tipo=BANDA)
            try { this.manejarParametroURL(); } catch (e) { console.warn('[FORM][URL] Error procesando parámetros:', e); }
            this.initFingerprint(); // Buscamos sesión por fingerprint
        }
    },


    initFingerprint: function () {
        FingerprintJS.load()
            .then(fp => fp.get())
            .then(result => {
                this.visitorId = result.visitorId;
                this.buscarSesionExistente();
            })
            .catch(error => {
                console.error("[FORM][ERROR] Error al generar Fingerprint:", error.message);
                this.visitorId = 'fingerprint_error';
                this.toggleLoadingOverlay(false);
                this.habilitarBotones();
            });
    },

    buscarSesionExistente: function () {
        fetch(`/api/solicitudes/sesion?fingerprintId=${this.visitorId}`)
            .then(res => res.json())
            .then(sessionData => {
                if (sessionData && sessionData.solicitudId) {
                    this.solicitudId = sessionData.solicitudId;
                    this.populateForm(sessionData);
                    this.showNotification("Se cargaron los datos de tu sesión anterior.", "success");
                } else {
                }
            })
            .catch(err => console.error("[FORM][ERROR] Error al buscar sesión:", err.message))
            .finally(() => {
                this.toggleLoadingOverlay(false);
                this.habilitarBotones();
            });
    },

    // =================================================================
    // 3. LÓGICA DE INTERACCIÓN Y UI
    // =================================================================
    populateForm: function (solicitud) {

        if (!solicitud) {
            console.warn('[FORM][POPULATE] Solicitud vacía, abortando.');
            return;
        }

        // CORRECCIÓN: tipoServicio es el subtipo (INFANTILES), tipoEvento es la categoría (ALQUILER_SALON)
        // Para el formulario necesitamos el subtipo (tipoServicio)
        let tipo = solicitud.tipoServicio || solicitud.tipo_servicio || solicitud.tipoEvento || solicitud.tipo_de_evento;
        // Normalizar tipo a string si es number
        if (typeof tipo === 'number') tipo = String(tipo);
        if (tipo && typeof tipo === 'string') tipo = tipo.trim();
        let cantidadRaw = solicitud.cantidadPersonas || solicitud.cantidad_de_personas;
        const duracion = solicitud.duracionEvento || solicitud.duracion;
        const fecha = solicitud.fechaEvento || solicitud.fecha_evento;
        let horaRaw = solicitud.horaInicio || solicitud.hora_evento;
        const detalles = solicitud.descripcion || '';

        // Helper: Convertir cantidad numérica al label del rango correspondiente
        const convertirCantidadALabel = (cantidadNum, tipoKey) => {
            if (!cantidadNum) return cantidadNum;
            const num = parseInt(cantidadNum);
            if (isNaN(num)) return cantidadNum; // Ya es un label

            // Buscar en tarifas el rango que contiene este número
            const tarifasTipo = this.tarifas.filter(t => t.tipo.toUpperCase() === tipoKey.toUpperCase());
            for (const t of tarifasTipo) {
                if (num >= t.cantidadMin && num <= t.cantidadMax) {
                    return `${t.cantidadMin} a ${t.cantidadMax} personas`;
                }
            }
            // Fallback: buscar en opcionesCantidades
            const opciones = this.opcionesCantidades[tipoKey] || [];
            for (const label of opciones) {
                const match = label.match(/(\d+)\s*a\s*(\d+)/);
                if (match) {
                    const min = parseInt(match[1]);
                    const max = parseInt(match[2]);
                    if (num >= min && num <= max) return label;
                }
            }
            return cantidadNum; // Devolver original si no encontramos match
        };

        // Helper: Normalizar hora a formato HH:MM:SS
        const normalizarHora = (hora) => {
            if (!hora) return hora;
            // Si ya tiene el formato completo HH:MM:SS
            if (/^\d{2}:\d{2}:\d{2}$/.test(hora)) return hora;
            // Si tiene formato HH:MM, agregar :00
            if (/^\d{2}:\d{2}$/.test(hora)) return hora + ':00';
            // Si tiene formato H:MM, agregar 0 al inicio y :00
            if (/^\d{1}:\d{2}$/.test(hora)) return '0' + hora + ':00';
            return hora;
        };

        // Normalizar hora para el select
        const hora = normalizarHora(horaRaw);

        // 1. Establecer el tipo
        // Intentamos mapear el tipo recibido al id que usa la UI (this.tiposDeEvento)
        let uiTipoId = null;
        if (tipo) {
            // Buscar coincidencia directa por id (exacta)
            const direct = this.tiposDeEvento.find(t => String(t.id) === String(tipo) || String(t.id).toLowerCase() === String(tipo).toLowerCase());
            if (direct) uiTipoId = String(direct.id);

            // Normalizaciones y variantes para intentar coincidir
            const tipoNorm = String(tipo).trim().toLowerCase();
            const tipoNormSpaces = tipoNorm.replace(/[_-]+/g, ' ');

            // Buscar por nombreParaMostrar exacto
            if (!uiTipoId && solicitud.nombreParaMostrar) {
                const byName = this.tiposDeEvento.find(t => (t.nombreParaMostrar || '').trim().toLowerCase() === String(solicitud.nombreParaMostrar).trim().toLowerCase());
                if (byName) uiTipoId = String(byName.id);
            }

            // Buscar por inclusión: nombreParaMostrar contiene tipo o tipo contains nombreParaMostrar
            if (!uiTipoId) {
                const incl = this.tiposDeEvento.find(t => {
                    const nm = (t.nombreParaMostrar || '').toLowerCase();
                    if (!nm) return false;
                    return nm.includes(tipoNorm) || nm.includes(tipoNormSpaces) || tipoNorm.includes(nm);
                });
                if (incl) uiTipoId = String(incl.id);
            }

            // Intentar coincidencia por token (palabras clave)
            if (!uiTipoId) {
                const tokens = tipoNorm.split(/\s+/).filter(Boolean);
                for (const tkn of tokens) {
                    const found = this.tiposDeEvento.find(t => (t.nombreParaMostrar || '').toLowerCase().includes(tkn));
                    if (found) { uiTipoId = String(found.id); break; }
                }
            }

            // Heurística por palabras clave cuando tipo es genérico como 'FECHA_EN_VIVO' o 'BANDA'
            if (!uiTipoId) {
                if (tipoNorm.includes('fecha') || tipoNorm.includes('banda') || tipoNorm.includes('en vivo') || tipoNorm.includes('bandas')) {
                    const prefer = this.tiposDeEvento.find(t => {
                        const nm = (t.nombreParaMostrar || '').toLowerCase();
                        return nm.includes('banda') || nm.includes('fecha') || nm.includes('en vivo');
                    });
                    if (prefer) uiTipoId = String(prefer.id);
                }
            }
        }

        // Preferir seleccionar un radio que coincida con la clave que usaremos para poblar opciones
        const resolvedTipoForOptions = this.resolveTipoKey(uiTipoId || tipo) || uiTipoId || tipo;
        let radio = null;
        // 1) intentar con resolvedTipoForOptions
        if (resolvedTipoForOptions) {
            radio = document.querySelector(`input[name="tipoEvento"][value="${resolvedTipoForOptions}"]`);
        }
        // 2) intentar con el id mapeado (uiTipoId)
        if (!radio && uiTipoId) {
            radio = document.querySelector(`input[name="tipoEvento"][value="${uiTipoId}"]`);
        }
        // 3) intentar con el tipo original
        if (!radio && tipo) radio = document.querySelector(`input[name="tipoEvento"][value="${tipo}"]`);
        if (!radio && solicitud.nombreParaMostrar) {
            // Intentar emparejar por texto de label (nombreParaMostrar)
            const labelText = String(solicitud.nombreParaMostrar).trim().toLowerCase();
            const options = Array.from(document.querySelectorAll('.radio-option'));
            for (const opt of options) {
                const label = opt.querySelector('label');
                const input = opt.querySelector('input[name="tipoEvento"]');
                if (label && input && label.textContent.trim().toLowerCase().includes(labelText)) {
                    radio = input; break;
                }
            }
        }
        if (!radio && tipo) {
            // Buscar por inclusión de tipo en la etiqueta (por si tipo es una clave simbólica)
            const options = Array.from(document.querySelectorAll('.radio-option'));
            for (const opt of options) {
                const label = opt.querySelector('label');
                const input = opt.querySelector('input[name="tipoEvento"]');
                if (label && input && label.textContent && tipo && label.textContent.toLowerCase().includes(tipo.toLowerCase())) {
                    radio = input; break;
                }
            }
        }
        if (radio) {
            radio.checked = true;
            // Filtrar tipos por categoría SOLO en modo edit
            if (this.config.mode === 'edit') {
                this.filtrarTiposPorCategoria(radio.value);
            }
        } else {
            console.warn('populate: no se encontró un radio coincidente para tipo:', tipo, 'uiTipoId:', uiTipoId);
        }

        // 2. Sincronizar el calendario (solo visual)
        if (fecha && this.calendario) {
            const fechaObj = new Date(fecha + 'T00:00:00');
            this.calendario.setDate(fechaObj, false);
            // Comprobamos si la fecha quedó seleccionada
            if (this.calendario.selectedDates && this.calendario.selectedDates.length > 0) {
            } else {
                console.warn('populate: la fecha NO quedó seleccionada en el calendario. Intentando forzar...');
                try {
                    // Intento alternativo: usar setDate con string
                    this.calendario.setDate(fecha, false);
                    if (this.calendario.selectedDates && this.calendario.selectedDates.length > 0) {
                    } else {
                        console.warn('populate: forzado setDate tampoco funcionó. Fecha puede estar deshabilitada por reglas.');
                    }
                } catch (err) {
                    console.error('populate: error intentando forzar setDate:', err);
                }
            }
            //this.calendario.setDate(fecha, false);
        }

        // Convertir cantidad numérica al label del rango usando el tipo resuelto
        const cantidad = convertirCantidadALabel(cantidadRaw, resolvedTipoForOptions || tipo);
        console.log('[populate] cantidad raw:', cantidadRaw, '-> label:', cantidad, 'para tipo:', resolvedTipoForOptions || tipo);
        console.log('[populate] hora raw:', horaRaw, '-> normalizada:', hora);

        // 3. Llamar a actualizarTodo pasándole TODOS los datos que conocemos.
        // Esto llenará los selects y calculará el precio inicial.
        // Usar la variable ya resuelta arriba `resolvedTipoForOptions` (si existe)
        this.actualizarTodo('populate-final', {
            overrideTipo: resolvedTipoForOptions,
            overrideCantidad: cantidad,
            overrideDuracion: duracion,
            overrideFechaStr: fecha,
            overrideHora: hora
        });

        // 4. Rellenar el campo de detalles
        if (this.elements.detallesAdicionalesTextarea) {
            this.elements.detallesAdicionalesTextarea.value = detalles;
        }

        // 5. Rellenar datos de banda si existen
        try {
            if (solicitud.nombreBanda || solicitud.nombre_banda || solicitud.nombreParaMostrar) {
                if (this.elements.nombreBandaInput) this.elements.nombreBandaInput.value = solicitud.nombreBanda || solicitud.nombre_banda || solicitud.nombreParaMostrar || '';
            }
            if (this.elements.contactoEmailInput) this.elements.contactoEmailInput.value = solicitud.bandaContactoEmail || solicitud.contacto_email || '';
            if (this.elements.linkMusicaInput) this.elements.linkMusicaInput.value = solicitud.bandaLinkMusica || solicitud.link_musica || '';
            if (this.elements.propuestaInput) this.elements.propuestaInput.value = solicitud.bandaPropuesta || solicitud.propuesta || '';
            if (this.elements.precioAnticipadaInput) this.elements.precioAnticipadaInput.value = solicitud.bandaPrecioAnticipada || solicitud.precio_anticipada || '';
            if (this.elements.precioPuertaInput) this.elements.precioPuertaInput.value = solicitud.bandaPrecioPuerta || solicitud.precio_puerta || '';
        } catch (err) { console.warn('populateForm: fallo al setear campos de banda:', err); }

        // 6. Actualizar visibilidad de campos según el tipo
        this.actualizarCamposCondicionales();
    },





    validarYEnviar: async function (destino) {
        this.resetearCamposInvalidos();
        const selectedRadio = document.querySelector('input[name="tipoEvento"]:checked');
        let hayErrores = false;

        if (!selectedRadio) { this.elements.tipoEventoContainer.classList.add('campo-invalido'); hayErrores = true; }
        if (!this.elements.cantidadPersonasSelect.value) { this.elements.cantidadPersonasSelect.classList.add('campo-invalido'); hayErrores = true; }
        if (!this.elements.duracionEventoSelect.value) { this.elements.duracionEventoSelect.classList.add('campo-invalido'); hayErrores = true; }
        if (!this.elements.horaInicioSelect.value) { this.elements.horaInicioSelect.classList.add('campo-invalido'); hayErrores = true; }
        if (!this.elements.fechaEventoInput.value) { if (this.calendario && this.calendario.altInput) { this.calendario.altInput.classList.add('campo-invalido'); } hayErrores = true; }

        if (hayErrores) {
            console.warn("[FORM][SUBMIT] Validación fallida - campos obligatorios incompletos");
            this.showNotification('Por favor, completa todos los campos obligatorios.', 'warning');
            return;
        }

        // --- ¡CORRECCIÓN! DESHABILITAMOS LOS BOTONES INMEDIATAMENTE ---
        this.toggleLoadingOverlay(true, 'Guardando solicitud...');
        this.elements.btnAdicionales.disabled = true;
        this.elements.btnContacto.disabled = true;

        const bodyData = {
            tipoEvento: selectedRadio.value,
            cantidadPersonas: this.elements.cantidadPersonasSelect.value,
            duracionEvento: this.elements.duracionEventoSelect.value,
            fechaEvento: this.elements.fechaEventoInput.value,
            horaInicio: this.elements.horaInicioSelect.value,
            precioBase: this.elements.precioBaseInput.value,
            fingerprintId: this.visitorId
        };


        try {
            let response;
            if (this.solicitudId) {
                response = await fetch(`/api/solicitudes/${this.solicitudId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
            } else {
                response = await fetch('/api/solicitudes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
            }

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error del servidor');
            }

            const data = await response.json();
            const id = data.solicitudId;
            if (!id) throw new Error("Respuesta inválida del servidor.");

            this.solicitudId = id;

            const nextPage = (destino === 'adicionales') ? 'adicionales.html' : 'contacto.html';
            const fromParam = (destino === 'contacto') ? '&from=page' : '';
            const urlFinal = `${nextPage}?solicitudId=${id}${fromParam}`;



            // --- ¡CAMBIO CLAVE! ---
            // Forzamos la redirección en un nuevo ciclo de eventos para evitar bloqueos.
            setTimeout(() => {
                window.location.href = urlFinal;
            }, 50); // Una pequeña demora de 50ms es suficiente


        } catch (error) {
            console.error(`[FORM][ERROR] Error en envío: ${error.message}`);
            this.showNotification(`Error: ${error.message}`, 'error');
            // Si algo falla, volvemos a habilitar todo.
            this.toggleLoadingOverlay(false);
            this.habilitarBotones();
        }
    },

    inicializarCalendario: function (fechasOcupadas, feriados, fechaExcepcion = null) {
        const fechasADeshabilitar = fechaExcepcion
            ? fechasOcupadas.filter(fecha => fecha !== fechaExcepcion)
            : fechasOcupadas;
        try {
            // Calcular minDate: por defecto 'today', pero si estamos en modo edición
            // y la fechaExcepcion es anterior a hoy, permitimos esa fecha ajustando minDate
            let minDateVal = 'today';
            try {
                if (fechaExcepcion) {
                    const excDate = new Date(fechaExcepcion + 'T00:00:00');
                    const today = new Date();
                    // Normalizar ambos a medianoche para comparar solo la fecha
                    const excNorm = new Date(Date.UTC(excDate.getFullYear(), excDate.getMonth(), excDate.getDate()));
                    const todayNorm = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                    if (excNorm < todayNorm) {
                        minDateVal = fechaExcepcion; // permitir la fecha de excepción pasada
                    }
                }
            } catch (err) {
                console.warn('Error calculando minDate para calendario:', err);
            }
            const config = {
                locale: "es",
                altInput: true,
                altFormat: "j \\de F, Y",
                dateFormat: "Y-m-d",
                minDate: minDateVal,
                disable: [
                    (date) => {
                        const fechaStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const isException = fechaExcepcion && fechaStr === fechaExcepcion;
                        const esFinDeSemana = date.getDay() === 0 || date.getDay() === 6;
                        const esFeriado = feriados.includes(fechaStr);
                        const inFechasADeshabilitar = Array.isArray(fechasADeshabilitar) && fechasADeshabilitar.includes(fechaStr);

                        // Log detallado sólo para la fecha de excepción o si la fecha figura en ocupadas
                        if (isException || inFechasADeshabilitar) {
                            console.debug('[calendario] check ->', { fechaStr, isException, esFinDeSemana, esFeriado, inFechasADeshabilitar });
                        }

                        if (isException) {
                            console.debug('[calendario] fecha excepción encontrada, permitiendo:', fechaStr);
                            return false;
                        }

                        if (!(esFinDeSemana || esFeriado)) {
                            return true;
                        }

                        if (inFechasADeshabilitar) {
                            return true;
                        }

                        return false;
                    }
                ],
                onChange: (selectedDates, dateStr, instance) => {
                    if (dateStr && instance.altInput) {
                        instance.altInput.classList.remove('campo-invalido');
                    }
                    this.actualizarTodo();
                }
            };

            this.calendario = flatpickr(this.elements.fechaEventoInput, config);
        } catch (e) {
            console.error("¡¡¡ERROR CRÍTICO DENTRO DE inicializarCalendario!!!", e);
        }
    },

    convertirNumero: function (numero) {
        const num = typeof numero === 'number' ? numero.toString().trim() : numero.trim();
        if (num === '') return '';
        // Detectar formato y convertir a número
        const esAmericano = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(num);
        const esArgentino = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(num);
        if (esArgentino) return num;
        let numeroLimpio = num.replace(/[^\d.,-]/g, '');
        numeroLimpio = esAmericano ? num.replace(/,/g, '') : numeroLimpio.replace('.', ',');
        // Convertir a número y formatear con separadores de miles
        const partes = numeroLimpio.split(',');
        let parteEntera = partes[0].replace(/\D/g, '');
        const parteDecimal = partes[1] || '00';
        // Agregar puntos de miles
        parteEntera = parteEntera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parteDecimal ? `${parteEntera},${parteDecimal}` : parteEntera;
    },

    actualizarTodo: async function (caller = 'user-interaction', overrides = {}) {
        const tipoId = overrides.overrideTipo || document.querySelector('input[name="tipoEvento"]:checked')?.value || '';
        const fechaStr = overrides.overrideFechaStr || this.elements.fechaEventoInput.value;
        const cantidad = overrides.overrideCantidad || this.elements.cantidadPersonasSelect.value;
        const duracion = overrides.overrideDuracion || this.elements.duracionEventoSelect.value;
        let hora = overrides.overrideHora || this.elements.horaInicioSelect.value;


        const fechaSeleccionada = fechaStr ? new Date(fechaStr + 'T00:00:00') : null;

        // Resolver la clave usable para opciones (duraciones/horas/cantidades)
        const resolvedTipoKey = this.resolveTipoKey(tipoId) || tipoId;

        // 1. Actualizar Descripción
        this.elements.tipoEventoDescripcionDiv.innerHTML = tipoId ? this.descripcionesTipos[tipoId] || 'Sin descripción.' : 'Seleccione un tipo de evento.';

        // 2. Poblar selects de Cantidad y Duración
        if (tipoId) {
            this.llenarSelect(this.elements.cantidadPersonasSelect, this.opcionesCantidades[resolvedTipoKey] || [], 'Seleccione cantidad...');
            this.llenarSelect(this.elements.duracionEventoSelect, this.opcionesDuraciones[resolvedTipoKey] || [], 'Seleccione duración...');
        } else {
            this.llenarSelect(this.elements.cantidadPersonasSelect, [], 'Seleccione tipo...');
            this.llenarSelect(this.elements.duracionEventoSelect, [], 'Seleccione tipo...');
        }
        // Establecemos el valor (ya sea del override o del propio DOM)
        this.elements.cantidadPersonasSelect.value = cantidad;
        this.elements.duracionEventoSelect.value = duracion;

        // 3. Poblar/Actualizar select de Hora
        if (tipoId && fechaSeleccionada) {
            const diaDeLaSemana = fechaSeleccionada.getDay();
            const fechaStr = `${fechaSeleccionada.getFullYear()}-${String(fechaSeleccionada.getMonth() + 1).padStart(2, '0')}-${String(fechaSeleccionada.getDate()).padStart(2, '0')}`;
            const esFeriado = this.feriadosGlobal.includes(fechaStr);
            let tipoDeDia = (diaDeLaSemana === 6 && !esFeriado) ? 'sabado' : 'domingo/feriado';

            // usar resolvedTipoKey para buscar horarios (fallback si la clave no existe)
            const todosLosHorariosParaTipo = this.opcionesHoras[resolvedTipoKey] || this.opcionesHoras[tipoId] || [];
            const horariosFiltrados = todosLosHorariosParaTipo.filter(h => h.tipoDia === 'todos' || h.tipoDia === tipoDeDia).map(h => h.hora).sort();

            this.llenarSelect(this.elements.horaInicioSelect, horariosFiltrados, 'Seleccione hora...');
            // Restauramos el valor de la hora, intentando variantes (con/sin 'hs') si no hay match exacto
            const setHoraIfPossible = (val) => {
                if (!val) return false;
                const opts = Array.from(this.elements.horaInicioSelect.options).map(o => o.value);
                if (opts.includes(val)) {
                    this.elements.horaInicioSelect.value = val; return true;
                }
                // variantes comunes: '21:00' vs '21:00hs' vs '21:00 hs'
                const candidates = [];
                const normalized = String(val).trim();
                if (!normalized.endsWith('hs')) candidates.push(normalized + 'hs');
                if (normalized.endsWith('hs')) candidates.push(normalized.replace(/\s*hs\s*$/i, ''));
                candidates.push(normalized.replace(/\s+/g, ''));
                for (const c of candidates) {
                    if (opts.includes(c)) { this.elements.horaInicioSelect.value = c; return true; }
                }
                return false;
            };

            const horaSet = setHoraIfPossible(hora);
            if (!horaSet && hora) {
                console.warn('actualizarTodo: no se pudo seleccionar la hora exacta:', hora, ' intentando normalizar...');
                // intentar extraer hora numérica si viene con texto
                const m = String(hora).match(/(\d{1,2}:\d{2})/);
                if (m) {
                    const ok = setHoraIfPossible(m[1]);
                }
            }
        } else {
            this.llenarSelect(this.elements.horaInicioSelect, [], 'Seleccione tipo y fecha');
        }

        // 4. Actualizar el Resumen y el Precio
        // (Esta es tu lógica original, que está bien, la adaptamos ligeramente)
        const tipoSeleccionado = this.tiposDeEvento.find(t => t.id === tipoId);
        const nombreParaMostrar = tipoSeleccionado ? tipoSeleccionado.nombreParaMostrar : '';
        const montoSena = tipoSeleccionado ? parseFloat(tipoSeleccionado.montoSena) || 0 : 0;
        const depositoGarantia = tipoSeleccionado ? parseFloat(tipoSeleccionado.depositoGarantia) || 0 : 0;
        const duracionNum = parseInt((duracion.match(/\d+/) || ['0'])[0]);

        let detalleHtml = '<ul>';
        if (nombreParaMostrar) detalleHtml += `<li><strong>Tipo:</strong> ${nombreParaMostrar}</li>`;
        if (fechaSeleccionada) detalleHtml += `<li><strong>Fecha:</strong> ${fechaSeleccionada.toLocaleDateString('es-AR', { timeZone: 'UTC' })}</li>`;
        if (hora) detalleHtml += `<li><strong>Hora:</strong> ${hora}</li>`;
        if (duracion) detalleHtml += `<li><strong>Duración:</strong> ${duracion}</li>`;

        if (hora && duracionNum > 0) {
            const [startHour, startMinute] = hora.replace('hs', '').split(':').map(Number);
            if (!isNaN(startHour)) {
                const fechaCalculo = new Date();
                fechaCalculo.setHours(startHour, startMinute || 0, 0, 0);
                fechaCalculo.setHours(fechaCalculo.getHours() + duracionNum);
                const horaFinStr = `${fechaCalculo.getHours()}:${String(fechaCalculo.getMinutes()).padStart(2, '0')}`;
                detalleHtml += `<li><strong>Fin:</strong> ${horaFinStr} hs.</li>`;
            }
        }
        if (cantidad) detalleHtml += `<li><strong>Personas:</strong> ${cantidad}</li>`;
        if (montoSena > 0) detalleHtml += `<li style="margin-top:10px; color: #0056b3;"><strong>Seña:</strong> $${this.convertirNumero(montoSena)} (no reintigrable)</li>`;
        detalleHtml += '</ul>';

        this.elements.presupuestoDetalleDiv.innerHTML = detalleHtml;


        if (tipoId && cantidad && duracion && fechaSeleccionada) {
            // Extraer el número mínimo del rango seleccionado (ej: "1 a 40 personas" -> 1)
            const cantidadMatch = cantidad.match(/(\d+)\s*a\s*(\d+)/);
            if (!cantidadMatch) {
                this.elements.presupuestoDetalleDiv.insertAdjacentHTML('beforeend', '<p style="color:red;">Formato de cantidad inválido.</p>');
                return;
            }
            const cantidadMin = parseInt(cantidadMatch[1]);
            const cantidadMax = parseInt(cantidadMatch[2]);

            const fechaEventoDate = new Date(fechaSeleccionada);

            // Buscar la tarifa que coincida con tipo, rango de cantidad y fecha
            const reglasAplicables = this.tarifas.filter(r => {
                const tipoCoincide = r.tipo.toUpperCase() === tipoId.toUpperCase();
                // Verificar que el rango seleccionado coincide exactamente con el rango de la tarifa
                const cantidadCoincide = r.cantidadMin === cantidadMin && r.cantidadMax === cantidadMax;
                // Comparar fechas correctamente
                const vigenciaDesde = new Date(r.vigenciaDesde);
                const fechaCoincide = fechaEventoDate >= vigenciaDesde;
                return tipoCoincide && cantidadCoincide && fechaCoincide;
            });

            if (reglasAplicables.length > 0) {
                reglasAplicables.sort((a, b) => new Date(b.vigenciaDesde) - new Date(a.vigenciaDesde));
                const reglaFinal = reglasAplicables[0];
                const precioCalculado = parseFloat(reglaFinal.precioPorHora) * duracionNum;

                let detallePrecios = '<ul>';
                if (precioCalculado > 0) detallePrecios += `<li style="color: #555;"><strong>Precio básico:</strong> $${this.convertirNumero(precioCalculado)}</li>`;
                if (depositoGarantia > 0) detallePrecios += `<li style="color: #555;"><strong>Depósito reintegrable:</strong> $${this.convertirNumero(depositoGarantia)}</li>`;
                detallePrecios += '</ul>';

                if (this.elements.detallePreciosDiv) {
                    this.elements.detallePreciosDiv.innerHTML = detallePrecios;
                }

                // --- ¡NUEVA LÓGICA DE TOTAL! ---
                const totalConDeposito = parseFloat(precioCalculado) + parseFloat(depositoGarantia);

                if (this.elements.presupuestoTotalDiv) {
                    this.elements.presupuestoTotalDiv.innerHTML = `<span>Total: </span> $${this.convertirNumero(totalConDeposito)}`;
                }

                // Añadimos la línea del depósito si es mayor que cero
                if (depositoGarantia > 0) {
                    this.elements.presupuestoTotalDiv.innerHTML += `<div style="font-size: 0.6em; color: red; margin-top: 5px;"> A reintegrar: $${this.convertirNumero(depositoGarantia)}</div>`;
                }


                this.elements.precioBaseInput.value = precioCalculado;
            } else {
                this.elements.presupuestoDetalleDiv.insertAdjacentHTML('beforeend', '<p style="color:red;">No se encontró tarifa.</p>');
                this.elements.presupuestoTotalDiv.innerHTML = `<span>Total: </span> $ -`; this.elements.precioBaseInput.value = 0;
            }
        } else {
            this.elements.presupuestoDetalleDiv.innerHTML = '<p>Complete las opciones para ver el precio.</p>';
            this.elements.presupuestoTotalDiv.innerHTML = `<span>Total Básico: </span> $0`;
            this.elements.precioBaseInput.value = 0;
        }
        console.groupEnd();
    },


    habilitarBotones: function () {

        // --- ¡LÓGICA CONDICIONAL! ---
        // Solo intenta habilitar los botones si estamos en modo 'create'.
        if (this.config.mode === 'create') {
            if (this.elements.btnAdicionales && this.elements.btnAdicionales.disabled) {
                this.elements.btnAdicionales.disabled = false;
                this.elements.btnAdicionales.textContent = 'Agregar Adicionales';
            }
            if (this.elements.btnContacto && this.elements.btnContacto.disabled) {
                this.elements.btnContacto.disabled = false;
                this.elements.btnContacto.textContent = 'Continuar sin adicionales';
            }
        } else { // modo 'edit'
            // En modo edición, los botones "Guardar" y "Cancelar" ya están habilitados por defecto.
            // Podríamos añadir lógica aquí si fuera necesario.
        }
    },

    llenarSelect: function (select, options, placeholder) {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        select.disabled = !(options && options.length > 0);
        if (select.disabled) return;
        options.forEach(opt => { select.innerHTML += `<option value="${opt}">${opt}</option>`; });
    },

    // Resolver una clave usable por las estructuras de opciones (duraciones/horas/cantidades)
    resolveTipoKey: function (preferred) {
        if (!preferred) return null;
        const pref = String(preferred).trim();
        if (this.opcionesDuraciones && Object.prototype.hasOwnProperty.call(this.opcionesDuraciones, pref)) return pref;
        if (this.opcionesHoras && Object.prototype.hasOwnProperty.call(this.opcionesHoras, pref)) return pref;
        if (this.opcionesCantidades && Object.prototype.hasOwnProperty.call(this.opcionesCantidades, pref)) return pref;

        const keys = new Set([...(Object.keys(this.opcionesDuraciones || {})), ...(Object.keys(this.opcionesHoras || {})), ...(Object.keys(this.opcionesCantidades || {}))]);
        const prefNorm = pref.toLowerCase().replace(/[_-]+/g, ' ');

        // 1) exact match normalized
        for (const k of keys) {
            if (k.toLowerCase() === prefNorm || k.toLowerCase() === pref.toLowerCase()) return k;
        }
        // 2) inclusion by token
        const tokens = prefNorm.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
            for (const k of keys) {
                if (k.toLowerCase().includes(token)) return k;
            }
        }
        // 3) fallback heuristics for 'banda'/'fecha'
        if (prefNorm.includes('banda') || prefNorm.includes('fecha') || prefNorm.includes('en vivo') || prefNorm.includes('bandas')) {
            for (const k of keys) {
                if (k.toLowerCase().includes('band') || k.toLowerCase().includes('fecha')) return k;
            }
        }
        return null;
    },

    llenarRadioButtons: function (container, name, options) {
        if (!container) return;
        container.innerHTML = '';
        if (!options || options.length === 0) return;

        options.forEach(opt => {
            // ¡ESTE ES EL CAMBIO CLAVE!
            // Aceptamos 'opt.id' o 'opt.id_evento' para ser más robustos.
            const rawId = opt.id || opt.id_evento;
            const optionId = (typeof rawId === 'number' || typeof rawId === 'string') ? String(rawId) : null;
            const optionName = opt.nombreParaMostrar || opt.nombreparamostrar;
            const categoria = opt.categoria || '';

            if (optionId) {
                const id = `radio_${optionId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
                container.innerHTML += `<div class="radio-option" data-categoria="${categoria}" data-tipo-id="${optionId}"><input type="radio" id="${id}" name="${name}" value="${optionId}"><label for="${id}">${optionName || optionId}</label></div>`;
            } else {
                console.warn("Se encontró un objeto inválido sin ID en el array de opciones:", opt);
            }
        });
    },

    showNotification: function (message, type = 'warning', duration = 4000) {
        clearTimeout(this.notificationTimer);
        this.elements.notificationBanner.textContent = message;
        this.elements.notificationBanner.className = 'show ' + type;
        this.notificationTimer = setTimeout(() => { this.elements.notificationBanner.className = ''; }, duration);
    },

    toggleLoadingOverlay: function (show, message = 'Cargando...') {
        this.elements.loadingOverlay.querySelector('p').textContent = message;
        this.elements.loadingOverlay.style.display = show ? 'flex' : 'none';
    },

    manejarParametroURL: function () {
        const params = new URLSearchParams(window.location.search);
        const tipoParam = params.get('tipo');
        if (!tipoParam) return;
        // Intentamos varios métodos para seleccionar el radio: por value exacto, por value uppercase,
        // o buscando la etiqueta que coincida con el texto (ej: 'BANDA'). Esto hace la URL más tolerante
        // frente a IDs numéricos o cambios en la API.
        let radio = document.querySelector(`input[name="tipoEvento"][value="${tipoParam}"]`)
            || document.querySelector(`input[name="tipoEvento"][value="${tipoParam.toUpperCase()}"]`);

        if (!radio) {
            // Buscar por etiqueta textual dentro de .radio-option
            const opciones = Array.from(document.querySelectorAll('.radio-option'));
            for (const opt of opciones) {
                const label = opt.querySelector('label');
                if (label && label.textContent && label.textContent.trim().toLowerCase().includes(tipoParam.toLowerCase())) {
                    radio = opt.querySelector('input[name="tipoEvento"]');
                    break;
                }
            }
        }

        if (!radio) return;
        radio.checked = true;
        document.querySelectorAll('.radio-option').forEach(optionDiv => {
            if (optionDiv.querySelector('input') !== radio) { optionDiv.style.display = 'none'; }
        });
        if (this.elements.resetTipoEventoBtn) {
            if (tipoParam && typeof tipoParam === 'string' && tipoParam.trim().toUpperCase() === 'BANDA') {
                // Para solicitudes de banda no mostramos el botón
                this.elements.resetTipoEventoBtn.style.display = 'none';
            } else {
                this.elements.resetTipoEventoBtn.style.display = 'inline-block';
                // Ajustamos el texto para que sea claro: Ver todos los tipos de evento
                try { this.elements.resetTipoEventoBtn.textContent = 'Ver todos los tipos de evento'; } catch (e) { }
            }
        }

        // Si viene un nombre de banda en la URL mostramos una referencia en la descripción
        const nombreBanda = params.get('nombre_banda');
        if (nombreBanda && this.elements.tipoEventoDescripcionDiv) {
            const current = this.elements.tipoEventoDescripcionDiv.innerHTML || '';
            this.elements.tipoEventoDescripcionDiv.innerHTML = current + `<p style="margin-top:8px; font-weight:600;">Referencia: ${decodeURIComponent(nombreBanda)}</p>`;
        }

        this.actualizarTodo();
    },

    guardarCambios: async function () {
        if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) {
            return;
        }

        this.toggleLoadingOverlay(true, 'Guardando cambios...');
        if (this.elements.saveButton) this.elements.saveButton.disabled = true;

        // --- ¡LÓGICA DE RECOLECCIÓN DE DATOS COMPLETA! ---
        // Leemos los valores ACTUALES del formulario en el momento de guardar.
        const selectedRadio = document.querySelector('input[name="tipoEvento"]:checked');
        const bodyData = {
            tipoEvento: selectedRadio ? selectedRadio.value : '',
            cantidadPersonas: this.elements.cantidadPersonasSelect.value,
            duracionEvento: this.elements.duracionEventoSelect.value,
            fechaEvento: this.elements.fechaEventoInput.value,
            horaInicio: this.elements.horaInicioSelect.value,
            // El precio base se recalcula y se envía para mantener consistencia
            precioBase: this.elements.precioBaseInput.value,
            // ¡IMPORTANTE! También enviamos los detalles adicionales
            detallesAdicionales: this.elements.detallesAdicionalesTextarea ? this.elements.detallesAdicionalesTextarea.value : ''
        };

        // Si hay campos de banda en el formulario, los añadimos al body
        if (this.elements.nombreBandaInput) bodyData.nombre_banda = this.elements.nombreBandaInput.value;
        if (this.elements.contactoEmailInput) bodyData.contacto_email = this.elements.contactoEmailInput.value;
        if (this.elements.linkMusicaInput) bodyData.link_musica = this.elements.linkMusicaInput.value;
        if (this.elements.propuestaInput) bodyData.propuesta = this.elements.propuestaInput.value;
        if (this.elements.precioAnticipadaInput) bodyData.precio_anticipada = this.elements.precioAnticipadaInput.value;
        if (this.elements.precioPuertaInput) bodyData.precio_puerta = this.elements.precioPuertaInput.value;


        try {
            // Usamos el endpoint PUT /api/solicitudes/:id, que llama a 'actualizarSolicitud'
            const response = await fetch(`/api/solicitudes/${this.solicitudId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Error del servidor al guardar.');
            }

            this.showNotification("Cambios guardados con éxito", 'success');

            // Deshabilitamos el formulario y cambiamos los botones
            if (this.elements.editFieldset) this.elements.editFieldset.disabled = true;
            if (this.elements.saveButton) this.elements.saveButton.style.display = 'none';
            if (this.elements.cancelButton) {
                this.elements.cancelButton.textContent = 'Volver al Panel';
                this.elements.cancelButton.style.width = '100%';
            }

        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
            if (this.elements.saveButton) this.elements.saveButton.disabled = false;
        } finally {
            this.toggleLoadingOverlay(false);
        }
    },


};


// --- PUNTO DE ENTRADA Y BINDING ---
function initializeApp(config) {
    for (const key in App) {
        if (typeof App[key] === 'function') {
            App[key] = App[key].bind(App);
        }
    }
    App.init(config);
}

