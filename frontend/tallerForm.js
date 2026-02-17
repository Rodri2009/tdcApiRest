// Manejo del formulario de solicitud de taller/actividad
(function () {
    const selectTipos = document.getElementById('tipoTaller');
    const btnNuevoTipo = document.getElementById('btnNuevoTipo');
    const tipoDescripcion = document.getElementById('tipoDescripcion');
    const exceptionsInput = document.getElementById('exceptions');
    const diaSemana = document.getElementById('diaSemana');
    const horaInicioClase = document.getElementById('horaInicioClase');
    const duracionHoras = document.getElementById('duracionHoras');
    const btnAddHorario = document.getElementById('btnAddHorario');
    const scheduleList = document.getElementById('scheduleList');
    const cupoMax = document.getElementById('cupoMax');
    const modalidadPago = document.getElementById('modalidadPago');
    const precioClase = document.getElementById('precioClase');
    const precioSemana = document.getElementById('precioSemana');
    const detalles = document.getElementById('detalles');
    const btnSiguiente = document.getElementById('btnSiguiente');
    const btnEnviar = document.getElementById('btnEnviar');

    let schedule = [];
    let exceptions = [];
    let fingerprint = null;

    function formatDay(n) {
        const map = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
        return map[n] || String(n);
    }

    function renderSchedule() {
        scheduleList.innerHTML = '';
        schedule.forEach((s, idx) => {
            const div = document.createElement('div');
            div.className = 'schedule-item';
            div.innerHTML = `<div>${formatDay(parseInt(s.day))} • ${s.start} • ${s.duration} h</div><div><button data-idx="${idx}" class="btn-ghost">Eliminar</button></div>`;
            scheduleList.appendChild(div);
        });
        scheduleList.querySelectorAll('button').forEach(b => b.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.idx);
            schedule.splice(idx, 1);
            renderSchedule();
        }));
    }

    // Inicializar fingerprint
    if (typeof FingerprintJS !== 'undefined') {
        FingerprintJS.load().then(fp => fp.get()).then(result => {
            fingerprint = result.visitorId;
        }).catch(err => console.warn('Fingerprint error:', err));
    }

    flatpickr(exceptionsInput, {
        locale: 'es', mode: 'multiple', dateFormat: 'Y-m-d', onChange: (selected) => {
            exceptions = selected.map(d => d.toISOString().substring(0, 10));
        }
    });

    let tiposCache = [];
    function loadTipos() {
        fetch('/api/talleres/tipos').then(r => r.json()).then(list => {
            tiposCache = list || [];
            selectTipos.innerHTML = '<option value="">-- Seleccione --</option>' + tiposCache.map(t => `<option value="${t.id}">${t.nombre || t.nombreParaMostrar || t.id}</option>`).join('');
        }).catch(err => {
            console.warn('No se pudieron cargar tipos de taller:', err);
            selectTipos.innerHTML = '<option value="">(no hay tipos disponibles)</option>';
        });
    }

    selectTipos.addEventListener('change', () => {
        const v = selectTipos.value;
        if (!v) { tipoDescripcion.textContent = 'Selecciona un tipo para ver detalles.'; return; }
        const found = tiposCache.find(t => String(t.id) === String(v));
        if (found) {
            tipoDescripcion.textContent = found.descripcion || found.descripcion || JSON.stringify(found);
        } else {
            tipoDescripcion.textContent = 'No se encontró la descripción del tipo seleccionado.';
        }
    });

    btnNuevoTipo.addEventListener('click', () => {
        document.getElementById('modal-crear-tipo').style.display = 'flex';
        document.getElementById('modal-tipo-nombre').focus();
    });

    btnAddHorario.addEventListener('click', (e) => {
        e.preventDefault();
        const d = diaSemana.value;
        const h = horaInicioClase.value;
        const dur = duracionHoras.value;
        if (!h) { showNotification('Seleccione una hora de inicio', 'warning'); return; }
        schedule.push({ day: d, start: h, duration: parseInt(dur) });
        renderSchedule();
    });

    function showNotification(message, type = 'warning', duration = 4000) {
        const banner = document.getElementById('notification-banner');
        if (!banner) return;
        banner.textContent = message;
        banner.className = 'show ' + type;
        setTimeout(() => { banner.className = ''; banner.textContent = ''; }, duration);
    }

    function markInvalid(el) {
        try { el.classList.add('campo-invalido'); el.focus(); } catch (e) { }
    }

    function validate() {
        let ok = true;
        if (!selectTipos.value) { markInvalid(selectTipos); showNotification('Seleccione un tipo de taller/actividad', 'warning'); ok = false; }
        if (schedule.length === 0) { showNotification('Agregue al menos un horario semanal', 'warning'); ok = false; }
        if (!cupoMax.value || parseInt(cupoMax.value) < 1) { markInvalid(cupoMax); showNotification('Ingrese un cupo válido (mayor a 0)', 'warning'); ok = false; }
        return ok;
    }

    function buildDraft() {
        return {
            tipo: selectTipos.value,
            tipoNombre: selectTipos.options[selectTipos.selectedIndex]?.text || '',
            schedule: schedule.slice(),
            exceptions: exceptions.slice(),
            cupoMax: parseInt(cupoMax.value),
            modalidadPago: modalidadPago.value,
            precioClase: parseFloat(precioClase.value) || 0,
            precioSemana: parseFloat(precioSemana.value) || 0,
            detalles: detalles.value || '',
            fingerprintId: fingerprint
        };
    }

    btnSiguiente.addEventListener('click', (e) => {
        e.preventDefault();
        if (!validate()) return;
        const draft = buildDraft();
        const key = `sol_taller_draft_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify(draft));
        window.location.href = `/contacto.html?from=taller&draftKey=${encodeURIComponent(key)}`;
    });

    btnEnviar.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!validate()) return;
        const draft = buildDraft();
        try {
            const payload = {
                tipoEvento: 'TALLER',
                tipoId: draft.tipo,
                nombreParaMostrar: draft.tipoNombre,
                schedule: draft.schedule,
                exceptions: draft.exceptions,
                cupoMax: draft.cupoMax,
                modalidadPago: draft.modalidadPago,
                precioClase: draft.precioClase,
                precioSemana: draft.precioSemana,
                detalles: draft.detalles,
                fingerprintId: draft.fingerprintId || null
            };
            const res = await fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!res.ok) throw new Error('Error al crear la solicitud');
            const json = await res.json();
            showNotification('Solicitud creada. Se le solicitará los datos de contacto a continuación.', 'success');
            window.location.href = `/contacto.html?solicitudId=${encodeURIComponent(json.solicitudId)}`;
        } catch (err) {
            console.warn('Envio directo falló, guardando como borrador local:', err);
            const key = `sol_taller_draft_${Date.now()}`;
            localStorage.setItem(key, JSON.stringify(draft));
            window.location.href = `/contacto.html?from=taller&draftKey=${encodeURIComponent(key)}`;
        }
    });

    loadTipos();
})();

// Función global para guardar nuevo tipo desde el modal
function guardarNuevoTipo() {
    const nombre = document.getElementById('modal-tipo-nombre').value.trim();
    const descripcion = document.getElementById('modal-tipo-descripcion').value.trim();

    if (!nombre) {
        alert('Por favor ingresa un nombre para el tipo');
        return;
    }

    const id = nombre.toUpperCase().replace(/\s+/g, '_').substring(0, 40);
    const payload = { id, nombre, descripcion, esPublico: 1, categoria: 'TALLERES_ACTIVIDADES' };

    fetch('/api/talleres/tipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(async r => {
            if (!r.ok) {
                const errText = await r.text();
                throw new Error(errText || `Error ${r.status}`);
            }
            return r.json();
        })
        .then(created => {
            document.getElementById('modal-crear-tipo').style.display = 'none';
            document.getElementById('modal-tipo-nombre').value = '';
            document.getElementById('modal-tipo-descripcion').value = '';

            // Recargar tipos
            const selectTipos = document.getElementById('tipoTaller');
            fetch('/api/talleres/tipos')
                .then(r => r.json())
                .then(list => {
                    selectTipos.innerHTML = '<option value="">-- Seleccione --</option>' +
                        (list || []).map(t => `<option value="${t.id}">${t.nombre}</option>`).join('');
                    // Seleccionar el nuevo tipo
                    selectTipos.value = id;
                    selectTipos.dispatchEvent(new Event('change'));

                    const banner = document.getElementById('notification-banner');
                    if (banner) {
                        banner.textContent = 'Tipo creado correctamente';
                        banner.className = 'show success';
                        setTimeout(() => { banner.className = ''; }, 3000);
                    }
                });
        })
        .catch(err => {
            alert('Error: ' + err.message);
        });
}
