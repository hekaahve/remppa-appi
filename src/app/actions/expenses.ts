'use server'

import { auth } from '@/auth'
import { addExpense, updateExpense, deleteExpense, createProject } from '@/lib/sheets'
import { revalidatePath } from 'next/cache'
import type { Expense } from '@/types'

async function requireAuth() {
  const session = await auth()
  if (!session?.user) throw new Error('Authentication required')
  return session
}

export async function addExpenseAction(project: string, expense: Omit<Expense, 'id'>) {
  await requireAuth()
  await addExpense(project, expense)
  revalidatePath('/', 'layout')
}

export async function updateExpenseAction(project: string, id: string, expense: Omit<Expense, 'id'>) {
  await requireAuth()
  await updateExpense(project, id, expense)
  revalidatePath('/', 'layout')
}

export async function deleteExpenseAction(project: string, id: string) {
  await requireAuth()
  await deleteExpense(project, parseInt(id))
  revalidatePath('/', 'layout')
}

export async function createProjectAction(name: string) {
  await requireAuth()
  await createProject(name)
  revalidatePath('/', 'layout')
}
