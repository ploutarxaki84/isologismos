/* ===========================================
   ΙΣΟΛΟΛΙΣΜΟΣ - COMPLETE JAVASCRIPT
   =========================================== */

// ===== GLOBAL VARIABLES =====
const MONTHS_GREEK = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
];

const MONTHS_SHORT = [
    'ΙΑΝ', 'ΦΕΒ', 'ΜΑΡ', 'ΑΠΡ', 'ΜΑΙ', 'ΙΟΥΝ',
    'ΙΟΥΛ', 'ΑΥΓ', 'ΣΕΠ', 'ΟΚΤ', 'ΝΟΕ', 'ΔΕΚ'
];

const CATEGORY_COLORS = {
    'cash': '#9d00ff',      // ΜΩΒ
    'salary': '#00f2ff',    // ΤΥΡΚΟΥΑΖ
    'card': '#ffffff'       // ΛΕΥΚΟ
};

const CATEGORY_NAMES = {
    'cash': 'ΜΕΤΡΗΤΑ',
    'salary': 'ΜΙΣΘΟΔΟΣΙΑ',
    'card': 'ΚΑΡΤΑ'
};

// ΚΛΕΙΔΩΜΕΝΑ ΥΠΟΛΟΙΠΑ ΑΠΟ ΠΡΟΗΓΟΥΜΕΝΟ ΕΤΟΣ
const PREVIOUS_YEAR_BALANCES = {
    'cash': 601.80,
    'salary': 508.08,
    'card': 9.10
};

let db = JSON.parse(localStorage.getItem('isologismos_db')) || [];

// Variables για επεξεργασία συναλλαγών
let currentEditId = null;

// Variables για διαγραφή συναλλαγών
let currentCellDetails = {
    monthIndex: null,
    category: null
};

// DOM Elements
const analysisPanel = document.getElementById('analysis-panel');
const detailsModal = document.getElementById('details-modal-overlay');
const detailsModalContent = document.getElementById('details-modal-content');
const deleteTransactionBtn = document.getElementById('delete-transaction-btn');
const monthModal = document.getElementById('month-modal-overlay');
const monthModalContent = document.getElementById('month-modal-content');
const monthsSelectorModal = document.getElementById('months-selector-modal-overlay');
const monthsSelectorContent = document.getElementById('months-selector-content');

// Modal elements για επεξεργασία
const modalTitle = document.getElementById('modal-title');
const editIdField = document.getElementById('edit-id');
const deleteEntryBtn = document.getElementById('delete-entry-btn');

// Sidebar widget
const sidebarWidget = document.getElementById('sidebar-widget');

// Sidebar buttons
const sidebarAnalysisBtn = document.getElementById('sidebar-analysis-btn');
const sidebarNewTransactionBtn = document.getElementById('sidebar-new-transaction-btn');
const sidebarImportBtn = document.getElementById('sidebar-import-btn');
const sidebarExportBtn = document.getElementById('sidebar-export-btn');
const sidebarMonthsBtn = document.getElementById('sidebar-months-btn');

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    init();
});

function init() {
    console.log('🚀 ΙΣΟΛΟΓΙΣΜΟΣ αρχικοποιείται...');
    
    // Set today's date in modal
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('in-date').value = formattedDate;
    
    // Load data
    updateDashboard();
    renderLastTransactions();
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('✅ ΙΣΟΛΟΓΙΣΜΟΣ έτοιμος!');
}

// ===== DATA MANAGEMENT =====
function getMonthData(monthIndex) {
    return db.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === monthIndex;
    });
}

function getCategoryData(category) {
    return db.filter(entry => entry.category === category);
}

function getMonthCategoryData(monthIndex, category) {
    return db.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getMonth() === monthIndex && entry.category === category;
    });
}

function getActiveMonths() {
    const monthIndices = new Set();
    db.forEach(entry => {
        const monthIndex = new Date(entry.date).getMonth();
        monthIndices.add(monthIndex);
    });
    return Array.from(monthIndices).sort((a, b) => a - b);
}

