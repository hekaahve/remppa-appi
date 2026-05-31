'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import type { Expense, ExpenseType, DeductionType, Project } from '@/types'
import { EXPENSE_TYPES, DEDUCTION_TYPES } from '@/types'
import { deleteExpenseAction } from '@/app/actions/expenses'
import { signOut } from 'next-auth/react'
import EntryModal, { type ModalMode } from './EntryModal'
import NewProjectModal from './NewProjectModal'

interface Props {
  projects: Project[]
  activeProject: string
  expenses: Expense[]
  userEmail: string
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

const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  urakoitsija: 'bg-blue-100 text-blue-700',
  materiaali: 'bg-gray-100 text-gray-600',
  suunnittelu: 'bg-purple-100 text-purple-700',
}

const DEDUCTION_TYPE_COLORS: Record<DeductionType, string> = {
  veronpalautus: 'bg-emerald-100 text-emerald-700',
  myynti: 'bg-teal-100 text-teal-700',
  velanmaksu: 'bg-orange-100 text-orange-700',
}

function calcHouseholdDeduction(laborCosts: number): number {
  const rawDeduction = laborCosts * 0.35
  const selfPay = 150 // omavastuuosuus per person per year
  return Math.min(Math.max(0, rawDeduction - selfPay), 2250)
}

function formatEuro(value: number): string {
  return (
    value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
  )
}

function isExpenseType(type: string): type is ExpenseType {
  return (EXPENSE_TYPES as string[]).includes(type)
}

function isDeductionType(type: string): type is DeductionType {
  return (DEDUCTION_TYPES as string[]).includes(type)
}

