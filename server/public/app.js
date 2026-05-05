// Tyre Shop App Logic - Vanilla JS

const API_BASE = '/api';
let token = localStorage.getItem('tyreToken');
let currentPage = 'dashboard';

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
  if (!token) {
    showLogin();
  } else {
    verifyToken();
    showMainApp();
    loadPage('dashboard');
  }
  setupEventListeners();
});

function showLogin() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
  document.getElementById('loginOverlay').classList.add('hidden');
  document.getElementById('mainApp').style.display = 'flex';
}

function verifyToken() {
  // For now, assume token valid if exists. Server can add check later.
}

function setupEventListeners() {
  // Login
  document.getElementById('loginForm').addEventListener('submit', handleLogin);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('href').slice(1);
      loadPage(page);
    });
  });

  // Hash routing
  window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    loadPage(hash);
  });

  // Billing
  document.getElementById('billForm').addEventListener('submit', handleBillSubmit);

  // Inventory
  document.getElementById('addInventoryBtn').addEventListener('click', () => showInventoryModal());
  document.getElementById('inventoryForm').addEventListener('submit', handleInventorySubmit);
  document.getElementById('cancelInventory').addEventListener('click', () => hideInventoryModal());

  // Expenses
  document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);

  // Reports filter
  document.getElementById('filterReports').addEventListener('click', loadReports);

  // Customer search
  document.getElementById('customerSearch').addEventListener('input', debounce((e) => loadCustomers(e.target.value), 300));



  // Print
  document.getElementById('printBill').addEventListener('click', () => window.print());
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (data.success) {
      token = data.token;
      localStorage.setItem('tyreToken', token);
      showMainApp();
      loadPage('dashboard');
    } else {
      showError('loginError', data.message || 'Login failed');
    }
  } catch (err) {
    showError('loginError', 'Server error');
  }
}

function logout() {
  localStorage.removeItem('tyreToken');
  token = null;
  showLogin();
}

function loadPage(page) {
  currentPage = page;
  document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
  document.getElementById(page).classList.remove('hidden');
  document.getElementById('pageTitle').textContent = page.charAt(0).toUpperCase() + page.slice(1);
  
  // Load data for page
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'inventory': loadInventory(); break;
    case 'expenses': loadExpenses(); break;
    case 'reports': loadReports(); break;
    case 'customers': loadCustomers(); break;
  }
}

async function api(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
}

async function loadDashboard() {
  try {
    const data = await api('/dashboard');
    document.getElementById('totalSales').textContent = data.totalSales.toLocaleString();
    document.getElementById('todayRevenue').textContent = data.todayRevenue.toLocaleString();
    document.getElementById('totalExpenses').textContent = data.totalExpenses.toLocaleString();
    document.getElementById('lowStock').textContent = data.lowStock;
    
    // Recent sales (last 5 bills)
    const bills = await api('/bills');
    const recent = bills.slice(0, 5).reverse();
    renderRecentSales(recent);
  } catch (err) {
    console.error(err);
  }
}

function renderRecentSales(bills) {
  const tbody = document.getElementById('recentSales');
  if (!bills.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No recent sales</td></tr>';
    return;
  }
  tbody.innerHTML = bills.map(bill => `
    <tr class="border-t border-gray-100 hover:bg-gray-50">
      <td class="px-6 py-4 font-medium">${bill.customerName}</td>
      <td class="px-6 py-4">${bill.service}</td>
      <td class="px-6 py-4 font-bold text-green-600">₹${parseFloat(bill.amount).toLocaleString()}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${new Date(bill.date).toLocaleString()}</td>
    </tr>
  `).join('');
}

