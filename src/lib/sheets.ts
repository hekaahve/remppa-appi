import { google } from 'googleapis'
import type { Expense, EntryType, Project } from '@/types'

const SHEETS_ID = process.env.GOOGLE_SHEETS_ID!

function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

export async function getProjects(): Promise<Project[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID })
  return (res.data.sheets ?? [])
    .filter((s) => !s.properties?.title?.startsWith('_'))
    .map((s) => ({
      name: s.properties?.title ?? '',
      sheetId: s.properties?.sheetId ?? 0,
    }))
}

export async function getExpenses(projectName: string): Promise<Expense[]> {
  const sheets = getSheetsClient()
  // Column layout: A=kuvaus, B=tekijä, C=kulut, D=tyyppi, E=maksettu, F=päivämäärä
  // Columns after F (old installment payment columns) are intentionally ignored.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEETS_ID,
    range: `${projectName}!A2:F`,
  })
  const rows = res.data.values ?? []
  return rows
    .map((row, index) => ({
      id: String(index + 2), // row 2 is the first data row (row 1 is the header)
      description: row[0] ?? '',
      performer: row[1] ?? '',
      amount: parseFloat((row[2] ?? '0').replace(',', '.').replace('−', '-')) || 0, // C — replace Unicode minus (U+2212) with ASCII hyphen-minus
      type: (row[3] as EntryType) || 'materiaali',                 // D
      paid: (row[4] ?? '').toLowerCase() === 'kyllä',              // E
      date: row[5] ?? '',                                          // F
    }))
    .filter((e) => e.description.trim() !== '') // skip empty rows
}

export async function addExpense(projectName: string, expense: Omit<Expense, 'id'>): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID,
    range: `${projectName}!A:F`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          expense.description,                               // A
          expense.performer,                                 // B
          expense.amount.toString().replace('.', ','),       // C
          expense.type,                                      // D
          expense.paid ? 'kyllä' : 'ei',                    // E
          expense.date,                                      // F
        ],
      ],
    },
  })
}

export async function updateExpense(
  projectName: string,
  rowIndex: string,
  expense: Omit<Expense, 'id'>
): Promise<void> {
  const sheets = getSheetsClient()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID,
    range: `${projectName}!A${rowIndex}:F${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          expense.description,                               // A
          expense.performer,                                 // B
          expense.amount.toString().replace('.', ','),       // C
          expense.type,                                      // D
          expense.paid ? 'kyllä' : 'ei',                    // E
          expense.date,                                      // F
        ],
      ],
    },
  })
}

export async function deleteExpense(projectName: string, rowIndex: number): Promise<void> {
  const sheets = getSheetsClient()

  // Look up the numeric sheetId for the tab
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEETS_ID })
  const sheet = meta.data.sheets?.find((s) => s.properties?.title === projectName)
  const sheetId = sheet?.properties?.sheetId ?? 0

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEETS_ID,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1, // convert to 0-based
              endIndex: rowIndex,        // exclusive
            },
          },
        },
      ],
    },
  })
}

export async function createProject(name: string): Promise<void> {
  const sheets = getSheetsClient()

  // Add new sheet tab
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEETS_ID,
    requestBody: {
      requests: [{ addSheet: { properties: { title: name } } }],
    },
  })

  // Write header row
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEETS_ID,
    range: `${name}!A1:F1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['kuvaus', 'tekijä', 'kulut', 'tyyppi', 'maksettu', 'päivämäärä']],
    },
  })
}