function calculateCategoryTotals() {
    let cash = PREVIOUS_YEAR_BALANCES.cash;
    let salary = PREVIOUS_YEAR_BALANCES.salary;
    let card = PREVIOUS_YEAR_BALANCES.card;
    
    // Προσθήκη τρεχουσών συναλλαγών
    db.forEach(entry => {
        const amount = parseFloat(entry.amount);
        
        if (entry.type === 'income') {
            if (entry.category === 'cash') cash += amount;
            else if (entry.category === 'salary') salary += amount;
            else if (entry.category === 'card') card += amount;
        } else {
            if (entry.category === 'cash') cash -= amount;
            else if (entry.category === 'card') card -= amount;
            // Σημείωση: μισθοδοσία δεν έχει έξοδα
        }
    });
    
    return { cash, salary, card };
}

function calculateTotal() {
    const totals = calculateCategoryTotals();
    return totals.cash + totals.salary + totals.card;
}

function calculateMonthTotal(monthIndex) {
    const monthData = getMonthData(monthIndex);
    let total = 0;
    
    monthData.forEach(entry => {
        const amount = parseFloat(entry.amount);
        if (entry.type === 'income') {
            total += amount;
        } else {
            total -= amount;
        }
    });
    
    return total;
}

// ===== DASHBOARD UPDATES =====
function updateDashboard() {
    const totals = calculateCategoryTotals();
    const totalAmount = calculateTotal();
    
    // Update category cards
    document.getElementById('stat-cash').textContent = `${totals.cash.toFixed(2)} €`;
    document.getElementById('stat-salary').textContent = `${totals.salary.toFixed(2)} €`;
    document.getElementById('stat-card').textContent = `${totals.card.toFixed(2)} €`;
    
    // Update sidebar widget
    updateSidebarWidget(totalAmount);
    
    // Update recent transactions
    renderLastTransactions();
    
    // Update analysis panel if open
    if (analysisPanel.classList.contains('active')) {
        renderAnalysisGrid();
        updateAnalysisTotal();
    }
}

function updateSidebarWidget(amount) {
    const totalAmount = document.getElementById('total-amount');
    const cyberAmount = totalAmount.querySelector('.cyber-amount');
    
    const formatted = Math.abs(amount).toFixed(2);
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    let displayText = '';
    
    if (integerPart.length > 3) {
        const thousands = integerPart.slice(0, -3);
        const hundreds = integerPart.slice(-3);
        displayText = `${thousands}.${hundreds},${decimalPart} €`;
    } else {
        const padded = integerPart.padStart(3, '0');
        displayText = `${padded},${decimalPart} €`;
    }
    
    if (amount < 0) {
        displayText = `-${displayText}`;
        cyberAmount.classList.add('negative');
    } else {
        cyberAmount.classList.remove('negative');
    }
    
    cyberAmount.textContent = displayText;
}

// ===== ΑΝΑΛΥΣΗ ΠΛΕΓΜΑ =====
function openAnalysis() {
    analysisPanel.classList.add('active');
    blurBackground(true);
    
    renderAnalysisGrid();
    updateAnalysisTotal();
}

