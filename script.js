document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE SETUP ---
    let db;
    const request = indexedDB.open('checkbookDB', 1);

    request.onerror = event => console.error('Database error:', event.target.errorCode);
    request.onupgradeneeded = event => {
        db = event.target.result;
        const objectStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('date', 'date', { unique: false });
        objectStore.createIndex('reconciled', 'reconciled', { unique: false });
    };
    request.onsuccess = event => {
        db = event.target.result;
        syncLocalStorageToIndexedDB().then(() => {
            // --- MODIFIED: LOAD SORT PREFERENCE ON STARTUP ---
            // 1. Get the saved sort order from Local Storage, defaulting to 'asc' if not found.
            const savedSortOrder = localStorage.getItem('checkbookSortOrder') || 'asc';
            
            // 2. Update the dropdown to visually match the saved preference.
            document.getElementById('sortOrder').value = savedSortOrder;
            
            // 3. Load the initial transaction view using the saved preference.
            displayTransactions(null, savedSortOrder);
        });
    };

    // --- DOM ELEMENTS ---
    const addTransactionBtn = document.getElementById('addTransactionBtn');
    const addModal = document.getElementById('addTransactionModal');
    const addModalCloseBtn = addModal.querySelector('.close-button');
    const addTransactionForm = document.getElementById('addTransactionForm');
    const purgeBtn = document.getElementById('purgeBtn');
    const purgeModal = document.getElementById('purgeModal');
    const purgeModalCloseBtn = purgeModal.querySelector('.close-button');
    const purgeForm = document.getElementById('purgeForm');
    const cancelPurgeBtn = purgeModal.querySelector('.cancel-btn');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const clearFilterBtn = document.getElementById('clearFilterBtn');
    const sortOrderSelect = document.getElementById('sortOrder');

    // --- EVENT LISTENERS ---
    addTransactionBtn.onclick = () => addModal.style.display = 'block';
    addModalCloseBtn.onclick = () => addModal.style.display = 'none';
    purgeBtn.onclick = () => purgeModal.style.display = 'block';
    purgeModalCloseBtn.onclick = () => purgeModal.style.display = 'none';
    cancelPurgeBtn.onclick = () => purgeModal.style.display = 'none';
    window.onclick = event => {
        if (event.target == addModal) addModal.style.display = 'none';
        if (event.target == purgeModal) purgeModal.style.display = 'none';
    };
    addTransactionForm.addEventListener('submit', addTransaction);
    purgeForm.addEventListener('submit', handlePurge);
    exportBtn.addEventListener('click', exportToJson);
    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importFromJson);
    applyFilterBtn.addEventListener('click', applyFilters);
    clearFilterBtn.addEventListener('click', clearFilters);
    sortOrderSelect.addEventListener('change', applyFilters);

    // --- CORE TRANSACTION FUNCTIONS ---

    function addTransaction(e) {
        e.preventDefault();
        const type = document.getElementById('transactionType').value;
        let amount = parseFloat(document.getElementById('transactionAmount').value);

        if (type === 'debit') {
            amount = -Math.abs(amount);
        }

        const newTransaction = {
            date: document.getElementById('transactionDate').value,
            description: document.getElementById('transactionDescription').value,
            category: document.getElementById('transactionCategory').value,
            amount: amount,
            reconciled: false
        };

        const transaction = db.transaction(['transactions'], 'readwrite');
        const objectStore = transaction.objectStore('transactions');
        const request = objectStore.add(newTransaction);

        request.onsuccess = () => {
            addTransactionForm.reset();
            addModal.style.display = 'none';
            applyFilters();
            backupToLocalStorage();
        };
        request.onerror = (err) => console.error('Error adding transaction:', err);
    }

    function displayTransactions(filters = null, sortOrder = 'asc') {
        const transactionList = document.getElementById('transaction-list');
        transactionList.innerHTML = '';
        const transactionStore = db.transaction('transactions', 'readonly').objectStore('transactions');
        const request = transactionStore.getAll();

        request.onsuccess = () => {
            let allTransactions = request.result;

            let filteredTransactions = filters ? allTransactions.filter(tx => {
                const txDate = new Date(tx.date);
                if (filters.startDate && txDate < filters.startDate) return false;
                if (filters.endDate && txDate > filters.endDate) return false;
                if (filters.description && !tx.description.toLowerCase().includes(filters.description)) return false;
                if (filters.category && !tx.category.toLowerCase().includes(filters.category)) return false;
                if (filters.reconciledStatus !== 'all') {
                    const requiredStatus = filters.reconciledStatus === 'true';
                    if (tx.reconciled !== requiredStatus) return false;
                }
                return true;
            }) : allTransactions;

            filteredTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

            const balanceMap = new Map();
            let currentBalance = 0;
            for (const tx of filteredTransactions) {
                currentBalance += tx.amount;
                balanceMap.set(tx.id, currentBalance);
            }

            if (sortOrder === 'desc') {
                filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            }
            
            filteredTransactions.forEach(tx => {
                const row = document.createElement('tr');
                const cell1 = document.createElement('td');
                const actionContainer = document.createElement('div');
                actionContainer.className = 'action-container';
                const reconcileCheck = document.createElement('input');
                reconcileCheck.type = 'checkbox';
                reconcileCheck.checked = tx.reconciled;
                reconcileCheck.onchange = () => toggleReconcile(tx.id, reconcileCheck.checked);
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'X';
                deleteBtn.className = 'delete-btn';
                deleteBtn.onclick = () => deleteTransaction(tx.id);
                actionContainer.appendChild(reconcileCheck);
                actionContainer.appendChild(deleteBtn);
                const dateDiv = document.createElement('div');
                const dateParts = tx.date.split('-').map(part => parseInt(part, 10));
                const displayDate = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
                dateDiv.textContent = displayDate.toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit', timeZone: 'UTC' });
                cell1.appendChild(actionContainer);
                cell1.appendChild(dateDiv);
                row.appendChild(cell1);

                const cell2 = document.createElement('td');
                cell2.innerHTML = `${tx.description}<br><small><em>${tx.category}</em></small>`;
                row.appendChild(cell2);

                const cell3 = document.createElement('td');
                const runningBalance = balanceMap.get(tx.id);
                const balanceSpan = document.createElement('strong');
                balanceSpan.className = 'running-balance';
                balanceSpan.textContent = runningBalance.toFixed(2);
                if (runningBalance < 0) balanceSpan.classList.add('negative');
                cell3.innerHTML = `${tx.amount.toFixed(2)}<br>`;
                cell3.appendChild(balanceSpan);
                row.appendChild(cell3);

                transactionList.appendChild(row);
            });

            if (!filters) {
                updateDatalists(allTransactions);
            }
        };
        request.onerror = (err) => console.error('Error fetching transactions:', err);
    }

    function deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;
        const transaction = db.transaction(['transactions'], 'readwrite');
        const objectStore = transaction.objectStore('transactions');
        const request = objectStore.delete(id);
        request.onsuccess = () => {
            applyFilters();
            backupToLocalStorage();
        };
    }

    function toggleReconcile(id, newReconciledState) {
        const transactionStore = db.transaction('transactions', 'readwrite').objectStore('transactions');
        const request = transactionStore.get(id);
        request.onsuccess = () => {
            const transaction = request.result;
            transaction.reconciled = newReconciledState;
            const updateRequest = transactionStore.put(transaction);
            updateRequest.onsuccess = () => {
                applyFilters(); 
                backupToLocalStorage();
            };
        };
    }

    // --- FILTER, SORT, AND PURGE LOGIC ---

    function applyFilters() {
        const startDateValue = document.getElementById('startDateFilter').value;
        const endDateValue = document.getElementById('endDateFilter').value;
        
        const filters = {
            startDate: startDateValue ? new Date(startDateValue) : null,
            endDate: endDateValue ? new Date(endDateValue) : null,
            description: document.getElementById('descriptionFilter').value.toLowerCase(),
            category: document.getElementById('categoryFilter').value.toLowerCase(),
            reconciledStatus: document.getElementById('reconciledFilter').value
        };
        const sortOrder = document.getElementById('sortOrder').value;

        // --- MODIFIED: SAVE SORT PREFERENCE ---
        // Every time the user applies a filter or changes the sort, save the choice.
        localStorage.setItem('checkbookSortOrder', sortOrder);

        if (filters.startDate) filters.startDate.setUTCHours(0, 0, 0, 0);
        if (filters.endDate) filters.endDate.setUTCHours(23, 59, 59, 999);
        
        displayTransactions(filters, sortOrder);
    }
    
    function clearFilters() {
        document.getElementById('startDateFilter').value = '';
        document.getElementById('endDateFilter').value = '';
        document.getElementById('descriptionFilter').value = '';
        document.getElementById('categoryFilter').value = '';
        document.getElementById('reconciledFilter').value = 'all';
        // When clearing, we reset the sort order visually and in Local Storage
        document.getElementById('sortOrder').value = 'asc';
        localStorage.setItem('checkbookSortOrder', 'asc');
        displayTransactions();
    }

    function handlePurge(e) {
        e.preventDefault();
        const purgeDateStr = document.getElementById('purgeDate').value;
        if (!purgeDateStr) return alert('Please select a date.');
        purgeModal.style.display = 'none';
        purgeReconciled(purgeDateStr);
    }

    function purgeReconciled(purgeDateStr) {
        if (!confirm(`Are you sure you want to permanently delete all RECONCILED transactions on or before ${purgeDateStr}?`)) return;
        const transactionStore = db.transaction('transactions', 'readwrite').objectStore('transactions');
        const request = transactionStore.openCursor();
        request.onsuccess = event => {
            const cursor = event.target.result;
            if (cursor) {
                const transaction = cursor.value;
                if (transaction.reconciled && transaction.date <= purgeDateStr) {
                    cursor.delete();
                }
                cursor.continue();
            } else {
                applyFilters();
                backupToLocalStorage();
            }
        };
    }
    
    function updateDatalists(transactions) {
        const descriptionList = document.getElementById('description-list');
        const categoryList = document.getElementById('category-list');
        const uniqueDescriptions = [...new Set(transactions.map(tx => tx.description))];
        const uniqueCategories = [...new Set(transactions.map(tx => tx.category))];
        descriptionList.innerHTML = uniqueDescriptions.map(d => `<option value="${d}"></option>`).join('');
        categoryList.innerHTML = uniqueCategories.map(c => `<option value="${c}"></option>`).join('');
    }

    function backupToLocalStorage() {
        const transaction = db.transaction(['transactions'], 'readonly');
        const objectStore = transaction.objectStore('transactions');
        const request = objectStore.getAll();
        request.onsuccess = () => {
            localStorage.setItem('checkbookBackup', JSON.stringify(request.result));
        };
    }

    function syncLocalStorageToIndexedDB() {
        return new Promise((resolve) => {
            const backup = localStorage.getItem('checkbookBackup');
            if (backup) {
                try {
                    const transactions = JSON.parse(backup);
                    const transactionStore = db.transaction(['transactions'], 'readwrite').objectStore('transactions');
                    const clearRequest = transactionStore.clear(); 
                    clearRequest.onsuccess = () => {
                        transactions.forEach(t => transactionStore.put(t));
                        resolve();
                    };
                    clearRequest.onerror = () => resolve();
                } catch (e) {
                    console.error("Error parsing or syncing from localStorage", e);
                    resolve();
                }
            } else {
                resolve();
            }
        });
    }

    function exportToJson() {
        const transaction = db.transaction(['transactions'], 'readonly');
        const objectStore = transaction.objectStore('transactions');
        const request = objectStore.getAll();
        request.onsuccess = () => {
            const data = JSON.stringify(request.result, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `checkbook_export_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        };
    }

    function importFromJson(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => {
                if(confirm('This will overwrite all current transactions. Are you sure you want to import this file?')) {
                    try {
                        const transactions = JSON.parse(e.target.result);
                        const transactionStore = db.transaction(['transactions'], 'readwrite').objectStore('transactions');
                        const clearRequest = transactionStore.clear();
                        clearRequest.onsuccess = () => {
                            transactions.forEach(t => transactionStore.put(t));
                            applyFilters();
                            backupToLocalStorage();
                        };
                    } catch (error) {
                        alert('Error parsing JSON file. Please ensure it is a valid export.');
                        console.error('JSON Import Error:', error);
                    }
                }
            };
            reader.readAsText(file);
        }
        event.target.value = null;
    }

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
    }
});