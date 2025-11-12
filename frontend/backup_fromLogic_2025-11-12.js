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
    elements: {},

    // =================================================================
    // MÉTODOS
    // =================================================================

    init: function (config) {
        console.log(`App.init(): Modo '${config.mode}'`, config);
        this.config = config;
        this.bindElements();
        this.bindEvents();
        this.cargarOpcionesIniciales();
    },

    bindElements: function () {
        console.log("App.init(): 2. Enlazando elementos del DOM.");
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

        // Elementos condicionales
        if (this.config.mode === 'create') {
            console.log("   -> Enlazando elementos para el modo de creación.");
            this.elements.btnAdicionales = document.getElementById('btn-adicionales');
            this.elements.btnContacto = document.getElementById('btn-contacto');
            this.elements.resetTipoEventoBtn = document.getElementById('resetTipoEventoBtn');
        } else { // modo 'edit'
            console.log("   -> Enlazando elementos para el modo de edición.");
            this.elements.saveButton = document.getElementById('save-button');
            this.elements.cancelButton = document.getElementById('cancel-button');
            this.elements.editFieldset = document.getElementById('edit-fieldset');
            this.elements.detallesAdicionalesTextarea = document.getElementById('detallesAdicionales');
        }
    },

    bindEvents: function () {
        console.log("App.init(): 3. Asignando eventos.");
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) window.location.reload();
        });

        if (this.config.mode === 'create') {
            this.elements.btnAdicionales.addEventListener('click', this.validarYEnviar.bind(this, 'adicionales'));
            this.elements.btnContacto.addEventListener('click', this.validarYEnviar.bind(this, 'contacto'));
            this.elements.resetTipoEventoBtn.onclick = () => { window.location.href = '/'; };
        } else { // modo 'edit'
            this.elements.saveButton.addEventListener('click', this.guardarCambios.bind(this));
            this.elements.cancelButton.addEventListener('click', () => { window.location.href = '/Admin.html'; });
        }

        [this.elements.cantidadPersonasSelect, this.elements.duracionEventoSelect, this.elements.horaInicioSelect].forEach(el => {
            if (el) el.addEventListener('change', () => this.actualizarTodo());
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
        console.log("Paso 1: Llamando a la nueva API backend...");
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
            fechasOcupadas: '/api/opciones/fechas-ocupadas',
            config: '/api/opciones/config'
        };

        console.log("Endpoints a consultar:", endpoints);


        /*Promise.all(
            Object.values(endpoints).map(url =>
                fetch(url).then(res => {
                    if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
                    return res.json();
                })
            )
        )*/
        Promise.all(
            Object.values(endpoints).map(url =>
                fetch(url).then(res => {
                    // Añadimos un chequeo de 401 para el caso del admin
                    if (res.status === 401) {
                        window.location.href = '/Login.html';
                        throw new Error('No autorizado');
                    }
                    if (!res.ok) throw new Error(`Error al cargar ${url}: ${res.statusText}`);
                    return res.json();
                })
            )
        )

            .then(results => {
                const [tipos, tarifas, duraciones, horas, fechasOcupadas, config] = results;
                console.log("PASO 2: Datos crudos recibidos del backend.");

                this.tarifas = tarifas || [];
                this.tiposDeEvento = tipos || [];
                this.opcionesDuraciones = duraciones || {};
                this.opcionesHoras = horas || {};
                this.fechasOcupadasSeguro = fechasOcupadas || [];

                this.opcionesCantidades = this.tarifas.reduce((acc, tarifa) => {
                    if (!acc[tarifa.tipo]) acc[tarifa.tipo] = new Set();
                    acc[tarifa.tipo].add(`Hasta ${tarifa.max}`);
                    return acc;
                }, {});
                Object.keys(this.opcionesCantidades).forEach(tipo => {
                    this.opcionesCantidades[tipo] = Array.from(this.opcionesCantidades[tipo]).sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
                });

                this.descripcionesTipos = {};
                this.tiposDeEvento.forEach(tipo => { this.descripcionesTipos[tipo.id] = tipo.descripcion; });

                return this.cargarFeriados()
                    .then(() => {
                        console.log("Paso 3: Todos los datos cargados. Construyendo UI...");


                        /*this.llenarRadioButtons(this.elements.tipoEventoContainer, 'tipoEvento', this.tiposDeEvento);
                        this.elements.tipoEventoContainer.querySelectorAll('input[name="tipoEvento"]').forEach(radio => radio.addEventListener('change', () => this.actualizarTodo()));
                        this.llenarSelect(this.elements.cantidadPersonasSelect, [], 'Seleccione tipo...');
                        this.llenarSelect(this.elements.duracionEventoSelect, [], 'Seleccione tipo...');
                        this.llenarSelect(this.elements.horaInicioSelect, [], 'Seleccione tipo...');
                        this.inicializarCalendario(this.fechasOcupadasSeguro, this.feriadosGlobal);*/

                        this.decidirEstadoInicial();
                    });
            })
            .catch(error => {
                console.error("Fallo crítico al cargar datos:", error);
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

    construirUI: function(fechaExcepcion = null) {
        console.log("Construyendo UI. Excepción de fecha:", fechaExcepcion);
        this.llenarRadioButtons(this.elements.tipoEventoContainer, 'tipoEvento', this.tiposDeEvento);
        this.elements.tipoEventoContainer.querySelectorAll('input[name="tipoEvento"]').forEach(radio => radio.addEventListener('change', () => this.actualizarTodo()));
        this.llenarSelect(this.elements.cantidadPersonasSelect, [], 'Seleccione tipo...');
        this.llenarSelect(this.elements.duracionEventoSelect, [], 'Seleccione tipo...');
        this.llenarSelect(this.elements.horaInicioSelect, [], 'Seleccione tipo...');
        this.inicializarCalendario(this.fechasOcupadasSeguro, this.feriadosGlobal, fechaExcepcion);
    },


    decidirEstadoInicial: function() {
        const params = new URLSearchParams(window.location.search);
        const idFromUrl = params.get('solicitudId');

        if (this.config.mode === 'edit' && idFromUrl) {
            // MODO EDICIÓN
            this.solicitudId = idFromUrl;
            console.log(`Modo Edición: Cargando solicitud ID: ${idFromUrl}`);
            fetch(`/api/solicitudes/${this.solicitudId}`)
                .then(res => res.json())
                .then(solicitudData => {
                    if (!solicitudData) throw new Error("Solicitud no encontrada");
                    // Construimos la UI CON la fecha de excepción
                    this.construirUI(solicitudData.fechaEvento || solicitudData.fecha_evento);
                    // Rellenamos el formulario
                    this.populateForm(solicitudData);
                    this.toggleLoadingOverlay(false);
                    this.habilitarBotones();
                });
        } else {
            // MODO CREACIÓN
            console.log("Modo Creación: Construyendo UI limpia.");
            this.construirUI(); // Construimos la UI sin excepción de fecha
            this.initFingerprint(); // Buscamos sesión por fingerprint
        }
    },


    initFingerprint: function () {
        console.log("Paso 4: Iniciando Fingerprint...");
        FingerprintJS.load()
            .then(fp => fp.get())
            .then(result => {
                this.visitorId = result.visitorId;
                console.log("Paso 5: Fingerprint ID generado:", this.visitorId);
                this.buscarSesionExistente();
            })
            .catch(error => {
                console.error("Error al generar Fingerprint:", error);
                this.visitorId = 'fingerprint_error';
                this.toggleLoadingOverlay(false);
                this.habilitarBotones();
            });
    },

    buscarSesionExistente: function () {
        console.log(`[FE] Buscando sesión por Fingerprint...`);
        fetch(`/api/solicitudes/sesion?fingerprintId=${this.visitorId}`)
            .then(res => res.json())
            .then(sessionData => {
                if (sessionData && sessionData.solicitudId) {
                    console.log("[FE] Sesión encontrada. Rellenando formulario.", sessionData);
                    this.solicitudId = sessionData.solicitudId;
                    this.populateForm(sessionData);
                    this.showNotification("Se cargaron los datos de tu sesión anterior.", "success");
                } else {
                    console.log("[FE] No se encontraron sesiones activas.");
                }
            })
            .catch(err => console.error("[FE] Error al buscar sesión:", err))
            .finally(() => {
                this.toggleLoadingOverlay(false);
                this.habilitarBotones();
            });
    },

    // =================================================================
    // 3. LÓGICA DE INTERACCIÓN Y UI
    // =================================================================
    populateForm: function (solicitud) {
        console.group("--- INICIO populateForm (v-override-final) ---");
        console.log("Datos de la solicitud recibidos:", solicitud);

        const tipo = solicitud.tipoEvento || solicitud.tipo_de_evento;
        const cantidad = solicitud.cantidadPersonas || solicitud.cantidad_de_personas;
        const duracion = solicitud.duracionEvento || solicitud.duracion;
        const fecha = solicitud.fechaEvento || solicitud.fecha_evento;
        const hora = solicitud.horaInicio || solicitud.hora_evento;
        const detalles = solicitud.descripcion || '';

        // 1. Establecer el tipo
        const radio = document.querySelector(`input[name="tipoEvento"][value="${tipo}"]`);
        if (radio) radio.checked = true;

        // 2. Sincronizar el calendario (solo visual)
        if (fecha && this.calendario) {
            const fechaObj = new Date(fecha + 'T00:00:00');
            this.calendario.setDate(fechaObj, false);
            //this.calendario.setDate(fecha, false);
        }

        // 3. Llamar a actualizarTodo pasándole TODOS los datos que conocemos.
        // Esto llenará los selects y calculará el precio inicial.
        console.log("populate: Ejecutando actualización con TODOS los datos de override...");
        this.actualizarTodo('populate-final', {
            overrideTipo: tipo,
            overrideCantidad: cantidad,
            overrideDuracion: duracion,
            overrideFechaStr: fecha,
            overrideHora: hora
        });

        // 4. Rellenar el campo de detalles
        if (this.elements.detallesAdicionalesTextarea) {
            this.elements.detallesAdicionalesTextarea.value = detalles;
        }

        console.groupEnd();
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
            this.showNotification('Por favor, completa todos los campos obligatorios.', 'warning');
            return;
        }

        // --- ¡CORRECCIÓN! DESHABILITAMOS LOS BOTONES INMEDIATAMENTE ---
        this.toggleLoadingOverlay(true, 'Guardando solicitud...');
        this.elements.btnAdicionales.disabled = true;
        this.elements.btnContacto.disabled = true;
        console.log(`[FE] Botones deshabilitados, iniciando fetch. ID de solicitud actual: ${this.solicitudId}`);

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
            console.log("[FE] Creando/Actualizando...");
            if (this.solicitudId) {
                console.log(`[FE] DECISIÓN: Actualizar (PUT) solicitud ID: ${this.solicitudId}`);
                response = await fetch(`/api/solicitudes/${this.solicitudId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
            } else {
                console.log("[FE] DECISIÓN: Crear (POST) nueva solicitud.");
                response = await fetch('/api/solicitudes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyData)
                });
            }
            console.log("[FE] Fetch completado.");

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Error del servidor');
            }

            const data = await response.json();
            const id = data.solicitudId;
            if (!id) throw new Error("Respuesta inválida del servidor.");

            this.solicitudId = id;

            const nextPage = (destino === 'adicionales') ? 'Adicionales.html' : 'Contacto.html';
            const fromParam = (destino === 'contacto') ? '&from=page' : '';
            const urlFinal = `${nextPage}?solicitudId=${id}${fromParam}`;

            console.log(`[FE] Redirección inminente a: ${urlFinal}`);


            // --- ¡CAMBIO CLAVE! ---
            // Forzamos la redirección en un nuevo ciclo de eventos para evitar bloqueos.
            setTimeout(() => {
                window.location.href = urlFinal;
            }, 50); // Una pequeña demora de 50ms es suficiente


        } catch (error) {
            console.error('[FE] Error en validarYEnviar:', error);
            this.showNotification(`Error: ${error.message}`, 'error');
            // Si algo falla, volvemos a habilitar todo.
            this.toggleLoadingOverlay(false);
            this.habilitarBotones();
        }
    },

    inicializarCalendario: function (fechasOcupadas, feriados, fechaExcepcion = null) {
        console.log("--- INICIO inicializarCalendario ---");
        console.log("Fecha a exceptuar de la deshabilitación:", fechaExcepcion); const fechasADeshabilitar = fechaExcepcion
            ? fechasOcupadas.filter(fecha => fecha !== fechaExcepcion)
            : fechasOcupadas;

        try {
            const config = {
                locale: "es",
                altInput: true,
                altFormat: "j \\de F, Y",
                dateFormat: "Y-m-d",
                minDate: "today",
                disable: [
                    (date) => {
                        const esFinDeSemana = date.getDay() === 0 || date.getDay() === 6;
                        const fechaStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        const esFeriado = feriados.includes(fechaStr);
                        return !(esFinDeSemana || esFeriado);
                    },
                    ...(fechasADeshabilitar || [])
                ],
                onChange: () => this.actualizarTodo()
            };

            this.calendario = flatpickr(this.elements.fechaEventoInput, config);
            console.log("--- FIN inicializarCalendario (Éxito) ---");
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
        console.groupCollapsed(`--- Actualizando Formulario (llamado por: ${caller}) ---`);
        console.log("Overrides recibidos:", overrides);

        // --- ¡LÓGICA CLAVE! Leemos del override O del DOM ---
        const tipoId = overrides.overrideTipo || document.querySelector('input[name="tipoEvento"]:checked')?.value || '';
        const fechaStr = overrides.overrideFechaStr || this.elements.fechaEventoInput.value;
        const cantidad = overrides.overrideCantidad || this.elements.cantidadPersonasSelect.value;
        const duracion = overrides.overrideDuracion || this.elements.duracionEventoSelect.value;
        const hora = overrides.overrideHora || this.elements.horaInicioSelect.value;

        const fechaSeleccionada = fechaStr ? new Date(fechaStr + 'T00:00:00') : null;

        console.log("actualizarTodo: Estado FINAL a procesar ->", { tipoId, fechaStr, cantidad, duracion, hora });

        // 1. Actualizar Descripción
        this.elements.tipoEventoDescripcionDiv.innerHTML = tipoId ? this.descripcionesTipos[tipoId] || 'Sin descripción.' : 'Seleccione un tipo de evento.';

        // 2. Poblar selects de Cantidad y Duración
        if (tipoId) {
            this.llenarSelect(this.elements.cantidadPersonasSelect, this.opcionesCantidades[tipoId] || [], 'Seleccione cantidad...');
            this.llenarSelect(this.elements.duracionEventoSelect, this.opcionesDuraciones[tipoId] || [], 'Seleccione duración...');
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

            const todosLosHorariosParaTipo = this.opcionesHoras[tipoId] || [];
            const horariosFiltrados = todosLosHorariosParaTipo.filter(h => h.tipoDia === 'todos' || h.tipoDia === tipoDeDia).map(h => h.hora).sort();

            this.llenarSelect(this.elements.horaInicioSelect, horariosFiltrados, 'Seleccione hora...');
            this.elements.horaInicioSelect.value = hora; // Restauramos el valor de la hora
        } else {
            this.llenarSelect(this.elements.horaInicioSelect, [], 'Seleccione tipo y fecha');
        }

        // 4. Actualizar el Resumen y el Precio
        // (Esta es tu lógica original, que está bien, la adaptamos ligeramente)
        const tipoSeleccionado = this.tiposDeEvento.find(t => t.id === tipoId);
        const nombreParaMostrar = tipoSeleccionado ? tipoSeleccionado.nombreParaMostrar : '';
        const montoSena = tipoSeleccionado ? tipoSeleccionado.montoSena : 0;
        const depositoGarantia = tipoSeleccionado ? tipoSeleccionado.depositoGarantia : 0;
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
        if (montoSena > 0) detalleHtml += `<li style="margin-top:10px; color: #0056b3;"><strong>Seña:</strong> $${this.convertirNumero(montoSena)} (no reint.)</li>`;
        detalleHtml += '</ul>';

        this.elements.presupuestoDetalleDiv.innerHTML = detalleHtml;


        if (tipoId && cantidad && duracion && fechaSeleccionada) {
            const cantidadNum = parseInt(cantidad.match(/\d+/)[0]);
            const fechaEventoStr = `${fechaSeleccionada.getFullYear()}-${String(fechaSeleccionada.getMonth() + 1).padStart(2, '0')}-${String(fechaSeleccionada.getDate()).padStart(2, '0')}`;
            const reglasAplicables = this.tarifas.filter(r => {
                const tipoCoincide = r.tipo.toUpperCase() === tipoId.toUpperCase();
                const cantidadCoincide = cantidadNum >= r.min && cantidadNum <= r.max;
                const fechaCoincide = fechaEventoStr >= r.fechaVigencia;
                return tipoCoincide && cantidadCoincide && fechaCoincide;
            });

            if (reglasAplicables.length > 0) {
                reglasAplicables.sort((a, b) => new Date(b.fechaVigencia) - new Date(a.fechaVigencia));
                const reglaFinal = reglasAplicables[0];
                const precioCalculado = reglaFinal.precioPorHora * duracionNum;

                let detallePrecios = '<ul>';
                if (precioCalculado > 0) detallePrecios += `<li style="color: #555;"><strong>Precio básico:</strong> $${this.convertirNumero(precioCalculado)}</li>`;
                if (depositoGarantia > 0) detallePrecios += `<li style="color: #555;"><strong>Depósito reintegrable:</strong> $${this.convertirNumero(depositoGarantia)}</li>`;
                detallePrecios += '</ul>';
                this.elements.detallePreciosDiv.innerHTML = detallePrecios;

                // --- ¡NUEVA LÓGICA DE TOTAL! ---
                const totalConDeposito = parseFloat(precioCalculado) + parseFloat(depositoGarantia);

                this.elements.presupuestoTotalDiv.innerHTML = `<span>Total: </span> $${this.convertirNumero(totalConDeposito)}`;

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
        console.log("Paso 6: Habilitando botones de acción.");

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
            console.log("   -> Modo edición, no se habilitan botones de creación.");
        }
    },

    llenarSelect: function (select, options, placeholder) {
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder}</option>`;
        select.disabled = !(options && options.length > 0);
        if (select.disabled) return;
        options.forEach(opt => { select.innerHTML += `<option value="${opt}">${opt}</option>`; });
    },

    llenarRadioButtons: function (container, name, options) {
        if (!container) return;
        console.log("Datos recibidos por llenarRadioButtons:", options);
        container.innerHTML = '';
        if (!options || options.length === 0) return;

        options.forEach(opt => {
            // ¡ESTE ES EL CAMBIO CLAVE!
            // Aceptamos 'opt.id' o 'opt.id_evento' para ser más robustos.
            const optionId = opt.id || opt.id_evento;
            const optionName = opt.nombreParaMostrar || opt.nombreparamostrar;

            if (optionId) {
                const id = `radio_${optionId.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
                container.innerHTML += `<div class="radio-option"><input type="radio" id="${id}" name="${name}" value="${optionId}"><label for="${id}">${optionName}</label></div>`;
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
        const radio = document.querySelector(`input[name="tipoEvento"][value="${tipoParam.toUpperCase()}"]`);
        if (!radio) return;
        radio.checked = true;
        document.querySelectorAll('.radio-option').forEach(optionDiv => {
            if (optionDiv.querySelector('input') !== radio) { optionDiv.style.display = 'none'; }
        });
        this.elements.resetTipoEventoBtn.style.display = 'inline-block';
        this.actualizarTodo();
    },

    guardarCambios: async function () {
        if (!confirm("¿Estás seguro de que quieres guardar los cambios?")) return;

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

        console.log("Guardando cambios. Datos a enviar:", bodyData);

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
