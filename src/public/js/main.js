// Funcionalidades globales de la aplicación

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
        // Guardar el estado en localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);
        
        // Actualizar posición del botón toggle
        if (toggle) {
            if (isCollapsed) {
                toggle.style.left = '48px';
            } else {
                toggle.style.left = 'calc(var(--sidebar-width) - 16px)';
            }
        }
    }
}

// Restaurar estado del sidebar al cargar
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.querySelector('.sidebar-toggle');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
        // Asegurar que el toggle esté en la posición correcta cuando está colapsado
        if (toggle) {
            toggle.style.left = '48px';
        }
    } else if (toggle) {
        // Si no está colapsado, asegurar posición normal
        toggle.style.left = 'calc(var(--sidebar-width) - 16px)';
    }
});

// Toggle filter dropdowns
function toggleFilterSecciones(buttonElement) {
    const dropdown = document.getElementById('filterSecciones');
    const sponsorsDropdown = document.getElementById('filterSponsors');
    
    // Cerrar otros dropdowns
    if (sponsorsDropdown) {
        sponsorsDropdown.style.display = 'none';
    }
    
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            // Obtener el botón que disparó el evento
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterSecciones"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '10000';
                dropdown.style.background = 'white';
            }
            dropdown.style.display = 'block';
        }
    }
}

function toggleFilterSponsors(buttonElement) {
    const dropdown = document.getElementById('filterSponsors');
    const seccionesDropdown = document.getElementById('filterSecciones');
    
    // Cerrar otros dropdowns
    if (seccionesDropdown) {
        seccionesDropdown.style.display = 'none';
    }
    
    if (dropdown) {
        const isVisible = dropdown.style.display === 'block';
        
        if (isVisible) {
            dropdown.style.display = 'none';
        } else {
            // Obtener el botón que disparó el evento
            const button = buttonElement || document.querySelector('button[onclick*="toggleFilterSponsors"]');
            if (button) {
                const rect = button.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = rect.left + 'px';
                dropdown.style.zIndex = '10000';
            }
            dropdown.style.display = 'block';
        }
    }
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', function(event) {
    const filterDropdowns = document.querySelectorAll('.filter-dropdown');
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    let clickedInside = false;
    
    filterButtons.forEach(button => {
        if (button.contains(event.target)) {
            clickedInside = true;
        }
    });
    
    filterDropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target)) {
            clickedInside = true;
        }
    });
    
    if (!clickedInside) {
        filterDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
});

// Aplicar filtros con selección múltiple
function aplicarFiltros() {
    const seccionesSeleccionadas = Array.from(document.querySelectorAll('.filter-checkbox-seccion:checked')).map(cb => cb.value);
    const sponsorsSeleccionados = Array.from(document.querySelectorAll('.filter-checkbox-sponsor:checked')).map(cb => cb.value);
    
    const params = new URLSearchParams(window.location.search);
    
    // Limpiar filtros anteriores
    params.delete('secciones');
    params.delete('sponsors');
    
    // Agregar nuevos filtros
    if (seccionesSeleccionadas.length > 0) {
        seccionesSeleccionadas.forEach(seccion => {
            params.append('secciones', seccion);
        });
    }
    
    if (sponsorsSeleccionados.length > 0) {
        sponsorsSeleccionados.forEach(sponsor => {
            params.append('sponsors', sponsor);
        });
    }
    
    window.location.search = params.toString();
}

function removerFiltroSeccion(seccion) {
    const params = new URLSearchParams(window.location.search);
    const secciones = params.getAll('secciones').filter(s => s !== seccion);
    params.delete('secciones');
    secciones.forEach(s => params.append('secciones', s));
    window.location.search = params.toString();
}

function removerFiltroSponsor(sponsor) {
    const params = new URLSearchParams(window.location.search);
    const sponsors = params.getAll('sponsors').filter(s => s !== sponsor);
    params.delete('sponsors');
    sponsors.forEach(s => params.append('sponsors', s));
    window.location.search = params.toString();
}

