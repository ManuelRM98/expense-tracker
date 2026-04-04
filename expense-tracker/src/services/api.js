const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Mappers — keep the frontend in camelCase, API in snake_case ───────────────

function toExpense(d) {
  return {
    id:       d.id,
    date:     d.date,
    desc:     d.desc,
    category: d.category,
    price:    d.price,
    cardPay:  d.card_pay,
    whoPaid:  d.who_paid,
    cardType: d.card_type,
    costType: d.cost_type,
  };
}

function fromExpense(d) {
  return {
    date:      d.date,
    desc:      d.desc,
    category:  d.category,
    price:     d.price,
    card_pay:  d.cardPay,
    who_paid:  d.whoPaid,
    card_type: d.cardType,
    cost_type: d.costType,
  };
}

function toSaving(d) {
  return {
    id:       d.id,
    date:     d.date,
    desc:     d.desc,
    category: d.category,
    price:    d.price,
    cardPay:  d.card_pay,
    cardType: d.card_type,
  };
}

function fromSaving(d) {
  return {
    date:      d.date,
    desc:      d.desc,
    category:  d.category,
    price:     d.price,
    card_pay:  d.cardPay,
    card_type: d.cardType,
  };
}

function toTemplate(d) {
  return {
    id:          d.id,
    name:        d.name,
    amount:      d.amount,
    category:    d.category,
    dayOfMonth:  d.day_of_month,
    whoPaid:     d.who_paid,
    cardPay:     d.card_pay,
    cardType:    d.card_type,
    isActive:    d.is_active,
    createdAt:   d.created_at,
  };
}

function fromTemplate(d) {
  return {
    name:         d.name,
    amount:       d.amount,
    category:     d.category,
    day_of_month: d.dayOfMonth,
    who_paid:     d.whoPaid,
    card_pay:     d.cardPay,
    card_type:    d.cardType,
  };
}

// ── Expenses ───────────────────────────────────────────────────────────────────

export async function getExpenses() {
  const data = await request('GET', '/expenses');
  return data.map(toExpense);
}

export async function createExpense(data) {
  const res = await request('POST', '/expenses', fromExpense(data));
  return toExpense(res);
}

export async function updateExpense(id, data) {
  const res = await request('PUT', `/expenses/${id}`, fromExpense(data));
  return toExpense(res);
}

export async function deleteExpense(id) {
  await request('DELETE', `/expenses/${id}`);
}

// ── Savings ────────────────────────────────────────────────────────────────────

export async function getSavings() {
  const data = await request('GET', '/savings');
  return data.map(toSaving);
}

export async function createSaving(data) {
  const res = await request('POST', '/savings', fromSaving(data));
  return toSaving(res);
}

export async function updateSaving(id, data) {
  const res = await request('PUT', `/savings/${id}`, fromSaving(data));
  return toSaving(res);
}

export async function deleteSaving(id) {
  await request('DELETE', `/savings/${id}`);
}

// ── Income Entries ─────────────────────────────────────────────────────────────

function toIncomeEntry(d) {
  return {
    id:             d.id,
    monthKey:       d.month_key,
    incomeType:     d.income_type,
    description:    d.description,
    currency:       d.currency,
    originalAmount: d.original_amount,
    exchangeRate:   d.exchange_rate,
    amountCop:      d.amount_cop,
  };
}

function fromIncomeEntry(d) {
  return {
    month_key:       d.monthKey,
    income_type:     d.incomeType,
    description:     d.description,
    currency:        d.currency,
    original_amount: d.originalAmount ?? null,
    exchange_rate:   d.exchangeRate ?? null,
    amount_cop:      d.amountCop,
  };
}

export async function getIncomeEntries(monthKey) {
  const data = await request('GET', `/income?month_key=${monthKey}`);
  return data.map(toIncomeEntry);
}

export async function getAllIncomeEntries(year) {
  const data = await request('GET', `/income?year=${year}`);
  return data.map(toIncomeEntry);
}

