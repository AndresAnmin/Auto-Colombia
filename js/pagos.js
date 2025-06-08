document.addEventListener('DOMContentLoaded', function() {
    // Cargar datos
    const users = loadData('parking_users') || [];
    let payments = loadData('parking_payments') || [];
    let editingPaymentId = null;
    const entries = loadData('parking_entries') || [];

    // Verificar si hay un pago pendiente de la página de entradas/salidas
    const currentPlate = localStorage.getItem('current_payment_plate');
    if (currentPlate) {
        loadPaymentInfo(currentPlate);
        localStorage.removeItem('current_payment_plate');
    }

    // Cargar información para el pago
    function loadPaymentInfo(plate) {
        const user = users.find(u => u.plate.toUpperCase() === plate.toUpperCase());
        if (!user) {
            Alert('No se encontró información del usuario', 'danger');
            return;
        }

        // Busca la última entrada con salida registrada
        const lastEntry = entries
            .filter(e => e.plate.toUpperCase() === plate.toUpperCase() && e.exitTime)
            .sort((a, b) => new Date(b.exitTime) - new Date(a.exitTime))[0];

        if (!lastEntry) {
            Alert('No se encontró registro de salida para este vehículo', 'danger');
            return;
        }

        // Busca si hay un pago pendiente para esta entrada
        const pendingPayment = payments.find(
            p => p.plate.toUpperCase() === plate.toUpperCase() && p.status === 'pending' && p.entryId === lastEntry.id
        );

        let amount = 0;
        let hours = 0;

        // Calcula horas solo si hay entrada y salida
        if (lastEntry.entryTime && lastEntry.exitTime) {
            const entryTime = new Date(lastEntry.entryTime);
            const exitTime = new Date(lastEntry.exitTime);
            hours = Math.ceil((exitTime - entryTime) / (50 * 60 * 60));
        }

        if (pendingPayment) {
            amount = pendingPayment.amount;
            document.getElementById('payment-form').setAttribute('data-entry-id', pendingPayment.entryId);
        } else {
            if (user.plan === 'mensual') {
                amount = 300000;
            } else if (user.plan === 'diario') {
                amount = hours <= 24 ? 15000 : 15000 + (hours - 24) * 5000;
            } else {
                amount = hours * 5000;
            }
            document.getElementById('payment-form').setAttribute('data-entry-id', lastEntry.id);
        }

        document.getElementById('payment-plate').value = user.plate;
        document.getElementById('payment-amount').value = amount;

        const paymentInfo = document.getElementById('payment-info');
        paymentInfo.innerHTML = `
            <p><strong>Placa:</strong> ${user.plate}</p>
            <p><strong>Dueño:</strong> ${user.name}</p>
            <p><strong>Plan:</strong> ${user.plan}</p>
            ${user.plan !== 'mensual' ? `<p><strong>Tiempo estacionado:</strong> ${hours} horas</p>` : ''}
        `;

        paymentInfo.classList.add('visible');
    }

    // Funcionalidad de búsqueda por placa
    document.getElementById('filter-plate-btn').addEventListener('click', function() {
        const plate = document.getElementById('search-plate').value.trim().toUpperCase();
        if (!plate) {
            alert('Por favor ingrese una placa para buscar.', 'danger');
            return;
        }
        const user = users.find(u => u.plate.toUpperCase() === plate);
        if (!user) {
            alert('No se encontró información para la placa ingresada.', 'danger');
            return;
        }
        // Autorrellenar y mostrar info
        loadPaymentInfo(plate);
        // Actualizar la tabla solo con esa placa
        renderPaymentsTable('all', plate);
    });

    // (Opcional) Botón para limpiar filtro
    const clearBtn = document.getElementById('clear-filter-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', function() {
            document.getElementById('search-plate').value = '';
            document.getElementById('payment-info').innerHTML = '';
            renderPaymentsTable('all');
        });
    }

    // Formulario de pago
    document.getElementById('payment-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const plate = document.getElementById('payment-plate').value;
        const amount = parseFloat(document.getElementById('payment-amount').value);
        const method = document.getElementById('payment-method').value;
        const entryId = this.getAttribute('data-entry-id');

        if (!plate || !amount || !method) {
            alert('Por favor complete todos los campos requeridos', 'danger');
            return;
        }

        const user = users.find(u => u.plate === plate);
        if (!user) {
            alert('No se encontró información del usuario', 'danger');
            return;
        }

        if (editingPaymentId) {
            // Actualizar pago existente
            const payment = payments.find(p => p.id === editingPaymentId);
            if (payment) {
                payment.method = method;
                payment.amount = amount;
                saveData('parking_payments', payments);
                alert('Pago actualizado exitosamente');
            }
            editingPaymentId = null;
            document.querySelector('#payment-form button[type="submit"]').textContent = 'Registrar Pago';
        } else {
            // Buscar el pago pendiente para esta entrada
            let payment = payments.find(p => p.plate === plate && p.status === 'pending' && p.entryId == entryId);
            if (payment) {
                payment.method = method;
                payment.amount = amount;
                payment.status = 'paid';
                payment.date = new Date().toISOString();
            } else {
                payment = {
                    id: Date.now(),
                    entryId: entryId,
                    date: new Date().toISOString(),
                    plate,
                    userId: user.id,
                    userName: user.name,
                    amount,
                    method,
                    status: 'paid'
                };
                payments.push(payment);
            }
            saveData('parking_payments', payments);
            
            showAlert('Pago registrado exitosamente');
        }

        document.getElementById('payment-form').reset();
        document.getElementById('payment-info').innerHTML = '';
        renderPaymentsTable('all');
    });

    // Renderizar tabla de pagos
    function renderPaymentsTable(filter = 'all', filterPlate = null) {
        const tableBody = document.querySelector('#payments-table tbody');
        tableBody.innerHTML = '';

        let filteredPayments = [];

        if (filter === 'all') {
            filteredPayments = [...payments];
            const lastEntriesByPlate = {};
            entries.filter(e => e.exitTime).forEach(entry => {
                if (
                    !lastEntriesByPlate[entry.plate] ||
                    new Date(entry.exitTime) > new Date(lastEntriesByPlate[entry.plate].exitTime)
                ) {
                    lastEntriesByPlate[entry.plate] = entry;
                }
            });
            Object.values(lastEntriesByPlate).forEach(entry => {
                const alreadyExists = filteredPayments.some(
                    p => p.entryId == entry.id
                );
                if (!alreadyExists) {
                    const user = users.find(u => u.plate === entry.plate);
                    if (user) {
                        const entryTime = new Date(entry.entryTime);
                        const exitTime = new Date(entry.exitTime);
                        const hours = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
                        let amount = 0;
                        if (user.plan === 'mensual') {
                            amount = 300000;
                        } else if (user.plan === 'diario') {
                            amount = hours <= 24 ? 15000 : 15000 + (hours - 24) * 5000;
                        } else {
                            amount = hours * 5000;
                        }
                        filteredPayments.push({
                            id: null,
                            entryId: entry.id,
                            date: '',
                            plate: user.plate,
                            userId: user.id,
                            userName: user.name,
                            amount: amount,
                            method: '',
                            status: 'pending'
                        });
                    }
                }
            });
        } else if (filter === 'paid') {
            filteredPayments = payments.filter(p => p.status === 'paid');
        } else if (filter === 'pending') {
            // Solo pagos pendientes por la última salida de cada placa sin pago registrado
            filteredPayments = [];
            const lastEntriesByPlate = {};
            entries.filter(e => e.exitTime).forEach(entry => {
                if (
                    !lastEntriesByPlate[entry.plate] ||
                    new Date(entry.exitTime) > new Date(lastEntriesByPlate[entry.plate].exitTime)
                ) {
                    lastEntriesByPlate[entry.plate] = entry;
                }
            });
            Object.values(lastEntriesByPlate).forEach(entry => {
                const hasPaid = payments.some(p => p.entryId == entry.id && p.status === 'paid');
                if (!hasPaid) {
                    const user = users.find(u => u.plate === entry.plate);
                    if (user) {
                        const entryTime = new Date(entry.entryTime);
                        const exitTime = new Date(entry.exitTime);
                        const hours = Math.ceil((exitTime - entryTime) / (1000 * 60 * 60));
                        let amount = 0;
                        if (user.plan === 'mensual') {
                            amount = 300000;
                        } else if (user.plan === 'diario') {
                            amount = hours <= 24 ? 15000 : 15000 + (hours - 24) * 5000;
                        } else {
                            amount = hours * 5000;
                        }
                        filteredPayments.push({
                            id: null,
                            entryId: entry.id,
                            date: '',
                            plate: user.plate,
                            userId: user.id,
                            userName: user.name,
                            amount: amount,
                            method: '',
                            status: 'pending'
                        });
                    }
                }
            });
            // Agrega los pagos pendientes ya existentes
            filteredPayments = filteredPayments.concat(payments.filter(p => p.status === 'pending'));
        }

        // Filtrar por placa si se especifica
        if (filterPlate) {
            filteredPayments = filteredPayments.filter(p => p.plate.toUpperCase() === filterPlate.toUpperCase());
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
                        <button class="btn btn-edit" data-id="${payment.id}">Editar</button>
                        <button class="btn btn-danger" data-id="${payment.id}">Eliminar</button>
                    ` : `
                        <button class="btn btn-success" data-plate="${payment.plate}" data-entry-id="${payment.entryId}">Registrar Pago</button>
                    `}
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Agregar event listeners
        document.querySelectorAll('#payments-table .btn-success').forEach(btn => {
            btn.addEventListener('click', function() {
                const plate = this.getAttribute('data-plate');
                const entryId = this.getAttribute('data-entry-id');
                loadPaymentInfo(plate);
                document.getElementById('payment-form').setAttribute('data-entry-id', entryId);
                document.getElementById('payment-plate').value = plate;
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

        editingPaymentId = paymentId;

        document.getElementById('payment-plate').value = payment.plate;
        document.getElementById('payment-amount').value = payment.amount;
        document.getElementById('payment-method').value = payment.method;

        loadPaymentInfo(payment.plate);

        // Cambia el texto del botón a "Actualizar Pago"
        document.querySelector('#payment-form button[type="submit"]').textContent = 'Actualizar Pago';
        // Desplazarse al formulario de pago
        document.getElementById('current-payment').scrollIntoView({ behavior: 'smooth' });
    }

    function deletePayment(paymentId) {
        if (confirm('¿Está seguro que desea eliminar este pago y el usuario asociado?')) {
            const paymentIndex = payments.findIndex(p => p.id === paymentId);
            if (paymentIndex !== -1) {
                const payment = payments[paymentIndex];
                // Eliminar el pago
                payments.splice(paymentIndex, 1);
                saveData('parking_payments', payments);

                // Eliminar el usuario asociado
                const userIndex = users.findIndex(u => u.plate === payment.plate);
                if (userIndex !== -1) {
                    users.splice(userIndex, 1);
                    saveData('parking_users', users);
                }

                renderPaymentsTable(document.querySelector('.tab-btn.active').dataset.tab);
                alert('Pago y usuario eliminados exitosamente');
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