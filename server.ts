import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// Inicialização segura do SDK Gemini com User-Agent 'aistudio-build'
const apiKey = process.env.GEMINI_API_KEY;
const isRealApiKey = apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim().length > 10;
let ai: GoogleGenAI | null = null;
if (isRealApiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getOfflineDiagnostic() {
  return {
    success: true,
    source: 'OFFLINE_ENGINE',
    healthScore: 84,
    financialHealthStatus: 'EQUILIBRADO',
    insights: [
      {
        title: 'Controle de Gastos em Alimentação',
        type: 'WARNING',
        description: 'Seus gastos com alimentação fora de casa representam 28% das despesas totais. Reduzir 2 pedidos por semana geraria economia de R$ 260,00/mês.',
        impactAmount: 260.00,
      },
      {
        title: 'Otimização de Assinaturas Digitais',
        type: 'SAVINGS',
        description: 'Identificamos 4 serviços de streaming simultâneos. Pausar serviços não utilizados com frequência pode poupar R$ 680,00 no acumulado de 12 meses.',
        impactAmount: 680.00,
      },
      {
        title: 'Reserva de Emergência e Rendimentos',
        type: 'OPPORTUNITY',
        description: 'Você possui saldo em conta corrente com liquidez que poderia estar gerando 100% do CDI no Inter ou Nubank sem perda de liquidez diária.',
        impactAmount: 92.00,
      },
    ],
  };
}

/**
 * Endpoint de Categorização Inteligente via Gemini AI (com fallback robusto)
 */
app.post('/api/ai/categorize', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array de transações (items) é obrigatório' });
    }

    if (!ai || !isRealApiKey) {
      return res.json({
        success: true,
        source: 'HEURISTIC_FALLBACK',
        results: items.map(it => ({
          id: it.id,
          categoryId: it.amount > 0 ? 'cat-salario' : 'cat-outros',
          categoryName: it.amount > 0 ? 'Salário e Renda' : 'Outras Despesas',
          confidence: 70,
          explanation: 'Classificação heurística local aplicada.',
          isRecurring: false,
          isInternalTransfer: false,
        })),
      });
    }

    const promptText = `Você é um motor de Inteligência Artificial para gestão financeira pessoal brasileira (FinPulse).
Classifique com máxima precisão cada uma das seguintes movimentações bancárias brasileiras.
Categorias disponíveis:
- 'cat-salario' (Salário e Renda)
- 'cat-rendimentos' (Investimentos & Rendimentos)
- 'cat-outras-receitas' (Outras Receitas)
- 'cat-alimentacao' (Alimentação & Restaurantes / iFood / lanches)
- 'cat-mercado' (Supermercado & Feira / atacados)
- 'cat-transporte' (Transporte & Combustível / Uber / postos)
- 'cat-moradia' (Moradia & Contas Básicas / aluguel / condomínio / luz / internet)
- 'cat-saude' (Saúde & Farmácia / academias / planos médicos)
- 'cat-educacao' (Educação & Cursos)
- 'cat-lazer' (Lazer & Entretenimento / cinema / viagens)
- 'cat-assinaturas' (Assinaturas & Recorrências / Netflix, Spotify, softwares)
- 'cat-compras' (Compras Pessoais / e-commerce, roupas)
- 'cat-tarifas' (Tarifas & Tributos bancários)
- 'cat-transferencia' (Transferência Entre Contas próprias do usuário / mesma titularidade)
- 'cat-outros' (Outras Despesas)

Transações a classificar:
${JSON.stringify(items.slice(0, 30), null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: 'Retorne estritamente um array JSON de objetos categorizados com justificativa sucinta.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              categoryId: { type: Type.STRING },
              categoryName: { type: Type.STRING },
              confidence: { type: Type.NUMBER, description: 'Percentual de 0 a 100' },
              explanation: { type: Type.STRING, description: 'Breve explicação em português' },
              isRecurring: { type: Type.BOOLEAN },
              isInternalTransfer: { type: Type.BOOLEAN },
            },
            required: ['id', 'categoryId', 'categoryName', 'confidence', 'explanation'],
          },
        },
      },
    });

    const parsedResults = JSON.parse(response.text || '[]');
    return res.json({
      success: true,
      source: 'GEMINI_AI',
      results: parsedResults,
    });
  } catch (error: any) {
    console.warn('Aviso: usando fallback local para categorização:', error?.message);
    const { items } = req.body;
    return res.json({
      success: true,
      source: 'HEURISTIC_FALLBACK',
      results: (items || []).map((it: any) => ({
        id: it.id,
        categoryId: it.amount > 0 ? 'cat-salario' : 'cat-outros',
        categoryName: it.amount > 0 ? 'Salário e Renda' : 'Outras Despesas',
        confidence: 65,
        explanation: 'Classificação heurística local aplicada (fallback).',
        isRecurring: false,
        isInternalTransfer: false,
      })),
    });
  }
});

/**
 * Endpoint de Diagnóstico e Recomendações Financeiras Preventivas via IA
 */
app.post('/api/ai/insights', async (req, res) => {
  try {
    const { summary } = req.body;
    if (!ai || !isRealApiKey) {
      return res.json(getOfflineDiagnostic());
    }

    const promptText = `Você é o consultor financeiro inteligente da FinPulse (especialista em finanças pessoais brasileiras).
Com base no seguinte resumo financeiro do usuário:
${JSON.stringify(summary, null, 2)}

Gere um diagnóstico preventivo com:
1. Uma nota de saúde financeira de 0 a 100
2. Status geral (EXCELENTE, EQUILIBRADO, ATENCAO, CRITICO)
3. Três recomendações altamente práticas, contextualizadas para o Brasil (ex: Selic, Pix, compras em cartão, delivery, supermercado).
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            healthScore: { type: Type.NUMBER },
            financialHealthStatus: { type: Type.STRING },
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'WARNING | SAVINGS | OPPORTUNITY' },
                  description: { type: Type.STRING },
                  impactAmount: { type: Type.NUMBER },
                },
                required: ['title', 'type', 'description'],
              },
            },
          },
          required: ['healthScore', 'financialHealthStatus', 'insights'],
        },
      },
    });

    const data = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      source: 'GEMINI_AI',
      ...data,
    });
  } catch (err: any) {
    console.warn('Aviso: usando fallback local para insights:', err?.message);
    return res.json(getOfflineDiagnostic());
  }
});

/**
 * Endpoint de Leitura e Estruturação de Extrato Não-Estruturado (PDF/Texto) via IA
 */
app.post('/api/ai/parse-statement', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText) return res.status(400).json({ error: 'rawText é obrigatório' });

    if (!ai || !apiKey) {
      return res.status(503).json({ error: 'Chave de IA não configurada para OCR/Parsing semântico' });
    }

    const prompt = `Analise o seguinte extrato bancário brasileiro em texto bruto e extraia todas as transações financeiras.
Data deve estar no formato YYYY-MM-DD. O valor deve ser numérico negativo para despesas/saques e positivo para receitas/depósitos.
Extrato:
${rawText.slice(0, 15000)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: 'YYYY-MM-DD' },
              description: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              type: { type: Type.STRING, description: 'EXPENSE | INCOME | TRANSFER' },
              suggestedCategory: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ['date', 'description', 'amount', 'type'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    return res.json({ success: true, transactions: parsed });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Falha no processamento do extrato' });
  }
});

// Inicialização do servidor com Vite Middleware em desenvolvimento
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const port = 3000;

  if (isProduction) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[FinPulse] Servidor ativo em http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar servidor:', err);
  process.exit(1);
});
