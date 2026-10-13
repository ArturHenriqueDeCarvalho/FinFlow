import { TransactionType } from '../types/finance';

export interface ParsedRawItem {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: TransactionType;
  fitId?: string;
  memo?: string;
}

/**
 * Normaliza datas brasileiras (DD/MM/YYYY) ou ISO para YYYY-MM-DD
 */
export function normalizeDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const clean = dateStr.trim();

  // YYYYMMDD ou YYYYMMDDHHMMSS (Formato padrão OFX)
  if (/^\d{8}/.test(clean)) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Converte strings monetárias brasileiras (ex: "R$ -1.250,50", "1.250,50 D", "-35,90") em número
 */
export function parseBrlAmount(amountStr: string): number {
  if (!amountStr) return 0;
  let clean = amountStr.trim().toUpperCase();

  let isNegative = clean.includes('-') || clean.includes('(') || clean.endsWith('D');

  // Remove caracteres não numéricos exceto ponto e vírgula
  clean = clean.replace(/[R$\s()DCA]/g, '').trim();

  // Se tem ponto e vírgula (ex: 1.250,50)
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Apenas vírgula (ex: 250,50)
    clean = clean.replace(',', '.');
  }

  let num = parseFloat(clean);
  if (isNaN(num)) return 0;
  if (isNegative && num > 0) num = -num;
  return num;
}

/**
 * Parser de Extrato bancário em formato OFX (Open Financial Exchange SGML/XML)
 */
export function parseOFX(ofxContent: string): ParsedRawItem[] {
  const transactions: ParsedRawItem[] = [];
  if (!ofxContent) return transactions;

  // Encontra todas as tags <STMTTRN>...</STMTTRN> ou SGML não fechado
  // O padrão SGML OFX não fecha tags folha: <TRNAMT>-50.00\n<FITID>...
  const stmtTrnBlocks = ofxContent.split(/<STMTTRN>/i);
  stmtTrnBlocks.shift(); // Remove cabeçalho antes do primeiro STMTTRN

  for (const block of stmtTrnBlocks) {
    // Isola conteúdo até fechamento de bloco se existir
    const content = block.split(/<\/STMTTRN>/i)[0];

    const getTagValue = (tag: string): string => {
      const regex = new RegExp(`<${tag}>([^<\r\n]+)`, 'i');
      const match = content.match(regex);
      return match ? match[1].trim() : '';
    };

    const trnType = getTagValue('TRNTYPE').toUpperCase();
    const dtPosted = getTagValue('DTPOSTED');
    const trnAmt = getTagValue('TRNAMT');
    const fitId = getTagValue('FITID');
    const name = getTagValue('NAME') || getTagValue('MEMO') || 'Transação OFX';
    const memo = getTagValue('MEMO');

    let amount = parseFloat(trnAmt);
    if (isNaN(amount)) continue;

    // Se o tipo for DEBIT e o valor vier positivo no OFX
    if (trnType === 'DEBIT' && amount > 0) {
      amount = -amount;
    }

    const type: TransactionType = amount < 0 ? 'EXPENSE' : 'INCOME';

    transactions.push({
      date: normalizeDate(dtPosted),
      description: name,
      amount,
      type,
      fitId: fitId || `ofx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      memo,
    });
  }

  return transactions;
}

/**
 * Parser de Extrato bancário em formato CSV
 */
export function parseCSV(csvContent: string): ParsedRawItem[] {
  const transactions: ParsedRawItem[] = [];
  if (!csvContent) return transactions;

  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return transactions;

  // Detecta delimitador (, ou ; ou \t)
  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const tabCount = (firstLine.match(/\t/g) || []).length;

  let delimiter = ';';
  if (commaCount > semicolonCount && commaCount > tabCount) delimiter = ',';
  if (tabCount > semicolonCount && tabCount > commaCount) delimiter = '\t';

  // Cabeçalho e indexação de colunas
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date') || h.includes('dt'));
  let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('hist') || h.includes('memo') || h.includes('lançam') || h.includes('title'));
  let amountIdx = headers.findIndex(h => h.includes('valor') || h.includes('val') || h.includes('quantia') || h.includes('amount') || h.includes('saldo') === false);
  let idIdx = headers.findIndex(h => h.includes('id') || h.includes('fitid') || h.includes('documento') || h.includes('doc'));

  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;
  if (amountIdx === -1) amountIdx = 2;

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (rawCols.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const rawDate = rawCols[dateIdx];
    const rawDesc = rawCols[descIdx];
    const rawAmount = rawCols[amountIdx];

    if (!rawDate || !rawDesc || !rawAmount) continue;

    const amount = parseBrlAmount(rawAmount);
    if (amount === 0) continue;

    const type: TransactionType = amount < 0 ? 'EXPENSE' : 'INCOME';

    transactions.push({
      date: normalizeDate(rawDate),
      description: rawDesc,
      amount,
      type,
      fitId: idIdx !== -1 && rawCols[idIdx] ? rawCols[idIdx] : `csv-${i}-${Date.now().toString(36)}`,
    });
  }

  return transactions;
}

/**
 * Parser de texto livre extraído de extratos PDF bancários (Itaú, Nubank, Bradesco, etc.)
 */
export function parseStatementText(textContent: string): ParsedRawItem[] {
  const transactions: ParsedRawItem[] = [];
  if (!textContent) return transactions;

  const lines = textContent.split(/\r?\n/);
  // Padrão de linha de extrato bancário brasileiro:
  // DD/MM ou DD/MM/YYYY [Descrição com letras e números] [Valor R$ -1.250,50 ou -1250,50 ou 1.250,50 D]
  const linePattern = /(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.*?)\s+([-+]?(?:R\$\s*)?[\d\.,]+(?:\s*[DC])?)$/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const match = line.match(linePattern);
    if (match) {
      const rawDate = match[1];
      const desc = match[2].trim();
      const rawAmount = match[3].trim();

      // Completa ano atual se vier apenas DD/MM
      let fullDateStr = rawDate;
      if (!rawDate.includes('/') || rawDate.split('/').length === 2) {
        fullDateStr = `${rawDate}/${new Date().getFullYear()}`;
      }

      const amount = parseBrlAmount(rawAmount);
      if (amount !== 0 && desc.length > 2) {
        transactions.push({
          date: normalizeDate(fullDateStr),
          description: desc,
          amount,
          type: amount < 0 ? 'EXPENSE' : 'INCOME',
          fitId: `pdf-${i}-${Date.now().toString(36)}`,
        });
      }
    }
  }

  return transactions;
}