function renderAnalysisGrid() {
    const gridContainer = document.getElementById('analysis-grid');
    
    if (db.length === 0) {
        gridContainer.innerHTML = `
            <div class="grid-placeholder">
                <i class="fas fa-table"></i>
                <p>ΔΕΝ ΥΠΑΡΧΟΥΝ ΚΑΤΑΧΩΡΗΣΕΙΣ</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // ΚΕΦΑΛΙΔΕΣ: κενό για την πρώτη θέση (γωνία)
    html += `<div class="grid-header-category"></div>`;
    
    // ΚΕΦΑΛΙΔΕΣ ΜΗΝΩΝ (12 στήλες)
    for (let i = 0; i < 12; i++) {
        html += `<div class="grid-header-month">${MONTHS_SHORT[i]}</div>`;
    }
    
    // ΚΑΤΗΓΟΡΙΕΣ (3 σειρές)
    const categories = ['cash', 'salary', 'card'];
    categories.forEach(category => {
        // ΚΕΦΑΛΙΔΑ ΚΑΤΗΓΟΡΙΑΣ - ΕΛΛΗΝΙΚΑ
        const categoryName = CATEGORY_NAMES[category] || category.toUpperCase();
        html += `<div class="grid-header-category">${categoryName}</div>`;
        
        // ΚΕΛΙΑ ΓΙΑ ΚΑΘΕ ΜΗΝΑ (12 στήλες)
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const data = getMonthCategoryData(monthIndex, category);
            const count = data.length;
            const bulletColor = CATEGORY_COLORS[category];
            const bulletClass = `bullet-${category}`;
            
            html += `
                <div class="grid-cell-excel" 
                     data-month="${monthIndex}" 
                     data-category="${category}"
                     onclick="openCellDetails(${monthIndex}, '${category}')">
                    <div class="cell-bullet-container">
                        ${count > 0 ? `<div class="cell-bullet ${bulletClass}" style="background: ${bulletColor}"></div>` : ''}
                        <div class="cell-count">${count > 0 ? `${count}` : ''}</div>
                    </div>
                </div>
            `;
        }
    });
    
    gridContainer.innerHTML = html;
}

function updateAnalysisTotal() {
    const total = calculateTotal();
    const totalElement = document.querySelector('.total-amount');
    
    const formatted = Math.abs(total).toFixed(2);
    const parts = formatted.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    let html = '';
    
    if (integerPart.length > 3) {
        const thousands = integerPart.slice(0, -3);
        const hundreds = integerPart.slice(-3);
        html = `<span class="cyber-amount-holo">${thousands}.${hundreds},${decimalPart} €</span>`;
    } else {
        html = `<span class="cyber-amount-holo">${integerPart},${decimalPart} €</span>`;
    }
    
    if (total < 0) {
        html = `<span style="color: #9d00ff;">-</span>${html}`;
    }
    
    totalElement.innerHTML = html;
}

function closeAnalysis() {
    analysisPanel.classList.remove('active');
    blurBackground(false);
}

function blurBackground(enable) {
    const mainContent = document.querySelector('.main-layout');
    const header = document.querySelector('.main-header');
    
    if (enable) {
        mainContent.style.filter = 'blur(8px) brightness(0.7)';
        header.style.filter = 'blur(8px) brightness(0.7)';
    } else {
        mainContent.style.filter = 'none';
        header.style.filter = 'none';
    }
}

// ===== 10 ΤΕΛΕΥΤΑΙΕΣ ΣΥΝΑΛΛΑΓΕΣ =====
function renderLastTransactions() {
    const container = document.getElementById('last-transactions');
    
    if (db.length === 0) {
        container.innerHTML = `
            <tr class="empty-row">
                <td colspan="5">Δεν υπάρχουν καταχωρήσεις</td>
            </tr>
        `;
        return;
    }
    
    // Get last 10 transactions
    const lastTransactions = [...db]
        .sort((a, b) => a.id - b.id)
        .slice(-10)
        .reverse();
    
    let html = '';
    
    lastTransactions.forEach(entry => {
        const isIncome = entry.type === 'income';
        const rowClass = isIncome ? 'income-row' : 'expense-row';
        const amountColor = isIncome ? '#00f2ff' : '#9d00ff';
        const sign = isIncome ? '+' : '-';
        const categoryColor = CATEGORY_COLORS[entry.category] || '#ffffff';
        const categoryClass = `category-${entry.category}`;
        const categoryName = CATEGORY_NAMES[entry.category] || entry.category.toUpperCase();
        
        html += `
            <tr class="${rowClass}">
                <td style="color: #ffffff; font-family: 'Orbitron', sans-serif; font-weight: 500;">
                    ${formatDate(entry.date)}
                </td>
                <td style="color: ${amountColor}; font-family: 'JetBrains Mono', monospace;">
                    ${entry.desc || '-'}
                </td>
                <td class="${categoryClass}" style="color: ${categoryColor}; font-family: 'Orbitron', sans-serif; font-weight: bold;">
                    ${categoryName}
                </td>
                <td style="color: ${amountColor}; font-family: 'Orbitron', sans-serif; font-weight: bold;">
                    ${sign}${parseFloat(entry.amount).toFixed(2)} €
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" onclick="editTransaction(${entry.id})" title="Επεξεργασία">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTransaction(${entry.id})" title="Διαγραφή">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    container.innerHTML = html;
}

// ===== ΜΗΝΕΣ SELECTOR =====
function openMonthsSelector() {
    const activeMonths = getActiveMonths();
    
    let html = '';
    
    if (activeMonths.length === 0) {
        html = `
            <div class="month-selector-placeholder">
                <i class="fas fa-calendar-times" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>ΔΕΝ ΥΠΑΡΧΟΥΝ ΚΑΤΑΧΩΡΗΣΕΙΣ</p>
                <p style="font-size: 12px; margin-top: 10px; opacity: 0.7;">
                    Προσθέστε την πρώτη σας συναλλαγή
                </p>
            </div>
        `;
    } else {
        activeMonths.forEach((monthIndex, idx) => {
            const monthData = getMonthData(monthIndex);
            const monthTotal = calculateMonthTotal(monthIndex);
            const monthColor = idx % 2 === 0 ? '#9d00ff' : '#00f2ff';
            const totalColor = monthTotal >= 0 ? '#00f2ff' : '#9d00ff';
            const totalSign = monthTotal >= 0 ? '+' : '';
            
            html += `
                <button class="month-selector-btn" onclick="openMonthModal(${monthIndex}); closeMonthsSelector();" 
                        style="border-left-color: ${monthColor}">
                    <span class="month-selector-name">${MONTHS_GREEK[monthIndex].toUpperCase()}</span>
                    <span class="month-selector-total" style="color: ${totalColor}">
                        ${totalSign}${monthTotal.toFixed(2)} €
                    </span>
                </button>
            `;
        });
    }
    
    monthsSelectorContent.innerHTML = html;
    monthsSelectorModal.style.display = 'flex';
}

function closeMonthsSelector() {
    monthsSelectorModal.style.display = 'none';
}

// ===== ΔΙΑΧΕΙΡΗΣΗ ΣΥΝΑΛΛΑΓΩΝ =====
function openCellDetails(monthIndex, category) {
    currentCellDetails.monthIndex = monthIndex;
    currentCellDetails.category = category;
    
    const data = getMonthCategoryData(monthIndex, category);
    
    const monthName = MONTHS_GREEK[monthIndex];
    const categoryName = CATEGORY_NAMES[category] || category.toUpperCase();
    
    let html = `
        <table class="details-table">
            <thead>
                <tr>
                    <th>ΗΜΕΡΟΜΗΝΙΑ</th>
                    <th>ΤΥΠΟΣ</th>
                    <th>ΚΑΤΗΓΟΡΙΑ</th>
                    <th>ΠΟΣΟ</th>
                    <th>ΠΕΡΙΓΡΑΦΗ</th>
                    <th>ΕΝΕΡΓΕΙΕΣ</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    if (data.length === 0) {
        html += `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.3);">
                    Δεν υπάρχουν συναλλαγές για αυτήν την κατηγορία
                </td>
            </tr>
        `;
    } else {
        data.sort((a, b) => a.id - b.id);
        
        data.forEach(entry => {
            const isIncome = entry.type === 'income';
            const rowClass = isIncome ? 'income-row' : 'expense-row';
            const typeText = isIncome ? 'ΕΣΟΔΑ' : 'ΕΞΟΔΑ';
            const amountColor = isIncome ? '#00f2ff' : '#9d00ff';
            const sign = isIncome ? '+' : '-';
            
            html += `
                <tr class="${rowClass}" data-id="${entry.id}">
                    <td style="color: #ffffff;">${formatDate(entry.date)}</td>
                    <td>${typeText}</td>
                    <td style="color: ${CATEGORY_COLORS[entry.category]};">${CATEGORY_NAMES[entry.category] || entry.category.toUpperCase()}</td>
                    <td style="color: ${amountColor}; font-weight: bold;">${sign}${parseFloat(entry.amount).toFixed(2)} €</td>
                    <td>${entry.desc || '-'}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit-btn" onclick="editTransaction(${entry.id})" title="Επεξεργασία">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteTransaction(${entry.id})" title="Διαγραφή">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
    }
    
    html += `
            </tbody>
        </table>
    `;
    
    detailsModalContent.innerHTML = html;
    document.getElementById('details-modal-title').textContent = `${monthName} - ${categoryName}`;
    detailsModal.style.display = 'flex';
    
    if (data.length > 0) {
        deleteTransactionBtn.style.display = 'flex';
    } else {
        deleteTransactionBtn.style.display = 'none';
    }
}

