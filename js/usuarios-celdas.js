document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos
    let users = loadData('parking_users') || [];
    let cells = loadData('parking_cells') || [];
    const entries = loadData('parking_entries') || [];
    
    // Variables de estado
    let selectedCellId = null;
    let editingUserId = null;
    
    // Mostrar celdas
    function renderCells() {
        const cellsGrid = document.getElementById('cells-grid');
        cellsGrid.innerHTML = '';
        
        cells.forEach(cell => {
            const cellDiv = document.createElement('div');
            cellDiv.className = `cell ${cell.status} cell-${cell.type}`;
            cellDiv.dataset.id = cell.id;
            
            const cellNumber = document.createElement('div');
            cellNumber.className = 'cell-number';
            cellNumber.textContent = `Celda ${cell.id}`;
            
            const cellType = document.createElement('div');
            cellType.textContent = cell.type;
            
            const cellStatus = document.createElement('div');
            cellStatus.className = 'cell-status';
            cellStatus.textContent = cell.status === 'available' ? 'Disponible' : 'Ocupada';
            
            if (cell.status === 'occupied') {
                const cellPlate = document.createElement('div');
                cellPlate.textContent = cell.plate;
                cellPlate.style.fontSize = '0.8rem';
                cellPlate.style.marginTop = '0.5rem';
                cellDiv.appendChild(cellPlate);
            }
            
            cellDiv.appendChild(cellNumber);
            cellDiv.appendChild(cellType);
            cellDiv.appendChild(cellStatus);
            
            // Seleccionar celda
            cellDiv.addEventListener('click', function() {
                if (cell.status === 'available') {
                    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedCellId = cell.id;
                } else {
                    showAlert('Esta celda ya está ocupada', 'danger');
                }
            });
            
            cellsGrid.appendChild(cellDiv);
        });
    }
    
    // Mostrar usuarios en tabla
    function renderUsersTable() {
        const tableBody = document.querySelector('#users-table tbody');
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${user.plate}</td>
                <td>${user.vehicleType}</td>
                <td>${user.plan}</td>
                <td>
                    <button class="btn" data-id="${user.id}">Editar</button>
                    <button class="btn btn-danger" data-id="${user.id}">Eliminar</button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Agregar event listeners a los botones
        document.querySelectorAll('#users-table .btn:not(.btn-danger)').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                editUser(userId);
            });
        });
        
        document.querySelectorAll('#users-table .btn-danger').forEach(btn => {
            btn.addEventListener('click', function() {
                const userId = parseInt(this.getAttribute('data-id'));
                deleteUser(userId);
            });
        });
    }
    
    // Editar usuario
    function editUser(userId) {
        const user = users.find(u => u.id === userId);
        if (!user) return;
        
        editingUserId = userId;
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-name').value = user.name;
        document.getElementById('user-phone').value = user.phone;
        document.getElementById('user-plate').value = user.plate;
        document.getElementById('user-vehicle-type').value = user.vehicleType;
        document.getElementById('user-plan').value = user.plan;
        
        document.getElementById('user-submit').textContent = 'Actualizar Usuario';
        document.getElementById('user-cancel').style.display = 'inline-block';
    }
    
    // Cancelar edición
    document.getElementById('user-cancel').addEventListener('click', function() {
        resetUserForm();
    });
    
    // Eliminar usuario
    function deleteUser(userId) {
        if (confirm('¿Está seguro que desea eliminar este usuario?')) {
            users = users.filter(u => u.id !== userId);
            saveData('parking_users', users);
            renderUsersTable();
            showAlert('Usuario eliminado exitosamente');
        }
    }
    
    // Resetear formulario de usuario
    function resetUserForm() {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        document.getElementById('user-submit').textContent = 'Registrar Usuario';
        document.getElementById('user-cancel').style.display = 'none';
        editingUserId = null;
    }
    
    // Formulario de usuario
    document.getElementById('user-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userId = document.getElementById('user-id').value;
        const name = document.getElementById('user-name').value.trim();
        const phone = document.getElementById('user-phone').value.trim();
        const plate = document.getElementById('user-plate').value.trim();
        const vehicleType = document.getElementById('user-vehicle-type').value;
        const plan = document.getElementById('user-plan').value;
        
        // Validar que la placa no esté en uso
        const plateInUse = users.some(u => u.plate === plate && u.id !== parseInt(userId || 0));
        if (plateInUse) {
            showAlert('Esta placa ya está registrada por otro usuario', 'danger');
            return;
        }
        
        if (editingUserId) {
            // Actualizar usuario existente
            const userIndex = users.findIndex(u => u.id === editingUserId);
            if (userIndex !== -1) {
                users[userIndex] = {
                    id: editingUserId,
                    name,
                    phone,
                    plate,
                    vehicleType,
                    plan
                };
                
                saveData('parking_users', users);
                showAlert('Usuario actualizado exitosamente');
            }
        } else {
            // Crear nuevo usuario
            const newUser = {
                id: Date.now(),
                name,
                phone,
                plate,
                vehicleType,
                plan
            };
            
            users.push(newUser);
            saveData('parking_users', users);
            showAlert('Usuario registrado exitosamente');
        }
        
        resetUserForm();
        renderUsersTable();
    });
    
    // Formulario de celda
    document.getElementById('cell-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const type = document.getElementById('cell-type').value;
        
        if (!type) {
            showAlert('Por favor seleccione un tipo de celda', 'danger');
            return;
        }
        
        const newCell = {
            id: Date.now(),
            type,
            status: 'available',
            plate: ''
        };
        
        cells.push(newCell);
        saveData('parking_cells', cells);
        
        showAlert('Celda agregada exitosamente');
        document.getElementById('cell-form').reset();
        renderCells();
    });
    
    // Inicializar
    renderCells();
    renderUsersTable();
});