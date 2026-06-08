import readXlsxFile from 'read-excel-file/browser';
import { buildSheets } from './parseWorkbook.core';

/**
 * Parse un fichier .xlsx en programmes.
 * @returns {Promise<Array<{sheetName: string, exercises: Array, warnings: string[]}>>}
 */
export async function parseWorkbook(file) {
  const sheets = await readXlsxFile(file); // [{ sheet, data }]
  return buildSheets(sheets);
}
