'use client'

import { useState, useEffect, useTransition } from 'react'
import type { Expense, ExpenseType, DeductionType } from '@/types'
import { EXPENSE_TYPES, DEDUCTION_TYPES } from '@/types'
import { addExpenseAction, updateExpenseAction } from '@/app/actions/expenses'

export type ModalMode = 'expense' | 'deduction'

interface Props {
  project: string
  mode: ModalMode
  editing?: Expense | null
  onClose: () => void
}

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  urakoitsija: 'Urakoitsija',
  materiaali: 'Materiaali',
  suunnittelu: 'Suunnittelu',
}

const DEDUCTION_TYPE_LABELS: Record<DeductionType, string> = {
  veronpalautus: 'Veronpalautus',
  myynti: 'Myynti',
  velanmaksu: 'Velanmaksu',
}

function emptyEntry(mode: ModalMode): Omit<Expense, 'id'> {
  return {
    description: '',
    performer: '',
    type: mode === 'expense' ? 'materiaali' : 'veronpalautus',
    amount: 0,
    paid: false,
    date: '',
  }
}

export default function EntryModal({ project, mode, editing, onClose }: Props) {
  const [form, setForm] = useState<Omit<Expense, 'id'>>(emptyEntry(mode))
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (editing) {
      const { id, ...rest } = editing
      // Show deduction amounts as positive in the form
      setForm({ ...rest, amount: Math.abs(rest.amount) })
    } else {
      setForm(emptyEntry(mode))
    }
  }, [editing, mode])

  function updateField<K extends keyof Omit<Expense, 'id'>>(key: K, value: Omit<Expense, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      // Deductions are stored as negative amounts
      const storedAmount = mode === 'deduction' ? -Math.abs(form.amount) : Math.abs(form.amount)
      const entry: Omit<Expense, 'id'> = { ...form, amount: storedAmount }

      if (editing) {
        await updateExpenseAction(project, editing.id, entry)
      } else {
        await addExpenseAction(project, entry)
      }
      onClose()
    })
  }

  const isExpense = mode === 'expense'
  const title = isExpense
    ? editing ? 'Muokkaa kulua' : 'Lisää kulu'
    : editing ? 'Muokkaa vähennystä' : 'Lisää vähennys'

  const types = isExpense ? EXPENSE_TYPES : DEDUCTION_TYPES
  const typeLabels = isExpense ? EXPENSE_TYPE_LABELS : DEDUCTION_TYPE_LABELS

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 sm:items-center sm:p-4">
      <div className="flex h-full w-full flex-col bg-white shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-md sm:rounded-2xl">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Kuvaus *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={isExpense ? 'esim. Putkityöt, Rautakauppa...' : 'esim. Kotitalousvähennys, Kylpyamme myyty...'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Performer — only for expenses */}
          {isExpense && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Tekijä / laskuviite
              </label>
              <input
                type="text"
                value={form.performer}
                onChange={(e) => updateField('performer', e.target.value)}
                placeholder="esim. Miika, lasku 1.5..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          {/* Type + Amount side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Tyyppi *</label>
              <select
                value={form.type}
                onChange={(e) => updateField('type', e.target.value as ExpenseType | DeductionType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {types.map((t) => (
                  <option key={t} value={t}>
                    {(typeLabels as Record<string, string>)[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {isExpense ? 'Kulut (€) *' : 'Vähennys (€) *'}
              </label>
              <input
                type="number"
                required
                step="0.01"
                value={form.amount || ''}
                onChange={(e) => updateField('amount', parseFloat(e.target.value))}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          {/* Date + Paid side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Päivämäärä</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div className="flex flex-col justify-end pb-0.5">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.paid}
                  onChange={(e) => updateField('paid', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">Maksettu</span>
              </label>
            </div>
          </div>

          {/* Hint for contractor type */}
          {form.type === 'urakoitsija' && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              💡 Urakoitsijatöistä lasketaan kotitalousvähennys (35%, max 2 250 €/hlö/vuosi)
            </p>
          )}

          {/* Deduction indicator */}
          {!isExpense && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              Vähennys tallennetaan negatiivisena summana (−{form.amount > 0 ? form.amount.toLocaleString('fi-FI', { minimumFractionDigits: 2 }) : '0,00'} €)
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Peruuta
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {isPending
                ? 'Tallennetaan...'
                : editing
                ? 'Tallenna muutokset'
                : isExpense
                ? 'Lisää kulu'
                : 'Lisää vähennys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
