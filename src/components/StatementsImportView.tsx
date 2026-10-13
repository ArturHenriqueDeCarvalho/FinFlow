import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { parseOFX, parseCSV, parseStatementText } from '../utils/parsers';
import { classifyTransactionWithRules, detectDuplicate } from '../utils/reconciliation';
import { Category, ImportPreviewItem, Transaction } from '../types/finance';
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  FileText,
  RotateCw,
  Sparkles,
  ChevronRight,
  Filter,
} from 'lucide-react';

export const StatementsImportView: React.FC = () => {
  const {
    accounts,
    categories,
    userRules,
    transactions: existingTransactions,
    addTransactionsFromImport,
    importHistory,
    setActiveTab,
  } = useFinance();

  const [step, setStep] = useState<'UPLOAD' | 'PREVIEW' | 'REPORT'>('UPLOAD');
  const [targetAccountId, setTargetAccountId] = useState<string>(accounts[0]?.id || '');
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [currentFileType, setCurrentFileType] = useState<'OFX' | 'CSV' | 'PDF'>('OFX');
  const [importSummary, setImportSummary] = useState<{
    total: number;
    imported: number;
    duplicatesSkipped: number;
  }>({ total: 0, imported: 0, duplicatesSkipped: 0 });

  // Amostras pré-fabricadas para teste imediato
  const SAMPLE_OFX = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEVERSION:102
NEWFILEVERSION:102
<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<DTSERVER>20261013120000[-03:EST]
<LANGUAGE>POR
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1001
<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>260
<ACCTID>0001-7289
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20261001
<DTEND>20261013
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261012120000[-03:EST]
<TRNAMT>-89.90
<FITID>OFX-NU-20261012-01
<NAME>iFood *Hamburgueria Artesanal
<MEMO>Compra com cartao de debito
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261011140000[-03:EST]
<TRNAMT>-385.40
<FITID>OFX-NU-20261011-02
<NAME>Supermercado Pão de Açúcar Jardins
<MEMO>Supermercado
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261010183000[-03:EST]
<TRNAMT>-149.00
<FITID>OFX-NU-20261010-03
<NAME>Zara Brasil Shopping Morumbi
<MEMO>Vestuario
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261008090000[-03:EST]
<TRNAMT>1200.00
<FITID>OFX-NU-20261008-04
<NAME>TED RECEBIDA PROJETOS DIGITAIS
<MEMO>Honorarios Freelancer
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261007110000[-03:EST]
<TRNAMT>-45.00
<FITID>OFX-NU-20261007-05
<NAME>Uber *Trip Vila Olimpia
<MEMO>Transporte
</STMTTRN>
</BANKTRANLIST>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>`;

  const SAMPLE_CSV = `Data;Descricao;Valor;Documento
12/10/2026;Restaurante Mocoto Sp;-135,00;DOC-99120
11/10/2026;Farmacia Drogasil Paulista;-78,50;DOC-99121
10/10/2026;Posto Ipiranga Gasolina;-220,00;DOC-99122
09/10/2026;Netflix Mensalidade Padrao;-55,90;DOC-99123
08/10/2026;Pix Recebido Consultoria;2500,00;DOC-99124`;

  const SAMPLE_PDF_TEXT = `EXTRATO DE CONTA CORRENTE BANCO DO BRASIL S.A.
PERIODO: 01/10/2026 A 13/10/2026
CLIENTE: FINPULSE USUARIO CONSOLIDADO

05/10/2026 TED RECEBIDA FOLHA SALARIO 14500,00 C
07/10/2026 PAGTO COBRANCA QUINTO ANDAR -3200,00 D
09/10/2026 ENEL DISTRIBUICAO SP -184,20 D
10/10/2026 AUTO POSTO BANDEIRANTES COMBUSTIVEL -180,00 D
11/10/2026 DROGA RAIA FARMACIA -64,90 D
12/10/2026 IFOOD REFEICAO SAUDAVEL -64,90 D`;

  const processContent = (content: string, fileName: string, type: 'OFX' | 'CSV' | 'PDF') => {
    let parsed: Array<{ date: string; description: string; amount: number; type: any; fitId?: string }> = [];

    if (type === 'OFX') parsed = parseOFX(content);
    else if (type === 'CSV') parsed = parseCSV(content);
    else parsed = parseStatementText(content);

    if (parsed.length === 0) {
      alert('Nenhuma transação válida identificada no formato fornecido.');
      return;
    }

    // Classifica automaticamente com heurísticas/regras e detecta duplicidades contra dados do Open Finance
    const previews: ImportPreviewItem[] = parsed.map((item, idx) => {
      const classification = classifyTransactionWithRules(item.description, item.amount, userRules, categories);
      const dupCheck = detectDuplicate(item, existingTransactions);

      return {
        id: `prev-${idx}-${Date.now()}`,
        date: item.date,
        description: item.description,
        amount: item.amount,
        type: item.type,
        fitId: item.fitId,
        suggestedCategoryId: classification.categoryId,
        confidence: classification.confidence,
        aiExplanation: classification.explanation,
        isDuplicateSuspect: dupCheck.isDuplicate,
        duplicateMatchedWith: dupCheck.reason,
        selected: !dupCheck.isDuplicate, // Desmarca automaticamente duplicatas suspeitas
      };
    });

    setCurrentFileName(fileName);
    setCurrentFileType(type);
    setPreviewItems(previews);
    setStep('PREVIEW');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const lowerName = fileName.toLowerCase();
    let type: 'OFX' | 'CSV' | 'PDF' = 'CSV';

    if (lowerName.endsWith('.ofx')) type = 'OFX';
    else if (lowerName.endsWith('.pdf')) type = 'PDF';

    const reader = new FileReader();
    reader.onload = event => {
      const text = (event.target?.result as string) || '';
      processContent(text, fileName, type);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    const selected = previewItems.filter(i => i.selected);
    const targetAcc = accounts.find(a => a.id === targetAccountId) || accounts[0];

    const toImport: Array<Omit<Transaction, 'id' | 'createdAt'>> = selected.map(item => {
      const cat = categories.find(c => c.id === item.suggestedCategoryId);
      return {
        accountId: targetAcc.id,
        accountName: targetAcc.name,
        institutionName: targetAcc.institutionName,
        institutionColor: targetAcc.institutionColor,
        date: item.date,
        description: item.description,
        amount: item.amount,
        categoryId: item.suggestedCategoryId,
        categoryName: cat ? cat.name : 'Outras Despesas',
        type: item.type,
        source: currentFileType === 'OFX' ? 'IMPORT_OFX' : currentFileType === 'CSV' ? 'IMPORT_CSV' : 'IMPORT_PDF',
        externalId: item.fitId,
        confidence: item.confidence,
        isConfidenceLow: item.confidence < 70,
        aiExplanation: item.aiExplanation,
      };
    });

    addTransactionsFromImport(toImport, currentFileName, currentFileType);

    setImportSummary({
      total: previewItems.length,
      imported: selected.length,
      duplicatesSkipped: previewItems.length - selected.length,
    });

    setStep('REPORT');
  };

  const updateItemCategory = (id: string, categoryId: string) => {
    setPreviewItems(prev =>
      prev.map(item => {
        if (item.id === id) {
          const cat = categories.find(c => c.id === categoryId);
          return {
            ...item,
            suggestedCategoryId: categoryId,
            confidence: 100,
            aiExplanation: `Classificação ajustada manualmente para ${cat?.name}.`,
          };
        }
        return item;
      })
    );
  };

  const toggleItemSelection = (id: string) => {
    setPreviewItems(prev =>
      prev.map(i => (i.id === id ? { ...i, selected: !i.selected } : i))
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo de Extratos */}
      <div className="p-4 sm:p-6 rounded-xl bg-slate-900/70 border border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Leitura & Conciliação Inteligente de Extratos
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight mt-0.5">
              Importação Automática OFX, CSV & PDF
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Importe extratos com extração automática de data, descrição, valor e tipo.
              O sistema detecta duplicidades contra o Open Finance e classifica despesas com IA.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Conta destino:</span>
            <select
              value={targetAccountId}
              onChange={e => setTargetAccountId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {accounts.map(a => (
                <option key={a.id} value={a.id}>
                  {a.institutionName} - {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ETAPA 1: Upload & Arquivos de Teste */}
      {step === 'UPLOAD' && (
        <div className="space-y-6">
          {/* Zona Drag & Drop */}
          <div className="p-8 sm:p-12 rounded-2xl bg-slate-900/40 border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 transition-colors flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              Arraste seu extrato bancário ou selecione um arquivo
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Formatos aceitos: <strong>.OFX</strong> (padrão bancário), <strong>.CSV</strong> (delimitado por vírgula ou ponto e vírgula) ou <strong>.TXT / .PDF</strong>.
            </p>

            <label className="mt-5 px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer transition-colors">
              <span>Selecionar Arquivo no Computador</span>
              <input
                type="file"
                accept=".ofx,.csv,.txt,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Teste Rápido com Extratos Amostrais (1-Click Tester) */}
          <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Testar Imediatamente com Extratos Demonstrativos
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Clique em um dos formatos abaixo para experimentar a leitura automática e detecção de duplicidades:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => processContent(SAMPLE_OFX, 'extrato_nubank_outubro.ofx', 'OFX')}
                className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 text-purple-400 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Extrato Nubank (.OFX)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Lê tags padrão SGML/XML, FITID, valores e descrições bancárias.
                </p>
                <span className="mt-3 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  Carregar Exemplo <ChevronRight className="w-3 h-3" />
                </span>
              </button>

              <button
                onClick={() => processContent(SAMPLE_CSV, 'extrato_itau_setembro.csv', 'CSV')}
                className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 text-orange-400 font-bold text-xs">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Extrato Itaú (.CSV)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Interpreta formato BRL (-135,00) e datas brasileiras DD/MM/AAAA.
                </p>
                <span className="mt-3 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  Carregar Exemplo <ChevronRight className="w-3 h-3" />
                </span>
              </button>

              <button
                onClick={() => processContent(SAMPLE_PDF_TEXT, 'extrato_bb_declaracao.pdf', 'PDF')}
                className="p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-left transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold text-xs">
                  <FileText className="w-4 h-4" />
                  <span>Extrato BB (.PDF / Texto)</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Extração por padrão de linhas bancárias com crédito e débito.
                </p>
                <span className="mt-3 text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  Carregar Exemplo <ChevronRight className="w-3 h-3" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ETAPA 2: Prévia & Validação com Detecção de Duplicidades */}
      {step === 'PREVIEW' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400 uppercase">Validação Prévia</span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-white font-bold">{currentFileName}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {previewItems.length} transações identificadas. Desmarque duplicatas ou altere categorias antes de consolidar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('UPLOAD')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCommitImport}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 cursor-pointer"
              >
                Confirmar e Importar ({previewItems.filter(i => i.selected).length})
              </button>
            </div>
          </div>

          {/* Tabela de Prévia */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-200">
              <thead className="bg-slate-800/70 text-slate-400 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={previewItems.every(i => i.selected)}
                      onChange={e =>
                        setPreviewItems(prev => prev.map(i => ({ ...i, selected: e.target.checked })))
                      }
                      className="rounded border-slate-700 text-emerald-500"
                    />
                  </th>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Descrição Extraída</th>
                  <th className="py-2.5 px-3">Categoria Sugerida</th>
                  <th className="py-2.5 px-3">Confiança IA</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {previewItems.map(item => {
                  const isIncome = item.amount > 0;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-800/40 ${
                        item.isDuplicateSuspect ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="rounded border-slate-700 text-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-300">
                        {item.date.split('-').reverse().join('/')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{item.description}</div>
                        {item.isDuplicateSuspect && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 mt-0.5">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>{item.duplicateMatchedWith}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 mt-0.5">{item.aiExplanation}</div>
                      </td>
                      <td className="py-3 px-3">
                        <select
                          value={item.suggestedCategoryId}
                          onChange={e => updateItemCategory(item.id, e.target.value)}
                          className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold tabular-nums ${
                            item.confidence >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.confidence >= 70
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {item.confidence}%
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums whitespace-nowrap font-bold">
                        <span className={isIncome ? 'text-emerald-400' : 'text-slate-200'}>
                          {isIncome ? '+' : ''}R${' '}
                          {Math.abs(item.amount).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ETAPA 3: Relatório de Importação Concluída */}
      {step === 'REPORT' && (
        <div className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Extrato Processado com Sucesso!</h3>
            <p className="text-xs text-slate-400 mt-1">
              As transações selecionadas foram categorizadas e adicionadas ao seu saldo consolidado.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-800 text-xs">
            <div>
              <div className="text-slate-500 text-[11px]">Identificadas</div>
              <div className="text-sm font-bold text-white tabular-nums">{importSummary.total}</div>
            </div>
            <div>
              <div className="text-emerald-400 text-[11px]">Consolidadas</div>
              <div className="text-sm font-bold text-emerald-400 tabular-nums">{importSummary.imported}</div>
            </div>
            <div>
              <div className="text-amber-400 text-[11px]">Duplicatas Descartadas</div>
              <div className="text-sm font-bold text-amber-400 tabular-nums">{importSummary.duplicatesSkipped}</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setStep('UPLOAD')}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
            >
              Importar Outro Arquivo
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
            >
              Consultar no Extrato Geral
            </button>
          </div>
        </div>
      )}

      {/* Histórico de Importações Anteriores */}
      {importHistory.length > 0 && (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800/80">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Histórico de Arquivos Importados ({importHistory.length})
          </h3>
          <div className="divide-y divide-slate-800/80">
            {importHistory.map(hist => (
              <div key={hist.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">{hist.fileName}</div>
                  <div className="text-[11px] text-slate-400">
                    Formato {hist.fileType} · {new Date(hist.timestamp).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(hist.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="text-right text-[11px] tabular-nums">
                  <span className="text-emerald-400 font-semibold">{hist.importedCount} importadas</span>
                  {hist.duplicateCount > 0 && (
                    <span className="text-slate-500 ml-2">({hist.duplicateCount} duplicatas ignoradas)</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
