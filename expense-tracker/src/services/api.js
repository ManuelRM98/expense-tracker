// Default to the same host the app was opened from (so it works from any device on
// the LAN: phone, tablet, another laptop). Set VITE_API_URL to override (e.g. a fixed
// or public host). On the host machine this still resolves to http://localhost:8000.
const BASE_URL =
  import.meta.env.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:8000`;

// ── HTTP helper ────────────────────────────────────────────────────────────────

// Lazily import supabase to avoid a circular dependency at module load time.
// The auth context has already called supabase.auth.getSession() before any
// data call reaches here, so the session is always available.
async function getAccessToken() {
  const { supabase } = await import('./supabase.js');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };

  // AUTH-01: Bearer token replaces the old X-API-Key
  const token = await getAccessToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);

  // AUTH-01: 401 means the session is gone — sign out and redirect to /login
  if (res.status === 401) {
    const { supabase } = await import('./supabase.js');
    await supabase.auth.signOut();
    window.location.href = '/login';
    throw new Error('Session expired. Please sign in again.');
  }

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
    color:      d.color ?? null,
  };
}

// Category objects — both expense and saving categories share the same shape
function toCategory(d) {
  return {
    name:  d.name,
    color: d.color ?? null,
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
  const data = await request('GET', '/categories/expenses');
  return data.map(toCategory);
}

/** Accepts optional color; returns [{name, color}] */
export async function addExpenseCategory(name, color = null) {
  const data = await request('POST', '/categories/expenses', { name, color });
  return data.map(toCategory);
}

export async function removeExpenseCategory(name) {
  const data = await request('DELETE', `/categories/expenses/${encodeURIComponent(name)}`);
  return data.map(toCategory);
}

/** PUT /categories/expenses/{name} body {new_name} → [{name, color}] */
export async function renameExpenseCategory(oldName, newName) {
  const data = await request('PUT', `/categories/expenses/${encodeURIComponent(oldName)}`, { new_name: newName });
  return data.map(toCategory);
}

/** PATCH /categories/expenses/{name} body {color} → [{name, color}]; null resets to default */
export async function updateExpenseCategoryColor(name, color) {
  const data = await request('PATCH', `/categories/expenses/${encodeURIComponent(name)}`, { color });
  return data.map(toCategory);
}

// ── Saving categories ──────────────────────────────────────────────────────────

export async function getSavingCategories() {
  const data = await request('GET', '/categories/savings');
  return data.map(toCategory);
}

/** Accepts optional color; returns [{name, color}] */
export async function addSavingCategory(name, color = null) {
  const data = await request('POST', '/categories/savings', { name, color });
  return data.map(toCategory);
}

export async function removeSavingCategory(name) {
  const data = await request('DELETE', `/categories/savings/${encodeURIComponent(name)}`);
  return data.map(toCategory);
}

/** PUT /categories/savings/{name} body {new_name} → [{name, color}] */
export async function renameSavingCategory(oldName, newName) {
  const data = await request('PUT', `/categories/savings/${encodeURIComponent(oldName)}`, { new_name: newName });
  return data.map(toCategory);
}

/** PATCH /categories/savings/{name} body {color} → [{name, color}]; null resets to default */
export async function updateSavingCategoryColor(name, color) {
  const data = await request('PATCH', `/categories/savings/${encodeURIComponent(name)}`, { color });
  return data.map(toCategory);
}

// ── Card types ─────────────────────────────────────────────────────────────────

export async function getCardTypes() {
  const data = await request('GET', '/cards');
  return data.map(toCard);
}

export async function addCardType(name) {
  const data = await request('POST', '/cards', { name, cut_off_day: null, color: null });
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

export async function updateCardColor(name, color) {
  const data = await request('PATCH', `/cards/${encodeURIComponent(name)}`, { color });
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

// ── Account (AUTH-01) ──────────────────────────────────────────────────────────

function toAccount(d) {
  return {
    id:          d.id,
    email:       d.email,
    displayName: d.display_name ?? null,
    createdAt:   d.created_at,
  };
}

/**
 * GET /account/me — also triggers first-login provisioning (seed categories/cards).
 * Call once after login before loading any dashboard data.
 */
export async function getAccountMe() {
  const data = await request('GET', '/account/me');
  return toAccount(data);
}

/** PUT /account/me { display_name } → updated profile */
export async function updateAccountMe(displayName) {
  const data = await request('PUT', '/account/me', { display_name: displayName });
  return toAccount(data);
}

/**
 * DELETE /account/me — permanently deletes all user data and the Supabase auth identity.
 * Returns the response body (with `auth_deleted` field) on 200, or null on 204.
 * 204: both local data and auth identity deleted successfully.
 * 200: local data deleted but auth identity removal failed (auth_deleted: false).
 */
export async function deleteAccountMe() {
  // request() already returns null for 204 and parsed JSON for 200.
  return request('DELETE', '/account/me');
}
