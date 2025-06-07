document.addEventListener('DOMContentLoaded', function () {

    // CARGA DE DATOS DESDE LOCAL STORAGE
    const users = loadData('parking_users');
    const cells = loadData('parking_cells');
    const entries = loadData('parking_entries');


    // REFERENCIAS AL DOM
    const plateSearch = document.getElementById('plate-search');
    const searchBtn = document.getElementById('search-btn');
    const resultSection = document.getElementById('result-section');
    const vehicleInfo = document.getElementById('vehicle-info');
    const registerExitBtn = document.getElementById('register-exit');

    const entryForm = document.getElementById('entry-form');
    const entryPlate = document.getElementById('entry-plate');
    const entryCell = document.getElementById('entry-cell');
    const entriesTable = document.getElementById('entries-table').querySelector('tbody');

    // =============================
    // FUNCIONES
    // =============================

    // Llenar el select con las celdas disponibles
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

    // Actualizar la tabla de entradas activas
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
                <td><button class="btn btn-danger" data-id="${entry.id}">Eliminar</button></td>
            `;

            entriesTable.appendChild(row);
        });

        // Eliminar entrada desde botón
        document.querySelectorAll('#entries-table .btn-danger').forEach(btn => {
            btn.addEventListener('click', function () {
                const entryId = parseInt(this.getAttribute('data-id'));
                const entryIndex = entries.findIndex(e => e.id === entryId);

                if (entryIndex !== -1) {
                    const cellId = entries[entryIndex].cellId;
                    const cellIndex = cells.findIndex(c => c.id === cellId);

                    if (cellIndex !== -1) {
                        cells[cellIndex].status = 'available';
                        cells[cellIndex].plate = '';
                        saveData('parking_cells', cells);
                    }

                    entries.splice(entryIndex, 1);
                    saveData('parking_entries', entries);
                    updateEntriesTable();
                    alert('Entrada eliminada exitosamente', 'success');
                }
            });
        });
    }

    // =============================
    // EVENTOS
    // =============================

    // Buscar vehículo por placa
    searchBtn.addEventListener('click', function () {
        const plate = plateSearch.value.trim().toUpperCase();

        if (!plate) {
            alert('Por favor ingrese una placa', 'danger');
            return;
        }

        const user = users.find(u => u.plate === plate);
        if (!user) {
            alert('No se encontró ningún vehículo con esa placa', 'danger');
            return;
        }

        const entry = entries.find(e => e.plate === plate && !e.exitTime);
        if (!entry) {
            alert('El vehículo no se encuentra actualmente en el parqueadero', 'danger');
            return;
        }

        const cell = cells.find(c => c.id === entry.cellId);

        vehicleInfo.innerHTML = `
            <p><strong>Placa:</strong> ${user.plate}</p>
            <p><strong>Dueño:</strong> ${user.name}</p>
            <p><strong>Teléfono:</strong> ${user.phone}</p>
            <p><strong>Celda asignada:</strong> Celda ${cell.id} (${cell.type})</p>
            <p><strong>Hora de entrada y fecha:</strong> ${formatDate(entry.entryTime)}</p>
        `;

        resultSection.classList.remove('hidden');
    });

    // Registrar nueva entrada
    entryForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const plate = entryPlate.value.trim().toUpperCase();
        const cellId = parseInt(entryCell.value);

        if (!plate || !cellId) {
            alert('Por favor complete todos los campos', 'danger');
            return;
        }

        const user = users.find(u => u.plate === plate);
        if (!user) {
            alert('No se encontró un usuario con esa placa. Registre el usuario primero.', 'danger');
            return;
        }

        const activeEntry = entries.find(e => e.plate === plate && !e.exitTime);
        if (activeEntry) {
            alert('Este vehículo ya tiene un registro de entrada activo', 'danger');
            return;
        }

        const newEntry = {
            id: Date.now(),
            plate,
            cellId,
            entryTime: new Date().toISOString(),
            exitTime: null
        };

        entries.push(newEntry);
        saveData('parking_entries', entries);

        const cellIndex = cells.findIndex(c => c.id === cellId);
        if (cellIndex !== -1) {
            cells[cellIndex].status = 'occupied';
            cells[cellIndex].plate = plate;
            saveData('parking_cells', cells);
        }

        alert('Entrada registrada exitosamente', 'success');
        entryForm.reset();
        updateAvailableCells();
        updateEntriesTable();
    });

    // Registrar salida del vehículo
    registerExitBtn.addEventListener('click', function () {
        const plate = plateSearch.value.trim().toUpperCase();
        const entryIndex = entries.findIndex(e => e.plate === plate && !e.exitTime);

        if (entryIndex !== -1) {
            entries[entryIndex].exitTime = new Date().toISOString();
            saveData('parking_entries', entries);

            const cellId = entries[entryIndex].cellId;
            const cellIndex = cells.findIndex(c => c.id === cellId);

            if (cellIndex !== -1) {
                cells[cellIndex].status = 'available';
                cells[cellIndex].plate = '';
                saveData('parking_cells', cells);
            }

            // Guardar la placa para el pago y redirigir
            localStorage.setItem('current_payment_plate', plate);
            window.location.href = 'pagos.html';
            return; // Detener ejecución aquí

            // ✅ Ocultar sección de resultados
            resultSection.classList.add('hidden');

            updateEntriesTable();
            updateAvailableCells();
            alert('Salida registrada exitosamente', 'success');
        } else{
            alert('No se encontró un registro de entrada activo para esa placa', 'danger');
        }
    });

    // =============================
    // INICIALIZACIÓN
    // =============================
    updateAvailableCells();
    updateEntriesTable();

});
