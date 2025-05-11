document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos
    const users = loadData('parking_users') || [];
    let payments = loadData('parking_payments') || [];
    const entries = loadData('parking_entries') || [];
    
    // Verificar si hay un pago pendiente de la página de entradas/salidas
    const currentPlate = localStorage.getItem('current_payment_plate');
    if (currentPlate) {
        loadPaymentInfo(currentPlate);
        localStorage.removeItem('current_payment_plate');
    }
    
    // Cargar información para el pago
    function loadPaymentInfo(plate) {
        const user = users.find(u => u.plate === plate);
        if (!user) {
            showAlert('No se encontró información del usuario', 'danger');
            return;
        }
        
        const lastEntry = entries.filter(e => e.plate === plate).sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))[0];
        if (!lastEntry) {
            showAlert('No se encontró registro de entrada para este vehículo', 'danger');
            return;
        }
        
        // Calcular valor a pagar
        const entryTime = new Date(lastEntry.entryTime);
        const exitTime = new Date(lastEntry.exitTime);
        const hours = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
        
        let amount = 0;
        if (user.plan === 'mensual') {
            amount = 300000; // Valor mensual fijo
        } else if (user.plan === 'diario') {
            amount = hours <= 24 ? 15000 : 15000 + (hours - 24) * 5000;
        } else {
            // Ocasional
            amount = hours * 5000;
        }
        
        // Mostrar información
        document.getElementById('payment-plate').value = plate;
        document.getElementById('payment-amount').value = amount;
        
        const paymentInfo = document.getElementById('payment-info');
        paymentInfo.innerHTML = `
            <p><strong>Placa:</strong> ${user.plate}</p>
            <p><strong>Dueño:</strong> ${user.name}</p>
            <p><strong>Plan:</strong> ${user.plan}</p>
            <p><strong>Tiempo estacionado:</strong> ${hours} horas</p>
        `;
    }
    
    // Formulario de pago
    document.getElementById('payment-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const plate = document.getElementById('payment-plate').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const method = document.getElementById('payment-method').value;
        const notes = document.getElementById('payment-notes').value.trim();
        
        if (!plate || !amount || !method) {
            showAlert('Por favor complete todos los campos requeridos', 'danger');
            return;
        }
        
        const user = users.find(u => u.plate === plate);
        if (!user) {
            showAlert('No se encontró información del usuario', 'danger');
            return;
        }
        
        const newPayment = {
            id: Date.now(),
            date: new Date().toISOString(),
            plate,
            userId: user.id,
            userName: user.name,
            amount,
            method,
            notes,
            status: 'paid'
        };
        
        payments.push(newPayment);
        saveData('parking_payments', payments);
        
        showAlert('Pago registrado exitosamente');
        document.getElementById('payment-form').reset();
        document.getElementById('payment-info').innerHTML = '';
        renderPaymentsTable('all');
    });
    
    // Renderizar tabla de pagos
    function renderPaymentsTable(filter = 'all') {
        const tableBody = document.querySelector('#payments-table tbody');
        tableBody.innerHTML = '';
        
        let filteredPayments = [];
        
        if (filter === 'all') {
            filteredPayments = [...payments];
            
            // Agregar usuarios con pagos pendientes
            users.forEach(user => {
                const hasPayment = payments.some(p => p.plate === user.plate && p.status === 'paid');
                if (!hasPayment) {
                    filteredPayments.push({
                        id: null,
                        date: '',
                        plate: user.plate,
                        userId: user.id,
                        userName: user.name,
                        amount: user.plan === 'mensual' ? 300000 : 0,
                        method: '',
                        notes: '',
                        status: 'pending'
                    });
                }
            });
        } else if (filter === 'paid') {
            filteredPayments = payments.filter(p => p.status === 'paid');
        } else if (filter === 'pending') {
            filteredPayments = users
                .filter(user => !payments.some(p => p.plate === user.plate && p.status === 'paid'))
                .map(user => ({
                    id: null,
                    date: '',
                    plate: user.plate,
                    userId: user.id,
                    userName: user.name,
                    amount: user.plan === 'mensual' ? 300000 : 0,
                    method: '',
                    notes: '',
                    status: 'pending'
                }));
        }
        
        filteredPayments.forEach(payment => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${payment.date ? formatDate(payment.date) : '-'}</td>
                <td>${payment.plate}</td>
                <td>${payment.userName}</td>
                <td>$${payment.amount.toLocaleString()}</td>
                <td class="payment-${payment.status}">${payment.status === 'paid' ? 'Pagado' : 'Pendiente'}</td>
                <td>${payment.method || '-'}</td>
                <td>
                    ${payment.status === 'paid' ? `
                        <button class="btn" data-id="${payment.id}">Editar</button>
                        <button class="btn btn-danger" data-id="${payment.id}">Eliminar</button>
                    ` : `
                        <button class="btn btn-success" data-plate="${payment.plate}">Pagar</button>
                    `}
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Agregar event listeners
        document.querySelectorAll('#payments-table .btn-success').forEach(btn => {
            btn.addEventListener('click', function() {
                const plate = this.getAttribute('data-plate');
                loadPaymentInfo(plate);
                document.getElementById('payment-plate').value = plate;
                
                // Calcular valor para usuarios pendientes
                const user = users.find(u => u.plate === plate);
                if (user) {
                    const amount = user.plan === 'mensual' ? 300000 : 0;
                    document.getElementById('payment-amount').value = amount;
                }
                
                // Desplazarse al formulario de pago
                document.getElementById('current-payment').scrollIntoView({ behavior: 'smooth' });
            });
        });
        
        document.querySelectorAll('#payments-table .btn:not(.btn-success):not(.btn-danger)').forEach(btn => {
            btn.addEventListener('click', function() {
                const paymentId = parseInt(this.getAttribute('data-id'));
                editPayment(paymentId);
            });
        });
        
        document.querySelectorAll('#payments-table .btn-danger').forEach(btn => {
            btn.addEventListener('click', function() {
                const paymentId = parseInt(this.getAttribute('data-id'));
                deletePayment(paymentId);
            });
        });
    }
    
    // Editar pago
    function editPayment(paymentId) {
        const payment = payments.find(p => p.id === paymentId);
        if (!payment) return;
        
        document.getElementById('payment-plate').value = payment.plate;
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-method').value = payment.method;
        document.getElementById('payment-notes').value = payment.notes;
        
        loadPaymentInfo(payment.plate);
    }
    
    // Eliminar pago
    function deletePayment(paymentId) {
        if (confirm('¿Está seguro que desea eliminar este pago?')) {
            const paymentIndex = payments.findIndex(p => p.id === paymentId);
            if (paymentIndex !== -1) {
                payments.splice(paymentIndex, 1);
                saveData('parking_payments', payments);
                renderPaymentsTable(document.querySelector('.tab-btn.active').dataset.tab);
                showAlert('Pago eliminado exitosamente');
            }
        }
    }
    
    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderPaymentsTable(this.dataset.tab);
        });
    });
    
    // Inicializar
    renderPaymentsTable();
});