function limpiarFiltros() {
    const params = new URLSearchParams(window.location.search);
    params.delete('secciones');
    params.delete('sponsors');
    window.location.search = params.toString();
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.filter-btn') && !e.target.closest('.filter-dropdown')) {
        const seccionesDropdown = document.getElementById('filterSecciones');
        const sponsorsDropdown = document.getElementById('filterSponsors');
        if (seccionesDropdown) seccionesDropdown.style.display = 'none';
        if (sponsorsDropdown) sponsorsDropdown.style.display = 'none';
    }
});

// Cambiar vista (lista/tarjetas)
function cambiarVista(vista) {
    const params = new URLSearchParams(window.location.search);
    params.set('vista', vista);
    window.location.search = params.toString();
}

// Búsqueda
function buscar(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const params = new URLSearchParams(window.location.search);
        params.set('busqueda', searchInput.value);
        window.location.search = params.toString();
    }
}

// Búsqueda en Score
function buscarScore(event) {
    if (event) event.preventDefault();
    const searchInput = document.getElementById('searchScoreInput');
    if (searchInput) {
        const searchTerm = searchInput.value.toLowerCase();
        // Buscar en las tarjetas de score
        const cards = document.querySelectorAll('[style*="grid-template-columns"] > div');
        cards.forEach(card => {
            const title = card.querySelector('h3, .item-title, div[style*="font-weight"]');
            if (title) {
                const text = title.textContent.toLowerCase();
                if (text.includes(searchTerm) || searchTerm === '') {
                    card.style.display = '';
                } else {
                    card.style.display = 'none';
                }
            }
        });
    }
}

// Filtrar por campo
function filtrarPor(campo, valor) {
    const params = new URLSearchParams(window.location.search);
    if (valor) {
        params.set(campo, valor);
    } else {
        params.delete(campo);
    }
    // Cerrar dropdown
    const dropdown = document.getElementById('filterDropdown');
    if (dropdown) {
        dropdown.classList.remove('active');
    }
    window.location.search = params.toString();
}

// Mantener compatibilidad con filtrarPorSeccion
function filtrarPorSeccion(seccion) {
    filtrarPor('seccion', seccion);
}

// Ordenar
function ordenar(campo) {
    const params = new URLSearchParams(window.location.search);
    const ordenActual = params.get('orden');
    const direccionActual = params.get('direccion');
    
    if (ordenActual === campo) {
        // Cambiar dirección
        params.set('direccion', direccionActual === 'asc' ? 'desc' : 'asc');
    } else {
        params.set('orden', campo);
        params.set('direccion', 'desc');
    }
    
    window.location.search = params.toString();
}

// Actualizar UI de ordenamiento
function actualizarOrdenamiento() {
    const params = new URLSearchParams(window.location.search);
    const ordenActual = params.get('orden') || 'score_total'; // Por defecto score_total
    const direccionActual = params.get('direccion') || 'desc'; // Por defecto desc
    
    // Remover clases sorted de todos los headers
    document.querySelectorAll('.list-header > div').forEach(header => {
        header.classList.remove('sorted');
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
        }
    });
    
    // Agregar clase sorted al header actual (siempre score_total por defecto)
    const headerActual = document.querySelector(`[data-sort="${ordenActual}"]`);
    if (headerActual) {
        headerActual.classList.add('sorted');
        const sortIcon = headerActual.querySelector('.sort-icon');
        if (sortIcon) {
            if (direccionActual === 'asc') {
                // Flecha hacia arriba
                sortIcon.innerHTML = '<path d="M7 14l5-5 5 5z"/>';
            } else {
                // Flecha hacia abajo
                sortIcon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
            }
        }
    }
}

// Ver detalle de funcionalidad
function verDetalle(id) {
    if (!id) return;
    window.location.href = `/funcionalidades/${encodeURIComponent(id)}`;
}

