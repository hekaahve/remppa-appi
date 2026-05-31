export type ExpenseType = 'urakoitsija' | 'materiaali' | 'suunnittelu'
export type DeductionType = 'veronpalautus' | 'myynti' | 'velanmaksu'
export type EntryType = ExpenseType | DeductionType

export const EXPENSE_TYPES: ExpenseType[] = ['urakoitsija', 'materiaali', 'suunnittelu']
export const DEDUCTION_TYPES: DeductionType[] = ['veronpalautus', 'myynti', 'velanmaksu']

export interface Expense {
  id: string
  description: string
  performer: string
  type: EntryType
  amount: number // positive = expense, negative = deduction
  paid: boolean
  date: string
}

export interface Project {
  name: string
  sheetId: number
}