export async function createIncomeEntry(data) {
  const res = await request('POST', '/income', fromIncomeEntry(data));
  return toIncomeEntry(res);
}

export async function updateIncomeEntry(id, data) {
  const res = await request('PUT', `/income/${id}`, fromIncomeEntry(data));
  return toIncomeEntry(res);
}

export async function deleteIncomeEntry(id) {
  await request('DELETE', `/income/${id}`);
}

// ── Global Config ──────────────────────────────────────────────────────────────

export async function getConfig() {
  return request('GET', '/config');   // [{ key, value }]
}

export async function setConfig(key, value) {
  return request('PUT', `/config/${key}`, { value: String(value) });
}

// ── Expense categories ─────────────────────────────────────────────────────────

export async function getExpenseCategories() {
  return request('GET', '/categories/expenses');
}

export async function addExpenseCategory(name) {
  return request('POST', '/categories/expenses', { name });
}

export async function removeExpenseCategory(name) {
  return request('DELETE', `/categories/expenses/${encodeURIComponent(name)}`);
}

// ── Saving categories ──────────────────────────────────────────────────────────

export async function getSavingCategories() {
  return request('GET', '/categories/savings');
}

export async function addSavingCategory(name) {
  return request('POST', '/categories/savings', { name });
}

export async function removeSavingCategory(name) {
  return request('DELETE', `/categories/savings/${encodeURIComponent(name)}`);
}

// ── Card types ─────────────────────────────────────────────────────────────────

export async function getCardTypes() {
  return request('GET', '/cards');
}

export async function addCardType(name) {
  return request('POST', '/cards', { name });
}

export async function removeCardType(name) {
  return request('DELETE', `/cards/${encodeURIComponent(name)}`);
}

// ── Fixed expense templates ────────────────────────────────────────────────────

export async function getTemplates() {
  const data = await request('GET', '/fixed-expenses');
  return data.map(toTemplate);
}

export async function createTemplate(data) {
  const res = await request('POST', '/fixed-expenses', fromTemplate(data));
  return toTemplate(res);
}

export async function updateTemplate(id, data) {
  const res = await request('PUT', `/fixed-expenses/${id}`, fromTemplate(data));
  return toTemplate(res);
}

export async function deleteTemplate(id) {
  await request('DELETE', `/fixed-expenses/${id}`);
}

export async function toggleTemplate(id) {
  const res = await request('PATCH', `/fixed-expenses/${id}/toggle`);
  return toTemplate(res);
}

export async function generateForMonth(monthKey) {
  const data = await request('POST', `/fixed-expenses/generate/${monthKey}`);
  return data.map(toExpense);   // Returns complete expense objects with IDs from the DB
}

// ── Budget Allocation ──────────────────────────────────────────────────────────

function toBudget(d) {
  return {
    monthKey:    d.month_key,
    fixedPct:    d.fixed_pct,
    variablePct: d.variable_pct,
    savingsPct:  d.savings_pct,
    isOverride:  d.is_override,
  };
}

function fromBudget(d) {
  return {
    fixed_pct:    d.fixedPct,
    variable_pct: d.variablePct,
    savings_pct:  d.savingsPct,
  };
}

export async function getDefaultBudget() {
  const data = await request('GET', '/budget/default');
  return toBudget(data);
}

export async function setDefaultBudget(pcts) {
  const data = await request('PUT', '/budget/default', fromBudget(pcts));
  return toBudget(data);
}

export async function getMonthBudget(monthKey) {
  const data = await request('GET', `/budget/${monthKey}`);
  return toBudget(data);
}

export async function setMonthBudget(monthKey, pcts) {
  const data = await request('PUT', `/budget/${monthKey}`, fromBudget(pcts));
  return toBudget(data);
}

export async function deleteMonthBudget(monthKey) {
  await request('DELETE', `/budget/${monthKey}`);
}
