const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

let bills = [];
let inventory = [];
let expenses = [];

app.post('/api/bills', (req, res) => {
  const newBill = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  bills.unshift(newBill);
  res.json(newBill);
});

app.get('/api/bills', (req, res) => res.json(bills.slice(0, 100)));

app.post('/api/inventory', (req, res) => {
  const newItem = { id: Date.now(), ...req.body };
  inventory.push(newItem);
  res.json(newItem);
});

app.get('/api/inventory', (req, res) => res.json(inventory));

app.delete('/api/inventory/:id', (req, res) => {
  inventory = inventory.filter(i => i.id != req.params.id);
  res.json({success: true});
});

app.post('/api/expenses', (req, res) => {
  const newExpense = { id: Date.now(), ...req.body, date: new Date().toISOString() };
  expenses.push(newExpense);
  res.json(newExpense);
});

app.get('/api/expenses', (req, res) => res.json(expenses));

app.get('/api/dashboard', (req, res) => {
  const totalSales = bills.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const lowStock = inventory.filter(i => (i.quantity || 0) < 5).length;
  res.json({ totalSales, todayRevenue: 0, totalExpenses, lowStock });
});

app.post('/api/login', (req, res) => {
  if (req.body.username === 'admin' && req.body.password === '1234') {
    res.json({ success: true, token: 'ok' });
  } else {
    res.status(401).json({ success: false });
  }
});

app.listen(process.env.PORT || 3000);
