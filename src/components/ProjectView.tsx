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
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    <div className="relative flex h-full">
      {/* Mobile overlay behind the sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — static on desktop; on mobile drops down from the top */}
      <aside
        className={`fixed inset-x-0 top-0 z-40 flex max-h-[85vh] w-full flex-shrink-0 transform flex-col rounded-b-2xl bg-emerald-900 text-white shadow-xl transition-transform duration-200 md:static md:max-h-none md:w-60 md:translate-y-0 md:rounded-none md:shadow-none ${
          sidebarOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="text-base font-semibold tracking-tight">Remppaappi</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-emerald-300 hover:bg-emerald-800 md:hidden"
            aria-label="Sulje valikko"
          >
            ✕
          </button>
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
                onClick={() => setSidebarOpen(false)}
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
            onClick={() => {
              setSidebarOpen(false)
              setShowNewProjectModal(true)
            }}
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
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {isStartState ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
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
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex min-w-0 items-center gap-2">
                {/* Hamburger — mobile only */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="-ml-1 rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                  aria-label="Avaa valikko"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <h1 className="truncate text-base font-semibold text-gray-900 sm:text-lg">
                  {activeProject}
                </h1>
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={() => openModal('deduction')}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:px-4"
                >
                  <span className="sm:hidden">−</span>
                  <span className="hidden sm:inline">− Lisää vähennys</span>
                </button>
                <button
                  onClick={() => openModal('expense')}
                  className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 sm:px-4"
                >
                  <span className="sm:hidden">+ Kulu</span>
                  <span className="hidden sm:inline">+ Lisää kulu</span>
                </button>
              </div>
            </div>

            {/* Summary cards — 2×2 on mobile, 4 across on desktop */}
            <div className="grid grid-cols-2 gap-3 bg-white px-4 py-4 shadow-sm sm:gap-4 sm:px-6 lg:grid-cols-4">
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

            <div className="space-y-6 px-4 py-4 sm:px-6">
              {/* Expenses */}
              <ExpenseTable
                title="Kulut"
                rows={positiveExpenses}
                deletingId={deletingId}
                isPending={isPending}
                onEdit={(e) => openModal('expense', e)}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                onExecuteDelete={executeDelete}
                getTypeLabel={(type) => (isExpenseType(type) ? EXPENSE_TYPE_LABELS[type] : type)}
                getTypeColor={(type) =>
                  isExpenseType(type) ? EXPENSE_TYPE_COLORS[type] : 'bg-gray-100 text-gray-600'
                }
                emptyLabel="Ei kuluja. Lisää ensimmäinen kulu →"
                onEmpty={() => openModal('expense')}
                totalLabel="Kulut yhteensä"
                total={totalExpenses}
                showPerformer
              />

              {/* Deductions */}
              <ExpenseTable
                title="Vähennykset"
                rows={deductions}
                deletingId={deletingId}
                isPending={isPending}
                onEdit={(e) => openModal('deduction', e)}
                onConfirmDelete={confirmDelete}
                onCancelDelete={cancelDelete}
                onExecuteDelete={executeDelete}
                getTypeLabel={(type) => (isDeductionType(type) ? DEDUCTION_TYPE_LABELS[type] : type)}
                getTypeColor={(type) =>
                  isDeductionType(type) ? DEDUCTION_TYPE_COLORS[type] : 'bg-gray-100 text-gray-600'
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
                <div className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 sm:w-auto sm:gap-4">
                  <span className="text-sm text-gray-500">Netto (kulut − vähennykset)</span>
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

// ── Reusable expenses/deductions list ─────────────────────────────────────────
// Renders a table on >= md screens and a stacked card list on small screens.

interface ExpenseTableProps {
  title: string
  rows: Expense[]
  deletingId: string | null
  isPending: boolean
  onEdit: (e: Expense) => void
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
  onExecuteDelete: () => void
  getTypeLabel: (type: string) => string
  getTypeColor: (type: string) => string
  emptyLabel: string
  onEmpty: () => void
  totalLabel: string
  total: number
  showPerformer: boolean
  amountColor?: string
}

function PaidBadge({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs text-emerald-700">
      ✓
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs text-amber-600">
      –
    </span>
  )
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
  getTypeLabel,
  getTypeColor,
  emptyLabel,
  onEmpty,
  totalLabel,
  total,
  showPerformer,
  amountColor = 'text-gray-800',
}: ExpenseTableProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h2>

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
        <>
          {/* ── Desktop / tablet: table ─────────────────────────────── */}
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
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
                    {showPerformer && <td className="px-4 py-3 text-gray-500">{row.performer}</td>}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(row.type)}`}
                      >
                        {getTypeLabel(row.type)}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-medium ${amountColor}`}>
                      {formatEuro(row.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <PaidBadge paid={row.paid} />
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

          {/* ── Mobile: compact card list ───────────────────────────── */}
          <div className="space-y-1 md:hidden">
            {rows.map((row) => (
              <div
                key={row.id}
                className={`relative rounded-xl border bg-white px-2.5 py-1.5 ${
                  deletingId === row.id ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-gray-800">{row.description}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getTypeColor(row.type)}`}
                      >
                        {getTypeLabel(row.type)}
                      </span>
                      <PaidBadge paid={row.paid} />
                      {showPerformer && row.performer && (
                        <span className="truncate text-xs text-gray-400">{row.performer}</span>
                      )}
                      {row.date && <span className="text-xs text-gray-400">{row.date}</span>}
                    </div>
                  </div>

                  <span className={`flex-shrink-0 font-mono text-sm font-semibold ${amountColor}`}>
                    {formatEuro(row.amount)}
                  </span>

                  {/* Three-dots menu trigger */}
                  <button
                    onClick={() => setOpenMenuId(openMenuId === row.id ? null : row.id)}
                    className="-mr-2 flex-shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Toiminnot"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="1.6" />
                      <circle cx="12" cy="12" r="1.6" />
                      <circle cx="12" cy="19" r="1.6" />
                    </svg>
                  </button>
                </div>

                {/* Dropdown menu */}
                {openMenuId === row.id && deletingId !== row.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                    <div className="absolute right-3 top-12 z-20 w-36 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                      <button
                        onClick={() => {
                          setOpenMenuId(null)
                          onEdit(row)
                        }}
                        className="block w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuId(null)
                          onConfirmDelete(row.id)
                        }}
                        className="block w-full border-t border-gray-100 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Poista
                      </button>
                    </div>
                  </>
                )}

                {/* Inline delete confirmation */}
                {deletingId === row.id && (
                  <div className="mt-3 flex items-center gap-2 border-t border-red-100 pt-3">
                    <button
                      onClick={onExecuteDelete}
                      disabled={isPending}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      Vahvista poisto
                    </button>
                    <button
                      onClick={onCancelDelete}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Peru
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Mobile total */}
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 font-semibold">
              <span className="text-sm text-gray-600">{totalLabel}</span>
              <span className={`font-mono ${amountColor}`}>{formatEuro(total)}</span>
            </div>
          </div>
        </>
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
      <p className={`mt-1 text-lg font-bold sm:text-xl ${valueColor}`}>{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
    </div>
  )
}