function deleteTransaction(id) {
    if (!confirm('Θέλετε σίγουρα να διαγράψετε αυτή τη συναλλαγή;')) {
        return;
    }
    
    db = db.filter(entry => entry.id !== id);
    localStorage.setItem('isologismos_db', JSON.stringify(db));
    
    updateDashboard();
    refreshCurrentModals();
    
    showToast('Η συναλλαγή διαγράφηκε επιτυχώς!');
}

function editTransaction(id) {
    const entry = db.find(e => e.id === id);
    if (!entry) return;
    
    closeDetailsModal();
    closeMonthModal();
    closeMonthsSelector();
    openEditModal(entry);
}

function openEditModal(entry) {
    document.getElementById('modal-overlay').style.display = 'flex';
    modalTitle.textContent = 'ΕΠΕΞΕΡΓΑΣΙΑ ΣΥΝΑΛΛΑΓΗΣ';
    
    document.getElementById('in-date').value = entry.date;
    document.getElementById('in-type').value = entry.type;
    document.getElementById('in-cat').value = entry.category;
    document.getElementById('in-amount').value = entry.amount;
    document.getElementById('in-desc').value = entry.desc || '';
    
    currentEditId = entry.id;
    editIdField.value = entry.id;
    deleteEntryBtn.style.display = 'flex';
    document.getElementById('in-date').focus();
}

