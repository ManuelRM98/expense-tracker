import { parseAmount } from './format';

/**
 * Creates an expense and its linked debts, splitting the expense into per-person
 * rows when someone owes the user money.
 *
 * Use case: you pay $800.000 on your card but $400.000 of it is your dad's share.
 * Recording it as a single row hides who actually spent what. So for every
 * "they_owe_me" debt we carve out a separate expense row attributed to that
 * person (who_paid = their name, price = the amount they owe), and the leftover
 * (price − total owed) stays as your own row. The rows always sum back to the
 * original price, so the card total still reconciles.
 *
 * "i_owe_them" debts don't split the expense (they paid, not you) — they just
 * link to your row, matching the previous behaviour.
 *
 * @param {object}   args.data        Expense payload (camelCase) with numeric `price`.
 * @param {Array}    args.debtEntries Raw debt entries from ExpenseModal.
 * @param {Function} args.addExpense  async (data) => created expense (with id).
 * @param {Function} args.addDebt     async (debt) => created debt.
 */
export async function createExpenseWithDebts({ data, debtEntries = [], addExpense, addDebt }) {
  const theyOweMe = debtEntries
    .filter(d => d.direction === 'they_owe_me')
    .map(d => ({ person: d.person.trim(), amount: parseAmount(String(d.amount)) }));
  const iOweThem = debtEntries.filter(d => d.direction === 'i_owe_them');

  // No "they_owe_me" debts → no split; keep the single full-price row.
  if (theyOweMe.length === 0) {
    const created = await addExpense(data);
    const expenseId = created?.id;
    for (const entry of iOweThem) {
      await addDebt({
        direction:       entry.direction,
        person:          entry.person.trim(),
        description:     data.desc,
        amount:          parseAmount(String(entry.amount)),
        linkedExpenseId: expenseId,
        createdDate:     data.date,
      });
    }
    return;
  }

  // Split path. Round to 2 decimals to avoid float drift (money is NUMERIC(14,2)).
  const totalOwed = theyOweMe.reduce((sum, d) => sum + d.amount, 0);
  const myShare = Number((data.price - totalOwed).toFixed(2));

  // Your leftover share — only when there's anything left after the others' parts.
  let myRowId = null;
  if (myShare > 0) {
    const mine = await addExpense({ ...data, price: myShare });
    myRowId = mine?.id;
  }

  // One attributed row + linked debt per person who owes you.
  for (const d of theyOweMe) {
    const personRow = await addExpense({ ...data, price: d.amount, whoPaid: d.person });
    await addDebt({
      direction:       'they_owe_me',
      person:          d.person,
      description:     data.desc,
      amount:          d.amount,
      linkedExpenseId: personRow?.id,
      createdDate:     data.date,
    });
  }

  // Any "i_owe_them" debts attach to your own row (or stay unlinked if you have none).
  for (const entry of iOweThem) {
    await addDebt({
      direction:       entry.direction,
      person:          entry.person.trim(),
      description:     data.desc,
      amount:          parseAmount(String(entry.amount)),
      linkedExpenseId: myRowId,
      createdDate:     data.date,
    });
  }
}