// Sincronizar con Redmine
async function sincronizarRedmine() {
    const button = document.getElementById('syncButton');
    if (!button) return;
    
    // Deshabilitar botón
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    
    // Mostrar popup de sincronización
    mostrarPopupSincronizacion();
    
    try {
        const response = await fetch('/api/redmine/sincronizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project_id: null, // Usará REDMINE_DEFAULT_PROJECT del backend
                tracker_id: null, // Usará el tracker por defecto del backend (Epics)
                max_total: null // Sin límite para sincronización manual
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizar barra de progreso a 100%
            actualizarProgresoSincronizacion(100);
            // Esperar un momento y recargar
            setTimeout(() => {
                ocultarPopupSincronizacion();
                window.location.reload();
            }, 500);
        } else {
            ocultarPopupSincronizacion();
            console.error('Error en la sincronización:', data.error || 'Error desconocido');
        }
    } catch (error) {
        ocultarPopupSincronizacion();
        console.error('Error al sincronizar:', error);
    } finally {
        // Restaurar botón
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

// Sincronizar Proyectos Internos con Redmine
async function sincronizarProyectosInternos() {
    const button = document.getElementById('syncButton');
    if (!button) return;
    
    // Deshabilitar botón
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    
    // Mostrar popup de sincronización
    mostrarPopupSincronizacion();
    
    try {
        const response = await fetch('/api/redmine/sincronizar-proyectos-internos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracker_id: null, // Opcional: filtrar por tracker
                max_total: null // Sin límite para sincronización manual
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Limpiar intervalo de progreso simulado
            const overlay = document.getElementById('syncOverlay');
            if (overlay && overlay.dataset.intervalo) {
                clearInterval(parseInt(overlay.dataset.intervalo));
            }
            // Actualizar barra de progreso a 100%
            actualizarProgresoSincronizacion(100);
            // Esperar un momento y recargar
            setTimeout(() => {
                ocultarPopupSincronizacion();
                window.location.reload();
            }, 500);
        } else {
            ocultarPopupSincronizacion();
            console.error('Error en la sincronización:', data.error || 'Error desconocido');
            alert('Error al sincronizar: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        ocultarPopupSincronizacion();
        console.error('Error al sincronizar:', error);
        alert('Error al sincronizar: ' + error.message);
    } finally {
        // Restaurar botón
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

// Sincronizar Requerimientos de Clientes con Redmine
// ⚠️ SOLO CONSULTA - No se realizan modificaciones en Redmine
async function sincronizarReqClientes() {
    const button = document.getElementById('syncButton');
    if (!button) return;
    
    // Deshabilitar botón
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    
    // Mostrar popup de sincronización
    mostrarPopupSincronizacion();
    
    try {
        const response = await fetch('/api/redmine/sincronizar-req-clientes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tracker_id: null, // Usará el tracker por defecto (29)
                max_total: null // Sin límite para sincronización manual
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Limpiar intervalo de progreso simulado
            const overlay = document.getElementById('syncOverlay');
            if (overlay && overlay.dataset.intervalo) {
                clearInterval(parseInt(overlay.dataset.intervalo));
            }
            // Actualizar barra de progreso a 100%
            actualizarProgresoSincronizacion(100);
            // Esperar un momento y recargar
            setTimeout(() => {
                ocultarPopupSincronizacion();
                window.location.reload();
            }, 500);
        } else {
            ocultarPopupSincronizacion();
            console.error('Error en la sincronización:', data.error || 'Error desconocido');
            alert('Error al sincronizar: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        ocultarPopupSincronizacion();
        console.error('Error al sincronizar:', error);
        alert('Error al sincronizar: ' + error.message);
    } finally {
        // Restaurar botón
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

// Variable global para mantener el progreso actual
let progresoActual = 0;

// Mostrar popup de sincronización
function mostrarPopupSincronizacion() {
    // Resetear progreso
    progresoActual = 0;
    
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.id = 'syncOverlay';
    overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;';
    
    // Crear popup
    const popup = document.createElement('div');
    popup.id = 'syncPopup';
    popup.style.cssText = 'background: white; border-radius: 12px; padding: 24px; min-width: 320px; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    popup.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 16px; font-weight: 500; color: #202124; margin-bottom: 16px; font-family: \'Google Sans\', \'Roboto\', sans-serif;">
                Sincronizando con Redmine
            </div>
            <div style="width: 100%; height: 8px; background: #f1f3f4; border-radius: 4px; overflow: hidden; margin-bottom: 8px;">
                <div id="syncProgressBar" style="height: 100%; background: #0D5AA2; width: 0%; transition: width 0.3s ease; border-radius: 4px;"></div>
            </div>
            <div id="syncProgressText" style="font-size: 13px; color: #5f6368; font-family: \'Roboto\', sans-serif;">
                0%
            </div>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    // Simular progreso de forma progresiva y predecible
    const intervalo = setInterval(() => {
        // Incremento más pequeño y consistente (entre 1% y 3% por intervalo)
        const incremento = 1 + Math.random() * 2;
        progresoActual += incremento;
        
        // Limitar a 90% máximo hasta que la sincronización termine
        if (progresoActual > 90) {
            progresoActual = 90;
        }
        
        actualizarProgresoSincronizacion(progresoActual);
    }, 300);
    
    // Guardar intervalo para limpiarlo después
    overlay.dataset.intervalo = intervalo;
}

// Actualizar progreso de sincronización (solo avanza, nunca retrocede)
function actualizarProgresoSincronizacion(porcentaje) {
    // Asegurar que el porcentaje esté entre 0 y 100
    porcentaje = Math.max(0, Math.min(100, porcentaje));
    
    // Solo actualizar si el nuevo porcentaje es mayor o igual al actual
    // Esto previene retrocesos
    if (porcentaje >= progresoActual) {
        progresoActual = porcentaje;
        
        const barra = document.getElementById('syncProgressBar');
        const texto = document.getElementById('syncProgressText');
        
        if (barra) {
            barra.style.width = porcentaje + '%';
        }
        if (texto) {
            texto.textContent = Math.round(porcentaje) + '%';
        }
        
        // Si llegamos a 100%, limpiar el intervalo si existe
        if (porcentaje >= 100) {
            const overlay = document.getElementById('syncOverlay');
            if (overlay && overlay.dataset.intervalo) {
                clearInterval(parseInt(overlay.dataset.intervalo));
            }
        }
    }
}

// Ocultar popup de sincronización
function ocultarPopupSincronizacion() {
    const overlay = document.getElementById('syncOverlay');
    if (overlay) {
        // Limpiar intervalo si existe
        if (overlay.dataset.intervalo) {
            clearInterval(overlay.dataset.intervalo);
        }
        overlay.remove();
    }
}

// Eliminar funcionalidad
async function eliminarFuncionalidad(id) {
    try {
        const response = await fetch(`/funcionalidades/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.reload();
        } else {
            console.error('Error al eliminar:', data.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Score Calculator
class ScoreCalculator {
    constructor() {
        this.criterios = {
            facturacion: 0,
            facturacion_potencial: 0,
            impacto_cliente: 0,
            esfuerzo: 0,
            incertidumbre: 0,
            riesgo: 0
        };
        
        // Pesos con nombres correctos (prefijo peso_)
        // Impacto Negocio: 40%, Esfuerzo: 40%, Incertidumbre: 30%, Riesgo: 30%
        this.pesos = {
            peso_facturacion: 40,
            peso_facturacion_potencial: 20,
            peso_impacto_cliente: 40,
            peso_esfuerzo: 40,
            peso_incertidumbre: 30,
            peso_riesgo: 30
        };
    }
    
    init() {
        // Cargar valores iniciales desde los sliders
        document.querySelectorAll('.criterio-slider').forEach(slider => {
            const criterio = slider.dataset.criterio;
            const valor = parseInt(slider.value) || 0;
            this.criterios[criterio] = valor;
            
            // Escuchar cambios en los sliders
            slider.addEventListener('input', (e) => {
                this.actualizarCriterio(e.target.dataset.criterio, e.target.value);
            });
        });
        
        // Calcular score inicial
        this.calcularScore();
    }
    
    actualizarCriterio(criterio, valor) {
        this.criterios[criterio] = parseInt(valor);
        
        // Actualizar el display del valor
        const valueDisplay = document.querySelector(`[data-value="${criterio}"]`);
        if (valueDisplay) {
            valueDisplay.textContent = valor;
        }
        
        this.calcularScore();
    }
    
    calcularScore() {
        // Criterios positivos (suman) - sin urgencia
        const criteriosPositivos = ['facturacion', 'facturacion_potencial', 'impacto_cliente'];
        const criteriosNegativos = ['esfuerzo', 'incertidumbre', 'riesgo'];
        
        let positivos = 0;
        let negativos = 0;
        
        // Mapeo de nombres de criterios a nombres de pesos
        const pesoMap = {
            'facturacion': 'peso_facturacion',
            'facturacion_potencial': 'peso_facturacion_potencial',
            'impacto_cliente': 'peso_impacto_cliente',
            'esfuerzo': 'peso_esfuerzo',
            'incertidumbre': 'peso_incertidumbre',
            'riesgo': 'peso_riesgo'
        };
        
        // Calcular promedio ponderado de valores positivos (usando pesos)
        let sumaPonderadaPositivos = 0;
        let sumaPesosPositivos = 0;
        
        // Calcular promedio ponderado de valores negativos (usando pesos)
        let sumaPonderadaNegativos = 0;
        let sumaPesosNegativos = 0;
        
        for (const [key, value] of Object.entries(this.criterios)) {
            const pesoKey = pesoMap[key];
            const peso = this.pesos[pesoKey] || this.pesos[key] || 0;
            const valor = parseInt(value) || 0;
            const contribucion = valor * (parseFloat(peso) || 0) / 100;
            
            if (criteriosPositivos.includes(key)) {
                sumaPonderadaPositivos += contribucion;
                sumaPesosPositivos += parseFloat(peso) || 0;
            } else if (criteriosNegativos.includes(key)) {
                sumaPonderadaNegativos += contribucion;
                sumaPesosNegativos += parseFloat(peso) || 0;
            }
        }
        
        // Calcular promedios ponderados (suma ponderada / suma de pesos)
        const promedioPositivos = sumaPesosPositivos > 0 ? sumaPonderadaPositivos / (sumaPesosPositivos / 100) : 0;
        const promedioNegativos = sumaPesosNegativos > 0 ? sumaPonderadaNegativos / (sumaPesosNegativos / 100) : 0;
        
        // Score = promedio positivos - (promedio negativos × 0.25)
        const score = promedioPositivos - (promedioNegativos * 0.25);
        
        // Actualizar display del score
        const scoreDisplay = document.getElementById('scoreTotal');
        if (scoreDisplay) {
            scoreDisplay.textContent = score.toFixed(2);
        }
        
        return score;
    }
    
    async guardarScore(funcionalidadId) {
        try {
            // Solo enviar criterios, NO los pesos (los pesos se mantienen en la BD)
            // El backend calculará el score usando los pesos existentes en la BD
            const response = await fetch(`/score/${encodeURIComponent(funcionalidadId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.criterios)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Devolver el score calculado de la BD (score_calculado)
                return data.score?.score_calculado || data.score;
            } else {
                console.error('Error al guardar:', data.error);
                return null;
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    }
}

// Mapa de clientes
class MapaClientes {
    constructor() {
        this.estadosComerciales = [
            'productivo',
            'interesado',
            'rechazado',
            'en desarrollo',
            'Propuesta enviada'
        ];
    }
    
    async actualizarEstado(clienteId, funcionalidadId, estado) {
        try {
            const response = await fetch(`/mapa/estado/${clienteId}/${encodeURIComponent(funcionalidadId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    estado_comercial: estado
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Actualizar la celda visualmente
                const cell = document.querySelector(`[data-cliente="${clienteId}"][data-funcionalidad="${funcionalidadId}"]`);
                if (cell) {
                    this.actualizarCeldaEstado(cell, estado);
                }
                return true;
            } else {
                console.error('Error al actualizar:', data.error);
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            return false;
        }
    }
    
    actualizarCeldaEstado(cell, estado) {
        // Remover clases anteriores
        cell.classList.remove('estado-implementado', 'estado-desarrollo', 'estado-planificado', 'estado-cancelado');
        
        // Agregar nueva clase
        const claseEstado = this.getClaseEstado(estado);
        cell.classList.add(claseEstado);
        
        // Capitalizar estado para mostrar
        let textoMostrar = '';
        if (!estado) {
            textoMostrar = '+';
        } else if (estado === 'Propuesta enviada') {
            textoMostrar = 'Propuesta<br>enviada';
            cell.innerHTML = textoMostrar;
            return;
        } else if (estado === 'en desarrollo') {
            textoMostrar = 'En desarrollo';
        } else {
            textoMostrar = estado.charAt(0).toUpperCase() + estado.slice(1);
        }
        
        // Actualizar texto
        cell.textContent = textoMostrar;
    }
    
    getClaseEstado(estado) {
        // Mapear estados en minúsculas (como vienen de la BD) a clases CSS
        const map = {
            'productivo': 'estado-implementado',
            'en desarrollo': 'estado-desarrollo',
            'interesado': 'estado-planificado',
            'rechazado': 'estado-cancelado',
            'Propuesta enviada': 'estado-planificado'
        };
        return map[estado] || '';
    }
    
    mostrarModalEstado(clienteId, funcionalidadId, estadoActual) {
        // Crear modal simple
        const opciones = this.estadosComerciales.map(estado => 
            `<button class="btn" onclick="mapa.actualizarEstado(${clienteId}, ${JSON.stringify(funcionalidadId)}, '${estado}')">${estado}</button>`
        ).join('');
        
        // Aquí podrías mostrar un modal más elaborado
        const nuevoEstado = prompt(`Estado actual: ${estadoActual}\n\nNuevo estado:\n1. En Desarrollo\n2. Implementado\n3. Planificado\n4. Cancelado\n\nElige una opción (1-4):`);
        
        if (nuevoEstado) {
            const estados = ['En Desarrollo', 'Implementado', 'Planificado', 'Cancelado'];
            const estadoIndex = parseInt(nuevoEstado) - 1;
            if (estadoIndex >= 0 && estadoIndex < estados.length) {
                this.actualizarEstado(clienteId, funcionalidadId, estados[estadoIndex]);
            }
        }
    }
}

// Toggle mostrar/ocultar montos
// Por defecto, los montos están ocultos
let montosOcultos = true;

function toggleMontos() {
    montosOcultos = !montosOcultos;
    
    // Buscar todos los elementos que contengan montos
    const montos = document.querySelectorAll('.monto-valor');
    
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeBtn = document.querySelector('.toggle-monto-btn');
    
    montos.forEach((monto, index) => {
        if (montosOcultos) {
            monto.style.filter = 'blur(5px)';
            monto.style.userSelect = 'none';
            monto.style.pointerEvents = 'none';
        } else {
            monto.style.filter = 'none';
            monto.style.userSelect = 'auto';
            monto.style.pointerEvents = 'auto';
        }
    });
    
    // Cambiar ícono
    if (eyeIcon) {
        if (montosOcultos) {
            eyeIcon.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
        } else {
            eyeIcon.innerHTML = '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>';
        }
    }
    
    // Cambiar opacidad del botón y mantenerlo visible si los montos están ocultos
    if (eyeBtn) {
        eyeBtn.style.opacity = montosOcultos ? '1' : '0.6';
        // Si los montos están ocultos, mantener el botón visible
        if (montosOcultos) {
            eyeBtn.style.display = 'inline-flex';
        }
    }
    
}

// Búsqueda con sugerencias
let funcionalidades = [];

async function cargarFuncionalidades() {
    try {
        const response = await fetch('/api/funcionalidades');
        const data = await response.json();
        if (data.success) {
            funcionalidades = data.funcionalidades;
        }
    } catch (error) {
        console.error('Error al cargar funcionalidades:', error);
    }
}

function mostrarSugerencias(query) {
    const suggestionsContainer = document.getElementById('searchSuggestions');
    if (!suggestionsContainer || !query || query.length < 2) {
        if (suggestionsContainer) {
            suggestionsContainer.classList.remove('active');
        }
        return;
    }
    
    // Filtrar funcionalidades
    const filtradas = funcionalidades.filter(func => {
        const searchText = query.toLowerCase();
        return (
            func.titulo?.toLowerCase().includes(searchText) ||
            func.descripcion?.toLowerCase().includes(searchText) ||
            func.sponsor?.toLowerCase().includes(searchText) ||
            func.seccion?.toLowerCase().includes(searchText)
        );
    }).slice(0, 5); // Máximo 5 sugerencias
    
    if (filtradas.length === 0) {
        suggestionsContainer.classList.remove('active');
        return;
    }
    
    // Generar HTML de sugerencias
    const html = filtradas.map(func => `
        <div class="suggestion-item" onclick='verDetalle(${JSON.stringify(func.redmine_id || func.id)})'>
            <div class="suggestion-icon">
                ${(func.titulo || '?').substring(0, 1).toUpperCase()}
            </div>
            <div class="suggestion-text">
                <div class="suggestion-title">${func.titulo || 'Sin título'}</div>
                <div class="suggestion-subtitle">
                    ${func.seccion || 'Sin sección'} ${func.sponsor ? '• ' + func.sponsor : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    suggestionsContainer.innerHTML = html;
    suggestionsContainer.classList.add('active');
}

// Inicializar en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Restaurar estado del sidebar
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
    }
    
    // Actualizar UI de ordenamiento
    actualizarOrdenamiento();
    
    // Cargar funcionalidades para sugerencias
    cargarFuncionalidades();
    
    // Inicializar calculadora de score si existe
    if (document.querySelector('.score-calculator')) {
        window.scoreCalculator = new ScoreCalculator();
        window.scoreCalculator.init();
    }
    
    // Inicializar mapa de clientes si existe
    if (document.querySelector('.mapa-grid')) {
        window.mapa = new MapaClientes();
    }
    
    // Búsqueda con sugerencias en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        let timeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                mostrarSugerencias(e.target.value);
            }, 300);
        });
        
        // Ocultar sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                const suggestions = document.getElementById('searchSuggestions');
                if (suggestions) {
                    suggestions.classList.remove('active');
                }
            }
        });
    }
    
    // Ocultar montos por defecto al cargar la página
    const montos = document.querySelectorAll('.monto-valor');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeBtn = document.querySelector('.toggle-monto-btn');
    
    if (montos.length > 0 && montosOcultos) {
        montos.forEach((monto) => {
            monto.style.filter = 'blur(5px)';
            monto.style.userSelect = 'none';
            monto.style.pointerEvents = 'none';
        });
        
        // Cambiar ícono a "ojo cerrado" por defecto
        if (eyeIcon) {
            eyeIcon.innerHTML = '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>';
        }
        
        if (eyeBtn) {
            eyeBtn.style.opacity = '1';
        }
    }
});

// Formatear moneda
function formatMoney(amount) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS'
    }).format(amount);
}

// Formatear fecha
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR');
}

// Get color de score
function getScoreColor(score) {
    if (score > 6.50) return 'score-high';
    if (score > 4) return 'score-medium';
    return 'score-low';
}