function saveEntry() {
    const id = currentEditId || Date.now();
    
    const entry = {
        id: id,
        date: document.getElementById('in-date').value,
        type: document.getElementById('in-type').value,
        category: document.getElementById('in-cat').value,
        amount: parseFloat(document.getElementById('in-amount').value) || 0,
        desc: document.getElementById('in-desc').value.trim()
    };
    
    if (entry.amount <= 0) {
        alert('Παρακαλώ εισάγετε έγκυρο ποσό.');
        return;
    }
    
    if (!entry.date) {
        alert('Παρακαλώ επιλέξτε ημερομηνία.');
        return;
    }
    
    if (entry.category === 'salary' && entry.type === 'expense') {
        alert('Η κατηγορία "Μισθοδοσία" δεχόμενη μόνο εισοδήματα.');
        return;
    }
    
    if (currentEditId) {
        const index = db.findIndex(e => e.id === currentEditId);
        if (index !== -1) {
            db[index] = entry;
        }
    } else {
        db.push(entry);
    }
    
    localStorage.setItem('isologismos_db', JSON.stringify(db));
    
    updateDashboard();
    closeModal();
    
    if (analysisPanel.classList.contains('active')) {
        renderAnalysisGrid();
        updateAnalysisTotal();
    }
    
    const message = currentEditId ? 'Η συναλλαγή ενημερώθηκε επιτυχώς!' : 'Η συναλλαγή προστέθηκε επιτυχώς!';
    showToast(message);
}

function deleteCurrentEntry() {
    if (!currentEditId) return;
    
    if (!confirm('Θέλετε σίγουρα να διαγράψετε αυτή τη συναλλαγή;')) {
        return;
    }
    
    db = db.filter(entry => entry.id !== currentEditId);
    localStorage.setItem('isologismos_db', JSON.stringify(db));
    
    updateDashboard();
    closeModal();
    
    if (analysisPanel.classList.contains('active')) {
        renderAnalysisGrid();
        updateAnalysisTotal();
    }
    
    showToast('Η συναλλαγή διαγράφηκε επιτυχώς!');
}

function deleteCurrentTransactions() {
    if (!currentCellDetails.monthIndex && currentCellDetails.monthIndex !== 0) return;
    
    const monthIndex = currentCellDetails.monthIndex;
    const category = currentCellDetails.category;
    
    const data = getMonthCategoryData(monthIndex, category);
    
    if (data.length === 0) {
        showToast('Δεν υπάρχουν συναλλαγές προς διαγραφή');
        return;
    }
    
    const categoryName = CATEGORY_NAMES[category] || category.toUpperCase();
    if (!confirm(`Θέλετε σίγουρα να διαγράψετε όλες τις ${data.length} συναλλαγές για ${MONTHS_GREEK[monthIndex]} - ${categoryName}; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`)) {
        return;
    }
    
    const idsToDelete = data.map(entry => entry.id);
    db = db.filter(entry => !idsToDelete.includes(entry.id));
    
    localStorage.setItem('isologismos_db', JSON.stringify(db));
    
    closeDetailsModal();
    updateDashboard();
    
    if (analysisPanel.classList.contains('active')) {
        renderAnalysisGrid();
        updateAnalysisTotal();
    }
    
    showToast(`Διαγράφηκαν ${data.length} συναλλαγές`);
}

