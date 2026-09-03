// Manejo del formulario de solicitud de taller/actividad
(function () {
    const selectTipos = document.getElementById('tipoTaller');
    const tipoDescripcion = document.getElementById('tipoDescripcion');
    const nombreTallerInput = document.getElementById('nombreTaller');
    const descripcionTallerInput = document.getElementById('descripcionTaller');
    const exceptionsInput = document.getElementById('exceptions');
    const diaSemana = document.getElementById('diaSemana');
    const horaInicioClase = document.getElementById('horaInicioClase');
    const duracionHoras = document.getElementById('duracionHoras');
    const btnAddHorario = document.getElementById('btnAddHorario');
    const scheduleList = document.getElementById('scheduleList');
    const cupoMax = document.getElementById('cupoMax');
    const precioClase = document.getElementById('precioClase');
    const precioSemana = document.getElementById('precioSemana');
    const precioMes = document.getElementById('precioMes');
    const detalles = document.getElementById('detalles');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnSiguiente = document.getElementById('btnSiguiente');

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
            tiposCache = (list || []).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
            selectTipos.innerHTML = '<option value="">-- Seleccione --</option>' + tiposCache.map(t => `<option value="${t.id}">${t.nombre || t.nombreParaMostrar || t.id}</option>`).join('');
            if (!selectTipos.value && nombreTallerInput.value.trim() === '') {
                const first = tiposCache[0];
                if (first) {
                    nombreTallerInput.value = first.nombre || '';
                }
            }
        }).catch(err => {
            console.warn('No se pudieron cargar tipos de taller:', err);
            selectTipos.innerHTML = '<option value="">(no hay tipos disponibles)</option>';
        });
    }

    selectTipos.addEventListener('change', () => {
        const v = selectTipos.value;
        if (!v) {
            tipoDescripcion.textContent = 'Selecciona un tipo para ver detalles.';
            return;
        }
        const found = tiposCache.find(t => String(t.id) === String(v));
        if (found) {
            tipoDescripcion.textContent = found.descripcion || 'Sin descripción disponible para este tipo.';
            if (!nombreTallerInput.value.trim()) {
                nombreTallerInput.value = found.nombre || '';
            }
        } else {
            tipoDescripcion.textContent = 'No se encontró la descripción del tipo seleccionado.';
        }
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
        if (!nombreTallerInput.value.trim()) { markInvalid(nombreTallerInput); showNotification('Ingrese el nombre del taller o actividad', 'warning'); ok = false; }
        if (schedule.length === 0) { showNotification('Agregue al menos un horario semanal', 'warning'); ok = false; }
        if (!cupoMax.value || parseInt(cupoMax.value) < 1) { markInvalid(cupoMax); showNotification('Ingrese un cupo válido (mayor a 0)', 'warning'); ok = false; }
        return ok;
    }

    function buildDraft() {
        return {
            tipo: selectTipos.value,
            tipoNombre: selectTipos.options[selectTipos.selectedIndex]?.text || '',
            nombreTaller: nombreTallerInput.value.trim(),
            descripcionTaller: descripcionTallerInput.value.trim(),
            schedule: schedule.slice(),
            exceptions: exceptions.slice(),
            cupoMax: parseInt(cupoMax.value),
            precioClase: parseFloat(precioClase.value) || 0,
            precioSemana: parseFloat(precioSemana.value) || 0,
            precioMes: parseFloat(precioMes.value) || 0,
            detalles: detalles.value || '',
            fingerprintId: fingerprint
        };
    }

    btnCancelar.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = '/index.html';
        }
    });

    btnSiguiente.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!validate()) return;
        const draft = buildDraft();
        try {
            const payload = {
                tipoEvento: 'TALLER',
                tipoId: draft.tipo,
                nombreParaMostrar: draft.nombreTaller || draft.tipoNombre,
                nombre_taller: draft.nombreTaller || draft.tipoNombre,
                descripcion: draft.descripcionTaller || draft.detalles || '',
                descripcionGeneral: draft.descripcionTaller || draft.detalles || '',
                schedule: draft.schedule,
                exceptions: draft.exceptions,
                cupoMax: draft.cupoMax,
                precioClase: draft.precioClase,
                precioSemana: draft.precioSemana,
                precioMes: draft.precioMes,
                detalles: draft.detalles || draft.descripcionTaller || '',
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
