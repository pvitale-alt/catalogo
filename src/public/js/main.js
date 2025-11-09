// Funcionalidades globales de la aplicación

console.log('✅ Aplicación Catálogo cargada');

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
                toggle.style.left = '52px';
            } else {
                toggle.style.left = 'calc(var(--sidebar-width) - 12px)';
            }
        }
    }
}

// Restaurar estado del sidebar al cargar
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (sidebar && isCollapsed) {
        sidebar.classList.add('collapsed');
    }
});

// Toggle filter dropdowns
function toggleFilterSecciones() {
    const dropdown = document.getElementById('filterSecciones');
    const sponsorsDropdown = document.getElementById('filterSponsors');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
    if (sponsorsDropdown) {
        sponsorsDropdown.style.display = 'none';
    }
}

function toggleFilterSponsors() {
    const dropdown = document.getElementById('filterSponsors');
    const seccionesDropdown = document.getElementById('filterSecciones');
    if (dropdown) {
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
    if (seccionesDropdown) {
        seccionesDropdown.style.display = 'none';
    }
}

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
    const ordenActual = params.get('orden');
    const direccionActual = params.get('direccion');
    
    // Remover clases sorted de todos los headers
    document.querySelectorAll('.list-header > div').forEach(header => {
        header.classList.remove('sorted');
        const sortIcon = header.querySelector('.sort-icon');
        if (sortIcon) {
            sortIcon.innerHTML = '<path d="M7 10l5 5 5-5z"/>';
        }
    });
    
    // Agregar clase sorted al header actual
    if (ordenActual) {
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
}

// Ver detalle de funcionalidad
function verDetalle(id) {
    window.location.href = `/funcionalidades/${id}`;
}

// Sincronizar con Redmine
async function sincronizarRedmine() {
    const button = document.getElementById('syncButton');
    if (!button) return;
    
    // Deshabilitar botón y mostrar loading
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    
    const originalTitle = button.title;
    button.title = 'Sincronizando...';
    
    try {
        const response = await fetch('/api/redmine/sincronizar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                project_id: 'ut-bancor',
                tracker_id: '19', // Filtrar solo Epics
                max_total: null // Sin límite para sincronización manual
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ Sincronización completada:\n- ${data.issues_insertados || 0} issues insertados\n- ${data.issues_actualizados || 0} issues actualizados\n- ${data.funcionalidades_creadas || 0} funcionalidades creadas`);
            // Recargar la página para ver los cambios
            window.location.reload();
        } else {
            alert('❌ Error en la sincronización: ' + (data.error || 'Error desconocido'));
        }
    } catch (error) {
        console.error('Error al sincronizar:', error);
        alert('❌ Error al sincronizar: ' + error.message);
    } finally {
        // Restaurar botón
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.title = originalTitle;
    }
}

// Eliminar funcionalidad
async function eliminarFuncionalidad(id) {
    if (!confirm('¿Estás seguro de eliminar esta funcionalidad?')) {
        return;
    }
    
    try {
        const response = await fetch(`/funcionalidades/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Funcionalidad eliminada exitosamente');
            window.location.reload();
        } else {
            alert('Error al eliminar: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al eliminar la funcionalidad');
    }
}

// Score Calculator
class ScoreCalculator {
    constructor() {
        this.criterios = {};
        this.pesos = {
            facturacion: 40,
            urgencia: 20,
            facturacion_potencial: 20,
            impacto_cliente: 20,
            esfuerzo: 33.33,
            incertidumbre: 33.33,
            riesgo: 33.33
        };
    }
    
    init() {
        // Escuchar cambios en los sliders
        document.querySelectorAll('.criterio-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                this.actualizarCriterio(e.target.dataset.criterio, e.target.value);
            });
        });
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
        // Criterios positivos (suman)
        const criteriosPositivos = ['facturacion', 'urgencia', 'facturacion_potencial', 'impacto_cliente'];
        const criteriosNegativos = ['esfuerzo', 'incertidumbre', 'riesgo'];
        
        let positivos = 0;
        let negativos = 0;
        
        for (const [key, value] of Object.entries(this.criterios)) {
            const peso = this.pesos[key] || 0;
            const contribucion = (value * peso / 100);
            
            if (criteriosPositivos.includes(key)) {
                positivos += contribucion;
            } else if (criteriosNegativos.includes(key)) {
                negativos += contribucion;
            }
        }
        
        const score = positivos - negativos;
        
        // Actualizar display del score
        const scoreDisplay = document.getElementById('scoreTotal');
        if (scoreDisplay) {
            scoreDisplay.textContent = score.toFixed(2);
        }
        
        return score;
    }
    
    async guardarScore(funcionalidadId) {
        try {
            const response = await fetch(`/score/${funcionalidadId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(this.criterios)
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('Score guardado exitosamente');
                return data.score;
            } else {
                alert('Error al guardar: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar el score');
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
            const response = await fetch(`/mapa/estado/${clienteId}/${funcionalidadId}`, {
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
                alert('Error al actualizar: ' + data.error);
                return false;
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al actualizar el estado');
            return false;
        }
    }
    
    actualizarCeldaEstado(cell, estado) {
        // Remover clases anteriores
        cell.classList.remove('estado-implementado', 'estado-desarrollo', 'estado-planificado', 'estado-cancelado');
        
        // Agregar nueva clase
        const claseEstado = this.getClaseEstado(estado);
        cell.classList.add(claseEstado);
        
        // Actualizar texto
        cell.textContent = estado;
    }
    
    getClaseEstado(estado) {
        const map = {
            'Implementado': 'estado-implementado',
            'En Desarrollo': 'estado-desarrollo',
            'Planificado': 'estado-planificado',
            'Cancelado': 'estado-cancelado'
        };
        return map[estado] || '';
    }
    
    mostrarModalEstado(clienteId, funcionalidadId, estadoActual) {
        // Crear modal simple
        const opciones = this.estadosComerciales.map(estado => 
            `<button class="btn" onclick="mapa.actualizarEstado(${clienteId}, ${funcionalidadId}, '${estado}')">${estado}</button>`
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
    console.log('toggleMontos llamado'); // Debug
    montosOcultos = !montosOcultos;
    
    // Buscar todos los elementos que contengan montos
    const montos = document.querySelectorAll('.monto-valor');
    console.log('Montos encontrados:', montos.length); // Debug
    
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeBtn = document.querySelector('.toggle-monto-btn');
    
    montos.forEach((monto, index) => {
        console.log(`Monto ${index}:`, monto.textContent); // Debug
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
    
    console.log('Montos ocultos:', montosOcultos); // Debug
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
        <div class="suggestion-item" onclick="verDetalle(${func.redmine_id || func.id})">
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
    if (score >= 4) return 'score-high';
    if (score >= 2.5) return 'score-medium';
    return 'score-low';
}