function refreshCurrentModals() {
    if (detailsModal.style.display === 'flex' && currentCellDetails.monthIndex !== null) {
        openCellDetails(currentCellDetails.monthIndex, currentCellDetails.category);
    }
    
    if (monthModal.style.display === 'flex') {
        const monthIndex = parseInt(monthModalContent.dataset.monthIndex);
        if (!isNaN(monthIndex)) {
            openMonthModal(monthIndex);
        }
    }
    
    if (monthsSelectorModal.style.display === 'flex') {
        openMonthsSelector();
    }
}

// ===== MODAL ΜΗΝΑ =====
function openMonthModal(monthIndex) {
    const monthData = getMonthData(monthIndex);
    const monthTotal = calculateMonthTotal(monthIndex);
    const monthName = MONTHS_GREEK[monthIndex];
    
    monthModalContent.dataset.monthIndex = monthIndex;
    
    let html = `
        <div class="month-header" style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid rgba(0, 242, 255, 0.5);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-family: 'Orbitron', sans-serif; color: #00f2ff; letter-spacing: 3px;">${monthName}</h3>
                <div style="font-family: 'Orbitron', sans-serif; font-size: 20px; font-weight: bold; color: ${monthTotal >= 0 ? '#00f2ff' : '#9d00ff'}">
                    ${monthTotal >= 0 ? '+' : ''}${monthTotal.toFixed(2)} €
                </div>
            </div>
        </div>
        <div class="month-transactions-list">
    `;
    
    if (monthData.length === 0) {
        html += `
            <div style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.3);">
                <i class="fas fa-database" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>Δεν υπάρχουν συναλλαγές για αυτόν τον μήνα</p>
            </div>
        `;
    } else {
        monthData.sort((a, b) => a.id - b.id);
        
        monthData.forEach(entry => {
            const isIncome = entry.type === 'income';
            const rowClass = isIncome ? 'month-transaction-income' : 'month-transaction-expense';
            const amountClass = isIncome ? 'income-amount-month' : 'expense-amount-month';
            const categoryClass = `category-${entry.category}-month`;
            const sign = isIncome ? '+' : '-';
            const categoryColor = CATEGORY_COLORS[entry.category] || '#ffffff';
            const categoryName = CATEGORY_NAMES[entry.category] || entry.category.toUpperCase();
            
            html += `
                <div class="month-transaction-item ${rowClass}">
                    <div class="month-transaction-desc">
                        <div class="month-transaction-category ${categoryClass}" style="color: ${categoryColor}">
                            ${categoryName}
                        </div>
                        <div style="margin-bottom: 5px;">${entry.desc || '-'}</div>
                        <div style="font-size: 11px; opacity: 0.7; color: #ffffff;">
                            ${formatDate(entry.date)}
                        </div>
                    </div>
                    <div class="month-transaction-amount ${amountClass}">
                        ${sign}${parseFloat(entry.amount).toFixed(2)} €
                    </div>
                    <div class="action-buttons" style="margin-left: 15px;">
                        <button class="action-btn edit-btn" onclick="editTransaction(${entry.id})" title="Επεξεργασία">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="deleteTransaction(${entry.id})" title="Διαγραφή">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    html += `</div>`;
    
    monthModalContent.innerHTML = html;
    document.getElementById('month-modal-title').textContent = monthName;
    monthModal.style.display = 'flex';
}

// ===== MODAL FUNCTIONS =====
function openModal() {
    currentEditId = null;
    editIdField.value = '';
    modalTitle.textContent = 'ΝΕΑ ΣΥΝΑΛΛΑΓΗ';
    deleteEntryBtn.style.display = 'none';
    
    document.getElementById('modal-overlay').style.display = 'flex';
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('in-date').value = formattedDate;
    document.getElementById('in-amount').value = '';
    document.getElementById('in-desc').value = '';
    
    document.getElementById('in-cat').value = 'cash';
    document.getElementById('in-type').value = 'income';
    
    document.getElementById('in-date').focus();
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    currentEditId = null;
    editIdField.value = '';
}

function closeDetailsModal() {
    detailsModal.style.display = 'none';
    currentCellDetails.monthIndex = null;
    currentCellDetails.category = null;
}

function closeMonthModal() {
    monthModal.style.display = 'none';
}

// ===== DATA IMPORT/EXPORT =====
function exportData() {
    const dataStr = JSON.stringify(db, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `isologismos_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    showToast('Τα δεδομένα εξήχθησαν επιτυχώς!');
}

function importData(event) {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
    
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (!Array.isArray(imported)) {
                    throw new Error('Μη έγκυρο αρχείο δεδομένων');
                }
                
                const existingIds = new Set(db.map(item => item.id));
                const newEntries = imported.filter(item => !existingIds.has(item.id));
                
                db.push(...newEntries);
                localStorage.setItem('isologismos_db', JSON.stringify(db));
                
                updateDashboard();
                
                if (analysisPanel.classList.contains('active')) {
                    renderAnalysisGrid();
                    updateAnalysisTotal();
                }
                
                showToast(`${newEntries.length} νέες καταχωρήσεις προστέθηκαν!`);
                
            } catch (err) {
                console.error('Import error:', err);
                alert('Σφάλμα: Μη έγκυρο αρχείο δεδομένων');
            }
        };
        
        reader.readAsText(file);
        fileInput.value = '';
    };
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 30px;
        background: rgba(0, 242, 255, 0.9);
        color: #050508;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: 'Orbitron', sans-serif;
        font-size: 12px;
        letter-spacing: 2px;
        z-index: 3000;
        animation: slideIn 0.3s ease;
        text-transform: uppercase;
        font-weight: bold;
        border: 1px solid rgba(0, 242, 255, 0.5);
        box-shadow: 0 5px 20px rgba(0, 242, 255, 0.4);
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            toast.remove();
            style.remove();
        }, 300);
    }, 3000);
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Sidebar buttons
    sidebarAnalysisBtn.addEventListener('click', openAnalysis);
    sidebarNewTransactionBtn.addEventListener('click', openModal);
    sidebarImportBtn.addEventListener('click', importData);
    sidebarExportBtn.addEventListener('click', exportData);
    sidebarMonthsBtn.addEventListener('click', openMonthsSelector);
    
    // Modal buttons
    document.getElementById('save-entry-btn').addEventListener('click', saveEntry);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('delete-entry-btn').addEventListener('click', deleteCurrentEntry);
    
    // Analysis panel
    document.getElementById('analysis-close-btn').addEventListener('click', closeAnalysis);
    
    // Details modal
    document.getElementById('details-modal-close-btn').addEventListener('click', closeDetailsModal);
    deleteTransactionBtn.addEventListener('click', deleteCurrentTransactions);
    
    // Month modal
    document.getElementById('month-modal-close-btn').addEventListener('click', closeMonthModal);
    
    // Months selector modal
    document.getElementById('months-selector-close-btn').addEventListener('click', closeMonthsSelector);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (analysisPanel.classList.contains('active')) {
                closeAnalysis();
            } else if (document.getElementById('modal-overlay').style.display === 'flex') {
                closeModal();
            } else if (detailsModal.style.display === 'flex') {
                closeDetailsModal();
            } else if (monthModal.style.display === 'flex') {
                closeMonthModal();
            } else if (monthsSelectorModal.style.display === 'flex') {
                closeMonthsSelector();
            }
        }
    });
    
    // Close modals on outside click
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
    
    detailsModal.addEventListener('click', (e) => {
        if (e.target === detailsModal) closeDetailsModal();
    });
    
    monthModal.addEventListener('click', (e) => {
        if (e.target === monthModal) closeMonthModal();
    });
    
    monthsSelectorModal.addEventListener('click', (e) => {
        if (e.target === monthsSelectorModal) closeMonthsSelector();
    });
    
    // Enter key shortcuts
    document.getElementById('in-desc').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEntry();
    });
    
    document.getElementById('in-amount').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveEntry();
    });
}