async function handleBillSubmit(e) {
  e.preventDefault();
  const formData = {
    customerName: document.getElementById('customerName').value,
    phone: document.getElementById('customerPhone').value,
    vehicleNumber: document.getElementById('vehicleNumber').value,
    service: document.getElementById('service').value,
    amount: document.getElementById('billAmount').value
  };

  if (!formData.phone.startsWith('91')) {
    formData.phone = '91' + formData.phone.replace(/[^0-9]/g, '');
  }

  try {
    await api('/bills', { method: 'POST', body: JSON.stringify(formData) });
    
    // Generate exact bill text
    const dateStr = new Date().toLocaleString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    }).replace(/(\d+)\/(\d+)\/(\d+), (\d+:\d+)/, '$1-$2-$3 $4');
    
    const billText = `Tyre Shop Bill

Customer: ${formData.customerName}
Vehicle: ${formData.vehicleNumber.toUpperCase()}
Service: ${formData.service}
Amount: ₹${formData.amount}

Date: ${dateStr}`;

    document.getElementById('billText').textContent = billText;
    document.getElementById('billPreview').classList.remove('hidden');
    
    // WhatsApp URL
    const message = encodeURIComponent(billText);
    document.getElementById('whatsappBtn').onclick = () => {
      window.open(`https://wa.me/${formData.phone}?text=${message}`, '_blank');
    };

    // Reset form
    e.target.reset();
  } catch (err) {
    alert('Error creating bill');
  }
}

async function loadInventory() {
  try {
    const inventory = await api('/inventory');
    renderInventory(inventory);
  } catch (err) {
    console.error(err);
  }
}

function renderInventory(items) {
  const tbody = document.getElementById('inventoryTable');
  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="px-6 py-12 text-center text-gray-500">No inventory items</td></tr>';
    return;
  }
  
  tbody.innerHTML = items.map(item => {
    const lowStock = parseInt(item.quantity) < 5;
    return `
      <tr class="border-t border-gray-100 hover:bg-gray-50 ${lowStock ? 'low-stock' : ''}">
        <td class="px-6 py-4 font-medium">${item.type}</td>
        <td class="px-6 py-4">${item.size}</td>
        <td class="px-6 py-4">${item.brand}</td>
        <td class="px-6 py-4 text-right font-bold text-green-600">₹${parseFloat(item.price).toLocaleString()}</td>
        <td class="px-6 py-4 text-right font-bold ${lowStock ? 'text-red-600' : ''}">${item.quantity}</td>
        <td class="px-6 py-4">
          <button onclick="editInventory(${item.id})" class="text-blue-600 hover:text-blue-800 mr-3">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteInventory(${item.id})" class="text-red-600 hover:text-red-800">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

window.editInventory = async (id) => {
  try {
    const item = (await api('/inventory')).find(i => i.id === id);
    if (item) {
      document.getElementById('editInventoryId').value = item.id;
      document.getElementById('itemType').value = item.type;
      document.getElementById('itemSize').value = item.size;
      document.getElementById('itemBrand').value = item.brand;
      document.getElementById('itemPrice').value = item.price;
      document.getElementById('itemQuantity').value = item.quantity;
      showInventoryModal(true);
    }
  } catch (err) {
    console.error(err);
  }
};

window.deleteInventory = async (id) => {
  if (confirm('Delete this item?')) {
    await api(`/inventory/${id}`, { method: 'DELETE' });
    loadInventory();
  }
};

function showInventoryModal(edit = false) {
  document.getElementById('inventoryModal').classList.remove('hidden');
  document.getElementById('inventoryForm').querySelector('button[type="submit"]').textContent = edit ? 'Update' : 'Add';
}

function hideInventoryModal() {
  document.getElementById('inventoryModal').classList.add('hidden');
  document.getElementById('inventoryForm').reset();
  document.getElementById('editInventoryId').value = '';
}

async function handleInventorySubmit(e) {
  e.preventDefault();
  const formData = {
    type: document.getElementById('itemType').value,
    size: document.getElementById('itemSize').value,
    brand: document.getElementById('itemBrand').value,
    price: document.getElementById('itemPrice').value,
    quantity: document.getElementById('itemQuantity').value
  };
  const id = document.getElementById('editInventoryId').value;
  
  try {
    if (id) {
      await api(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(formData) });
    } else {
      await api('/inventory', { method: 'POST', body: JSON.stringify(formData) });
    }
    hideInventoryModal();
    loadInventory();
  } catch (err) {
    alert('Error saving inventory');
  }
}

async function loadExpenses() {
  try {
    const expenses = await api('/expenses');
    renderExpenses(expenses);
  } catch (err) {
    console.error(err);
  }
}

function renderExpenses(expenses) {
  const tbody = document.getElementById('expensesTable');
  tbody.innerHTML = expenses.map(exp => `
    <tr class="border-t hover:bg-gray-50">
      <td class="px-6 py-4">${exp.type}</td>
      <td class="px-6 py-4 text-right font-bold text-red-600">₹${parseFloat(exp.amount).toLocaleString()}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${new Date(exp.date).toLocaleDateString()}</td>
      <td class="px-6 py-4 w-20">
        <button onclick="deleteExpense(${exp.id})" class="text-red-600 hover:text-red-800">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No expenses</td></tr>';
  
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  document.getElementById('expensesTotal').textContent = total.toLocaleString();
}

window.deleteExpense = async (id) => {
  if (confirm('Delete expense?')) {
    await api(`/expenses/${id}`, { method: 'DELETE' }); // Note: server needs DELETE /expenses/:id
    loadExpenses();
  }
};

async function handleExpenseSubmit(e) {
  e.preventDefault();
  const data = {
    type: document.getElementById('expenseType').value,
    amount: document.getElementById('expenseAmount').value
  };
  try {
    await api('/expenses', { method: 'POST', body: JSON.stringify(data) });
    e.target.reset();
    loadExpenses();
    loadDashboard(); // Update stats
  } catch (err) {
    alert('Error adding expense');
  }
}

async function loadReports() {
  const dateFrom = document.getElementById('reportDateFrom').value;
  const dateTo = document.getElementById('reportDateTo').value;
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);
  
  try {
    const data = await api(`/reports?${params}`);
    renderReports(data.bills);
    document.getElementById('reportTotal').textContent = data.totalRevenue.toLocaleString();
  } catch (err) {
    console.error(err);
  }
}

