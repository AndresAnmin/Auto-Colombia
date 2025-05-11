// Función para guardar datos en localStorage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Función para cargar datos desde localStorage
function loadData(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

// Función para formatear fecha
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Función para mostrar notificación
function showAlert(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    const container = document.querySelector('.container') || document.body;
    container.insertBefore(alertDiv, container.firstChild);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Inicializar datos si no existen
function initData() {
    if (!loadData('parking_users')) {
        saveData('parking_users', []);
    }
    if (!loadData('parking_cells')) {
        saveData('parking_cells', []);
    }
    if (!loadData('parking_entries')) {
        saveData('parking_entries', []);
    }
    if (!loadData('parking_payments')) {
        saveData('parking_payments', []);
    }
}

// Llamar a initData cuando se carga la página
document.addEventListener('DOMContentLoaded', initData);