export default function ProjectView({ projects, activeProject, expenses, userEmail }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<ModalMode>('expense')
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Expense | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isStartState = activeProject === 'start'

  // Split into expenses (positive) and deductions (negative)
  const positiveExpenses = expenses.filter((e) => e.amount >= 0)
  const deductions = expenses.filter((e) => e.amount < 0)

  // Summary calculations
  const totalExpenses = positiveExpenses.reduce((sum, e) => sum + e.amount, 0)
  const totalDeductions = deductions.reduce((sum, e) => sum + e.amount, 0) // negative
  const netTotal = totalExpenses + totalDeductions
  const laborCosts = positiveExpenses
    .filter((e) => e.type === 'urakoitsija')
    .reduce((sum, e) => sum + e.amount, 0)
  const householdDeduction = calcHouseholdDeduction(laborCosts)

  function openModal(mode: ModalMode, entry?: Expense) {
    setModalMode(mode)
    setEditingEntry(entry ?? null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingEntry(null)
  }

  function confirmDelete(id: string) {
    setDeletingId(id)
  }

  function cancelDelete() {
    setDeletingId(null)
  }

  function executeDelete() {
    if (!deletingId) return
    startTransition(async () => {
      await deleteExpenseAction(activeProject, deletingId)
      setDeletingId(null)
    })
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="flex w-60 flex-shrink-0 flex-col bg-emerald-900 text-white">
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-xl">🏠</span>
          <span className="text-base font-semibold tracking-tight">Remppaappi</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Projektit
          </p>
          {projects.map((project) => {
            const isActive = project.name === activeProject
            return (
              <Link
                key={project.name}
                href={`/project/${encodeURIComponent(project.name)}`}
                className={`mb-0.5 block truncate rounded-lg px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-emerald-700 font-medium text-white'
                    : 'text-emerald-100 hover:bg-emerald-800'
                }`}
              >
                {project.name}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-emerald-800 p-2">
          <button
            onClick={() => setShowNewProjectModal(true)}
            className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-800"
          >
            <span>＋</span> Uusi projekti
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-800"
          >
            <span>↪</span> Kirjaudu ulos
          </button>
          <p className="mt-2 truncate px-3 text-xs text-emerald-500">{userEmail}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {isStartState ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-4 text-5xl">🏗️</div>
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Ei vielä projekteja</h2>
            <p className="mb-6 text-sm text-gray-500">
              Luo ensimmäinen remppa aloittaaksesi kulujen seurannan.
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Luo ensimmäinen projekti
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            {/* Page header */}
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <h1 className="text-lg font-semibold text-gray-900">{activeProject}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal('deduction')}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  − Lisää vähennys
                </button>
                <button
                  onClick={() => openModal('expense')}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
                >
                  + Lisää kulu
                </button>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4 bg-white px-6 py-4 shadow-sm">
              <SummaryCard
                title="Kulut yhteensä"
                value={formatEuro(totalExpenses)}
                valueColor="text-gray-900"
              />
              <SummaryCard
                title="Vähennykset"
                value={formatEuro(Math.abs(totalDeductions))}
                valueColor="text-red-600"
              />
              <SummaryCard
                title="Urakoitsijakulut"
                value={formatEuro(laborCosts)}
                valueColor="text-blue-600"
                subtitle="kotitalousvähennys lasketaan tästä"
              />
              <SummaryCard
                title="Kotitalousvähennys"
                value={formatEuro(householdDeduction)}
                valueColor="text-emerald-700"
                subtitle="35% − 150 € omavastuuosuus, max 2 250 €/hlö"
              />
            </div>

            <div className="px-6 py-4 space-y-6">
              {/* Expenses table */}
              <ExpenseTable
                title="Kulut"
                rows={positiveExpenses}
                deletingId={deletingId}
                isPending={isPending}
                onEdit={(e) => openModal('expense', e)}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                onExecuteDelete={executeDelete}
                renderTypeBadge={(type) =>
                  isExpenseType(type) ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_TYPE_COLORS[type]}`}>
                      {EXPENSE_TYPE_LABELS[type]}
                    </span>
                  ) : null
                }
                emptyLabel="Ei kuluja. Lisää ensimmäinen kulu →"
                onEmpty={() => openModal('expense')}
                totalLabel="Kulut yhteensä"
                total={totalExpenses}
                showPerformer
              />

              {/* Deductions table */}
              <ExpenseTable
                title="Vähennykset"
                rows={deductions}
                deletingId={deletingId}
                isPending={isPending}
                onEdit={(e) => openModal('deduction', e)}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                onExecuteDelete={executeDelete}
                renderTypeBadge={(type) =>
                  isDeductionType(type) ? (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${DEDUCTION_TYPE_COLORS[type]}`}>
                      {DEDUCTION_TYPE_LABELS[type]}
                    </span>
                  ) : null
                }
                emptyLabel="Ei vähennyksiä."
                onEmpty={() => openModal('deduction')}
                totalLabel="Vähennykset yhteensä"
                total={totalDeductions}
                showPerformer={false}
                amountColor="text-red-600"
              />

              {/* Net total */}
              <div className="flex justify-end">
                <div className="rounded-xl border border-gray-200 bg-white px-6 py-3">
                  <span className="text-sm text-gray-500 mr-4">Netto (kulut − vähennykset)</span>
                  <span className="text-lg font-bold text-gray-900">{formatEuro(netTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <EntryModal
          project={activeProject}
          mode={modalMode}
          editing={editingEntry}
          onClose={closeModal}
        />
      )}
      {showNewProjectModal && (
        <NewProjectModal onClose={() => setShowNewProjectModal(false)} />
      )}
    </div>
  )
}

// ── Reusable table component ──────────────────────────────────────────────────

interface ExpenseTableProps {
  title: string
  rows: Expense[]
  deletingId: string | null
  isPending: boolean
  onEdit: (e: Expense) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onExecuteDelete: () => void
  renderTypeBadge: (type: string) => React.ReactNode
  emptyLabel: string
  onEmpty: () => void
  totalLabel: string
  total: number
  showPerformer: boolean
  amountColor?: string
}

function ExpenseTable({
  title,
  rows,
  deletingId,
  isPending,
  onEdit,
  onConfirmDelete,
  onCancelDelete,
  onExecuteDelete,
  renderTypeBadge,
  emptyLabel,
  onEmpty,
  totalLabel,
  total,
  showPerformer,
  amountColor = 'text-gray-800',
}: ExpenseTableProps) {
  function formatEuro(value: number): string {
    return (
      value.toLocaleString('fi-FI', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
    )
  }

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </h2>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center">
          <p className="text-sm text-gray-400">{emptyLabel}</p>
          <button
            onClick={onEmpty}
            className="mt-2 text-sm font-medium text-emerald-700 hover:underline"
          >
            Lisää →
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Kuvaus</th>
                {showPerformer && <th className="px-4 py-3">Tekijä</th>}
                <th className="px-4 py-3">Tyyppi</th>
                <th className="px-4 py-3 text-right">Summa</th>
                <th className="px-4 py-3 text-center">Maksettu</th>
                <th className="px-4 py-3">Päivämäärä</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`group transition hover:bg-gray-50 ${
                    deletingId === row.id ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-gray-800">{row.description}</td>
                  {showPerformer && (
                    <td className="px-4 py-3 text-gray-500">{row.performer}</td>
                  )}
                  <td className="px-4 py-3">{renderTypeBadge(row.type)}</td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${amountColor}`}>
                    {formatEuro(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.paid ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-600">
                        –
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.date}</td>
                  <td className="px-4 py-3">
                    {deletingId === row.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={onExecuteDelete}
                          disabled={isPending}
                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
                        >
                          Poista
                        </button>
                        <button
                          onClick={onCancelDelete}
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Peru
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          onClick={() => onEdit(row)}
                          className="rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => onConfirmDelete(row.id)}
                          className="rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          Poista
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                <td colSpan={showPerformer ? 3 : 2} className="px-4 py-3 text-gray-600">
                  {totalLabel}
                </td>
                <td className={`px-4 py-3 text-right font-mono ${amountColor}`}>
                  {formatEuro(total)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  title,
  value,
  valueColor,
  subtitle,
}: {
  title: string
  value: string
  valueColor: string
  subtitle?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <p className="text-xs font-medium text-gray-500">{title}</p>
      <p className={`mt-1 text-xl font-bold ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}
