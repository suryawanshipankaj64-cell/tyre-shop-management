const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read JSON file
function readData(file) {
  try {
    const dataPath = path.join(DATA_DIR, file);
    if (fs.existsSync(dataPath)) {
      const data = fs.readFileSync(dataPath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    return [];
  }
}

// Helper: Write JSON file
function writeData(file, data) {
  const dataPath = path.join(DATA_DIR, file);
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
}

// Login API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '1234') {
    res.json({ success: true, token: 'tyreshop-admin-token' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Bills CRUD
app.get('/api/bills', (req, res) => res.json(readData('bills.json')));
app.post('/api/bills', (req, res) => {
  const bills = readData('bills.json');
  const newBill = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  bills.unshift(newBill);
  writeData('bills.json', bills);
  res.json(newBill);
});

// Inventory CRUD
app.get('/api/inventory', (req, res) => res.json(readData('inventory.json')));
app.post('/api/inventory', (req, res) => {
  const inventory = readData('inventory.json');
  const newItem = { id: Date.now(), ...req.body };
  inventory.push(newItem);
  writeData('inventory.json', inventory);
  res.json(newItem);
});
app.put('/api/inventory/:id', (req, res) => {
  const inventory = readData('inventory.json');
  const id = parseInt(req.params.id);
  const index = inventory.findIndex(item => item.id === id);
  if (index !== -1) {
    inventory[index] = { ...inventory[index], ...req.body };
    writeData('inventory.json', inventory);
    res.json(inventory[index]);
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});
app.delete('/api/inventory/:id', (req, res) => {
  const inventory = readData('inventory.json');
  const id = parseInt(req.params.id);
  const newInv = inventory.filter(item => item.id !== id);
  writeData('inventory.json', newInv);
  res.json({ success: true });
});

// Expenses CRUD
app.get('/api/expenses', (req, res) => res.json(readData('expenses.json')));
app.post('/api/expenses', (req, res) => {
  const expenses = readData('expenses.json');
  const newExpense = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  expenses.push(newExpense);
  writeData('expenses.json', expenses);
  res.json(newExpense);
});

app.delete('/api/expenses/:id', (req, res) => {
  const expenses = readData('expenses.json');
  const id = parseInt(req.params.id);
  const newExp = expenses.filter(item => item.id !== id);
  writeData('expenses.json', newExp);
  res.json({ success: true });
});

// Dashboard stats
app.get('/api/dashboard', (req, res) => {
  const bills = readData('bills.json');
  const expensesList = readData('expenses.json');
  const inventory = readData('inventory.json');
  const totalSales = bills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  const today = new Date().toDateString();
  const todayRevenue = bills.filter(b => new Date(b.date).toDateString() === today)
    .reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  const totalExpenses = expensesList.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const lowStock = inventory.filter(i => parseInt(i.quantity || 0) < 5).length;
  res.json({ totalSales, todayRevenue, totalExpenses, lowStock });
});

// Reports (bills filtered by date)
app.get('/api/reports', (req, res) => {
  const { dateFrom, dateTo } = req.query;
  let bills = readData('bills.json');
  if (dateFrom) bills = bills.filter(b => new Date(b.date) >= new Date(dateFrom));
  if (dateTo) bills = bills.filter(b => new Date(b.date) <= new Date(dateTo));
  const totalRevenue = bills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0);
  res.json({ bills, totalRevenue });
});

// Customers (aggregate from bills)
app.get('/api/customers', (req, res) => {
  const { search } = req.query;
  const bills = readData('bills.json');
  const customers = {};
    bills.forEach(bill => {
    if (!bill.customerName || !bill.vehicle) return;
    const key = `${bill.customerName.toLowerCase()}-${bill.vehicle.toLowerCase()}`;

    if (!customers[key]) {
      customers[key] = {
        name: bill.customerName,
        vehicle: bill.vehicle,
        phone: bill.phone,
        bills: [],
        totalSpent: 0
      };
    }
    customers[key].bills.push(bill);
    customers[key].totalSpent += parseFloat(bill.amount || 0);
  });
  let result = Object.values(customers);
  if (search) {
    const q = search.toLowerCase();
      result = result.filter(c => 
      (c.name || '').toLowerCase().includes(q) || 
      (c.vehicle || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );

  }
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

