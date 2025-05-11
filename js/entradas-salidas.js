document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos
    const users = loadData('parking_users');
    const cells = loadData('parking_cells');
    const entries = loadData('parking_entries');
    
    // Elementos del DOM
    const plateSearch = document.getElementById('plate-search');
    const searchBtn = document.getElementById('search-btn');
    const resultSection = document.getElementById('result-section');
    const vehicleInfo = document.getElementById('vehicle-info');
    const registerExitBtn = document.getElementById('register-exit');
    const entryForm = document.getElementById('entry-form');
    const entryPlate = document.getElementById('entry-plate');
    const entryCell = document.getElementById('entry-cell');
    const entriesTable = document.getElementById('entries-table').querySelector('tbody');
    
    // Llenar select de celdas disponibles
    function updateAvailableCells() {
        entryCell.innerHTML = '<option value="">Seleccione una celda</option>';
        
        cells.forEach(cell => {
            if (cell.status === 'available') {
                const option = document.createElement('option');
                option.value = cell.id;
                option.textContent = `Celda ${cell.id} (${cell.type})`;
                entryCell.appendChild(option);
            }
        });
    }
    
    // Buscar vehículo
    searchBtn.addEventListener('click', function() {
        const plate = plateSearch.value.trim().toUpperCase();
        
        if (!plate) {
            showAlert('Por favor ingrese una placa', 'danger');
            return;
        }
        
        const user = users.find(u => u.plate === plate);
        if (!user) {
            showAlert('No se encontró ningún vehículo con esa placa', 'danger');
            return;
        }
        
        const entry = entries.find(e => e.plate === plate && !e.exitTime);
        if (!entry) {
            showAlert('El vehículo no se encuentra actualmente en el parqueadero', 'danger');
            return;
        }
        
        const cell = cells.find(c => c.id === entry.cellId);
        
        // Mostrar información
        vehicleInfo.innerHTML = `
            <p><strong>Placa:</strong> ${user.plate}</p>
            <p><strong>Dueño:</strong> ${user.name}</p>
            <p><strong>Teléfono:</strong> ${user.phone}</p>
            <p><strong>Celda asignada:</strong> Celda ${cell.id} (${cell.type})</p>
            <p><strong>Hora de entrada:</strong> ${formatDate(entry.entryTime)}</p>
        `;
        
        resultSection.classList.remove('hidden');
    });
    
    // Registrar entrada
    entryForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const plate = entryPlate.value.trim().toUpperCase();
        const cellId = entryCell.value;
        
        if (!plate || !cellId) {
            showAlert('Por favor complete todos los campos', 'danger');
            return;
        }
        
        // Verificar si el usuario existe
        const user = users.find(u => u.plate === plate);
        if (!user) {
            showAlert('No se encontró un usuario con esa placa. Registre el usuario primero.', 'danger');
            return;
        }
        
        // Verificar si ya tiene una entrada activa
        const activeEntry = entries.find(e => e.plate === plate && !e.exitTime);
        if (activeEntry) {
            showAlert('Este vehículo ya tiene un registro de entrada activo', 'danger');
            return;
        }
        
        // Registrar entrada
        const newEntry = {
            id: Date.now(),
            plate,
            cellId,
            entryTime: new Date().toISOString(),
            exitTime: null
        };
        
        entries.push(newEntry);
        saveData('parking_entries', entries);
        
        // Actualizar estado de la celda
        const cellIndex = cells.findIndex(c => c.id === cellId);
        if (cellIndex !== -1) {
            cells[cellIndex].status = 'occupied';
            cells[cellIndex].plate = plate;
            saveData('parking_cells', cells);
        }
        
        showAlert('Entrada registrada exitosamente', 'success');
        entryForm.reset();
        updateAvailableCells();
        updateEntriesTable();
    });
    
    // Registrar salida
    registerExitBtn.addEventListener('click', function() {
        const plate = plateSearch.value.trim().toUpperCase();
        const entryIndex = entries.findIndex(e => e.plate === plate && !e.exitTime);
        
        if (entryIndex !== -1) {
            entries[entryIndex].exitTime = new Date().toISOString();
            saveData('parking_entries', entries);
            
            // Liberar celda
            const cellId = entries[entryIndex].cellId;
            const cellIndex = cells.findIndex(c => c.id === cellId);
            if (cellIndex !== -1) {
                cells[cellIndex].status = 'available';
                cells[cellIndex].plate = '';
                saveData('parking_cells', cells);
            }
            
            // Redirigir a pagos con los datos
            localStorage.setItem('current_payment_plate', plate);
            window.location.href = 'pagos.html';
        }
    });
    
    // Actualizar tabla de entradas
    function updateEntriesTable() {
        entriesTable.innerHTML = '';
        
        const activeEntries = entries.filter(e => !e.exitTime);
        
        activeEntries.forEach(entry => {
            const user = users.find(u => u.plate === entry.plate) || {};
            const cell = cells.find(c => c.id === entry.cellId) || {};
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.plate}</td>
                <td>Celda ${cell.id} (${cell.type})</td>
                <td>${formatDate(entry.entryTime)}</td>
                <td>
                    <button class="btn btn-danger" data-id="${entry.id}">Eliminar</button>
                </td>
            `;
            
            entriesTable.appendChild(row);
        });
        
        // Agregar event listeners a los botones de eliminar
        document.querySelectorAll('#entries-table .btn-danger').forEach(btn => {
            btn.addEventListener('click', function() {
                const entryId = parseInt(this.getAttribute('data-id'));
                const entryIndex = entries.findIndex(e => e.id === entryId);
                
                if (entryIndex !== -1) {
                    // Liberar celda
                    const cellId = entries[entryIndex].cellId;
                    const cellIndex = cells.findIndex(c => c.id === cellId);
                    if (cellIndex !== -1) {
                        cells[cellIndex].status = 'available';
                        cells[cellIndex].plate = '';
                        saveData('parking_cells', cells);
                    }
                    
                    // Eliminar entrada
                    entries.splice(entryIndex, 1);
                    saveData('parking_entries', entries);
                    updateEntriesTable();
                    showAlert('Entrada eliminada exitosamente', 'success');
                }
            });
        });
    }
    
    // Inicializar
    updateAvailableCells();
    updateEntriesTable();
});