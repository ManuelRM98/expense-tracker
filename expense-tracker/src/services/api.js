const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

/** Part C.4: send X-API-Key header on every request if VITE_API_KEY is set */
const API_KEY = import.meta.env.VITE_API_KEY || null;

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  // Part C.4: include X-API-Key if configured via VITE_API_KEY env var
  if (API_KEY) headers['X-API-Key'] = API_KEY;
  const opts = { method, headers };
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
    id:           d.id,
    date:         d.date,
    desc:         d.desc,
    category:     d.category,
    price:        d.price,
    cardPay:      d.card_pay,
    whoPaid:      d.who_paid,
    cardType:     d.card_type,
    costType:     d.cost_type,
    billingMonth: d.billing_month ?? null,
  };
}

function fromExpense(d) {
  return {
    date:          d.date,
    desc:          d.desc,
    category:      d.category,
    price:         d.price,
    card_pay:      d.cardPay,
    who_paid:      d.whoPaid,
    card_type:     d.cardType,
    cost_type:     d.costType,
    // Part C.3: send null (never "") — server validates ^\d{4}-\d{2}$ and rejects empty string
    billing_month: d.billingMonth || null,
  };
}

function toCard(d) {
  return {
    name:       d.name,
    cutOffDay:  d.cut_off_day ?? null,
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

/**
 * PERF-03: accepts an optional monthKey ("YYYY-MM") to fetch only that month.
 * When omitted, fetches all expenses (legacy — avoid for new call sites).
 */
export async function getExpenses(monthKey) {
  const path = monthKey ? `/expenses?month=${monthKey}` : '/expenses';
  const data = await request('GET', path);
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

/**
 * PERF-03: accepts an optional monthKey ("YYYY-MM") to fetch only that month.
 * When omitted, fetches all savings (legacy — avoid for new call sites).
 */
export async function getSavings(monthKey) {
  const path = monthKey ? `/savings?month=${monthKey}` : '/savings';
  const data = await request('GET', path);
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

// ── People (distinct who_paid values) ─────────────────────────────────────────

/** Part C.1: GET /expenses/people → string[] of distinct who_paid values */
export async function getPeople() {
  return request('GET', '/expenses/people');
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

/** Part C.2: PUT /categories/expenses/{name} body {new_name} → string[] */
export async function renameExpenseCategory(oldName, newName) {
  return request('PUT', `/categories/expenses/${encodeURIComponent(oldName)}`, { new_name: newName });
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

/** Part C.2: PUT /categories/savings/{name} body {new_name} → string[] */
export async function renameSavingCategory(oldName, newName) {
  return request('PUT', `/categories/savings/${encodeURIComponent(oldName)}`, { new_name: newName });
}

// ── Card types ─────────────────────────────────────────────────────────────────

export async function getCardTypes() {
  const data = await request('GET', '/cards');
  return data.map(toCard);
}

export async function addCardType(name) {
  const data = await request('POST', '/cards', { name, cut_off_day: null });
  return data.map(toCard);
}

export async function removeCardType(name) {
  const data = await request('DELETE', `/cards/${encodeURIComponent(name)}`);
  return data.map(toCard);
}

export async function updateCardCutOff(name, cutOffDay) {
  const data = await request('PATCH', `/cards/${encodeURIComponent(name)}`, { cut_off_day: cutOffDay });
  return data.map(toCard);
}

/** Part C.2: PUT /cards/{name}/rename body {new_name} → CardOut[] */
export async function renameCard(oldName, newName) {
  const data = await request('PUT', `/cards/${encodeURIComponent(oldName)}/rename`, { new_name: newName });
  return data.map(toCard);
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

// ── Analytics ─────────────────────────────────────────────────────────────────

function toTrendPoint(d) {
  return {
    monthKey:      d.month_key,
    totalExpenses: d.total_expenses,
    totalSavings:  d.total_savings,
  };
}

/**
 * PERF-03: GET /analytics/trend?months=N
 * Returns TrendPoint[] { monthKey, totalExpenses, totalSavings }
 * respecting billing_month server-side (PERF-02 / BUG-07 fix).
 */
export async function getTrend(months = 12) {
  const data = await request('GET', `/analytics/trend?months=${months}`);
  return data.map(toTrendPoint);
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

export async function getAllBudgetOverrides() {
  const data = await request('GET', '/budget/overrides');
  return data.map(toBudget);
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

// ── Debts ──────────────────────────────────────────────────────────────────────

function toDebtPayment(d) {
  return {
    id:     d.id,
    debtId: d.debt_id,
    amount: d.amount,
    date:   d.date,
    note:   d.note,
  };
}

function toDebt(d) {
  return {
    id:              d.id,
    direction:       d.direction,
    person:          d.person,
    description:     d.description,
    amount:          d.amount,
    linkedExpenseId: d.linked_expense_id ?? null,
    isSettled:       d.is_settled,
    createdDate:     d.created_date,
    settledDate:     d.settled_date ?? null,
    payments:        (d.payments ?? []).map(toDebtPayment),
    totalPaid:       d.total_paid,
    totalRemaining:  d.total_remaining,
  };
}

function fromDebtCreate(d) {
  return {
    direction:         d.direction,
    person:            d.person,
    description:       d.description,
    amount:            d.amount,
    linked_expense_id: d.linkedExpenseId ?? null,
    created_date:      d.createdDate,
    is_settled:        d.isSettled ?? false,
    settled_date:      d.settledDate ?? null,
  };
}

function fromDebtUpdate(d) {
  return {
    person:       d.person,
    description:  d.description,
    amount:       d.amount,
    is_settled:   d.isSettled,
    settled_date: d.settledDate ?? null,
  };
}

export async function getDebts() {
  const data = await request('GET', '/debts');
  return data.map(toDebt);
}

export async function createDebt(data) {
  const res = await request('POST', '/debts', fromDebtCreate(data));
  return toDebt(res);
}

export async function updateDebt(id, data) {
  const res = await request('PUT', `/debts/${id}`, fromDebtUpdate(data));
  return toDebt(res);
}

export async function deleteDebt(id) {
  await request('DELETE', `/debts/${id}`);
}

export async function addDebtPayment(debtId, data) {
  const res = await request('POST', `/debts/${debtId}/payments`, {
    amount: data.amount,
    date:   data.date,
    note:   data.note ?? '',
  });
  return toDebt(res);
}

export async function updateDebtPayment(debtId, paymentId, data) {
  const res = await request('PATCH', `/debts/${debtId}/payments/${paymentId}`, {
    amount: data.amount,
    date:   data.date,
    note:   data.note ?? '',
  });
  return toDebt(res);
}

export async function deleteDebtPayment(debtId, paymentId) {
  const res = await request('DELETE', `/debts/${debtId}/payments/${paymentId}`);
  return toDebt(res);
}