function renderReports(bills) {
  const tbody = document.getElementById('reportsTable');
  tbody.innerHTML = bills.map(bill => `
    <tr class="border-t hover:bg-gray-50">
      <td class="px-6 py-4">${bill.customerName}</td>
      <td class="px-6 py-4">${bill.vehicleNumber.toUpperCase()}</td>
      <td class="px-6 py-4">${bill.service}</td>
      <td class="px-6 py-4 text-right font-bold text-green-600">₹${parseFloat(bill.amount).toLocaleString()}</td>
      <td class="px-6 py-4 text-sm text-gray-500">${new Date(bill.date).toLocaleDateString()}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No sales</td></tr>';
}

async function loadCustomers(search = '') {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  try {
    const customers = await api(`/customers${params}`);
    renderCustomers(customers);
  } catch (err) {
    console.error('Customers error:', err);
    document.getElementById('customersTable').innerHTML = '<tr><td colspan="5">Error loading customers</td></tr>';
  }
}


function renderCustomers(customers) {
  const tbody = document.getElementById('customersTable');
  tbody.innerHTML = customers.map(cust => `
    <tr class="border-t hover:bg-gray-50">
      <td class="px-6 py-4 font-bold">${cust.name}</td>
      <td class="px-6 py-4">${cust.vehicle.toUpperCase()}</td>
      <td class="px-6 py-4">${cust.phone || '-'}</td>
      <td class="px-6 py-4 text-right text-lg font-bold text-green-600">₹${cust.totalSpent.toLocaleString()}</td>
      <td class="px-6 py-4">${cust.bills.length} services</td>
    </tr>
  `).join('') || '<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No customers</td></tr>';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}



