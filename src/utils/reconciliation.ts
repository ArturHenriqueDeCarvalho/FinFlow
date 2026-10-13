import { CategorizationRule, Category, Transaction } from '../types/finance';

/**
 * Calcula similaridade entre duas strings (Jaccard token similarity normalizada)
 */
export function calculateTextSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2);

  const tokensA = new Set(normalize(strA));
  const tokensB = new Set(normalize(strB));

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  return intersection.size / union.size;
}

/**
 * Diferença em dias entre duas datas no formato YYYY-MM-DD
 */
export function getDaysDifference(dateA: string, dateB: string): number {
  const tA = new Date(dateA).getTime();
  const tB = new Date(dateB).getTime();
  return Math.abs(Math.round((tA - tB) / (1000 * 60 * 60 * 24)));
}

/**
 * Detecta duplicidades entre uma transação candidata e transações já existentes
 */
export function detectDuplicate(
  candidate: { date: string; amount: number; description: string; fitId?: string },
  existingTransactions: Transaction[]
): { isDuplicate: boolean; matchedTransaction?: Transaction; reason?: string } {
  for (const existing of existingTransactions) {
    // 1. Identificador único FITID/ExternalId idêntico
    if (candidate.fitId && existing.externalId && candidate.fitId === existing.externalId) {
      return {
        isDuplicate: true,
        matchedTransaction: existing,
        reason: 'Identificador único (FITID/ExternalID) idêntico ao já registrado no sistema.',
      };
    }

    // 2. Mesmo valor absoluto e diferença máxima de 2 dias (frequente em compensação bancária e D+1)
    const sameAmount = Math.abs(candidate.amount - existing.amount) < 0.01;
    if (sameAmount) {
      const daysDiff = getDaysDifference(candidate.date, existing.date);
      if (daysDiff <= 2) {
        const similarity = calculateTextSimilarity(candidate.description, existing.description);
        if (similarity >= 0.5 || candidate.description.toLowerCase().includes(existing.description.toLowerCase().substring(0, 8))) {
          return {
            isDuplicate: true,
            matchedTransaction: existing,
            reason: `Possível duplicata: valor idêntico (R$ ${Math.abs(candidate.amount).toFixed(2)}) e data próxima (${daysDiff} dia(s) de diferença) com descrição similar ("${existing.description}").`,
          };
        }
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Dicionário heurístico de alta precisão para o mercado financeiro brasileiro
 */
interface KeywordCategoryMapping {
  keywords: string[];
  categoryId: string;
  categoryName: string;
  confidence: number;
  explanation: string;
  isRecurring?: boolean;
  isInternalTransfer?: boolean;
}

const BRAZILIAN_HEURISTICS: KeywordCategoryMapping[] = [
  // Transferências entre contas próprias
  {
    keywords: ['MESMA TITULARIDADE', 'CONTA PROPRIA', 'ENTRE CONTAS', 'TRANSF MESMO TITULAR', 'TED PROPRIO', 'PIX MESMA TIT'],
    categoryId: 'cat-transferencia',
    categoryName: 'Transferência Entre Contas',
    confidence: 96,
    explanation: 'Detectada transferência entre contas do mesmo titular (mesmo CPF). Não classificada como despesa nem receita.',
    isInternalTransfer: true,
  },
  // Salário e receitas
  {
    keywords: ['SALARIO', 'PROVENTO', 'FOLHA PAGTO', 'TED RECEBIDA TECH', 'REMUNERACAO', 'VENCIMENTOS', 'HONORARIOS'],
    categoryId: 'cat-salario',
    categoryName: 'Salário e Renda',
    confidence: 99,
    explanation: 'Termos compatíveis com crédito de proventos ou folha de pagamento.',
    isRecurring: true,
  },
  // Alimentação
  {
    keywords: ['IFOOD', 'RAPPI', 'MCDONALD', 'BURGER KING', 'RESTAURANTE', 'PADARIA', 'LANCHONETE', 'PIZZARIA', 'OUTBACK', 'FOGO DE CHAO', 'STARBUCKS', 'BAR ', 'CHOPERIA', 'SUSHI'],
    categoryId: 'cat-alimentacao',
    categoryName: 'Alimentação & Restaurantes',
    confidence: 97,
    explanation: 'Identificado estabelecimento alimentício ou aplicativo de delivery de refeições.',
  },
  // Mercado
  {
    keywords: ['SUPERMERCADO', 'PAO DE ACUCAR', 'CARREFOUR', 'EXTRA', 'ASSAI', 'ATACADAO', 'HORTIFRUTI', 'SACOLAO', 'MERCADO', 'ST MARCHE', 'HIROTA', 'DIA BRASIL', 'ZONA SUL'],
    categoryId: 'cat-mercado',
    categoryName: 'Supermercado & Feira',
    confidence: 98,
    explanation: 'Rede varejista supermercadista ou atacado de alimentos essenciais.',
  },
  // Transporte
  {
    keywords: ['UBER', '99APP', '99 TECNOLOGIA', 'POSTO', 'SHELL', 'IPIRANGA', 'PETROBRAS', 'SEM PARAR', 'VELOE', 'CONECTCAR', 'PEDAGIO', 'ESTACIONAMENTO', 'AUTO POSTO', 'GASOLINA', 'ETANOL'],
    categoryId: 'cat-transporte',
    categoryName: 'Transporte & Combustível',
    confidence: 96,
    explanation: 'Serviço de transporte por aplicativo, pedágio ou combustível veicular.',
  },
  // Moradia
  {
    keywords: ['QUINTO ANDAR', 'QUINTOANDAR', 'ALUGUEL', 'CONDOMINIO', 'ENEL', 'SABESP', 'CPFL', 'COMGAS', 'COPASA', 'CEMIG', 'CEEE', 'VIVO FIBRA', 'CLARO FIBRA', 'OI FIBRA', 'LUZ', 'AGUA'],
    categoryId: 'cat-moradia',
    categoryName: 'Moradia & Contas Básicas',
    confidence: 98,
    explanation: 'Despesa residencial essencial (aluguel, condomínio, energia ou saneamento).',
    isRecurring: true,
  },
  // Assinaturas
  {
    keywords: ['NETFLIX', 'SPOTIFY', 'AMAZON PRIME', 'DISNEY PLUS', 'HBO MAX', 'MAX.COM', 'YOUTUBE PREMIUM', 'APPLE.COM/BILL', 'GLOBOPLAY', 'PARAMOUNT', 'CHATGPT', 'OPENAI', 'GOOGLE STORAGE', 'ICLOUD'],
    categoryId: 'cat-assinaturas',
    categoryName: 'Assinaturas & Recorrências',
    confidence: 99,
    explanation: 'Serviço digital de assinatura recorrente com cobrança programada.',
    isRecurring: true,
  },
  // Saúde
  {
    keywords: ['DROGA RAIA', 'DROGASIL', 'PAGUE MENOS', 'FARMACIA', 'DROGARIA', 'UNIMED', 'NOTREDAME', 'AMIL', 'BRADESCO SAUDE', 'HOSPITAL', 'LABORATORIO', 'FLEURY', 'CONSULTA MEDICA', 'SMART FIT', 'ACADEMIA', 'BLUEFIT'],
    categoryId: 'cat-saude',
    categoryName: 'Saúde & Farmácia',
    confidence: 95,
    explanation: 'Serviço farmacêutico, plano de saúde ou bem-estar físico.',
  },
  // Educação
  {
    keywords: ['ALURA', 'UDEMY', 'COURSERA', 'FACULDADE', 'UNIVERSIDADE', 'COLÉGIO', 'ESCOLA', 'LIVRARIA', 'CURSO', 'IDIOMAS'],
    categoryId: 'cat-educacao',
    categoryName: 'Educação & Cursos',
    confidence: 94,
    explanation: 'Instituição de ensino, plataforma de cursos ou material educativo.',
  },
  // Lazer
  {
    keywords: ['CINEMARK', 'UCI', 'INGRESSO.COM', 'EVENTIM', 'SYMPLA', 'STEAM', 'PLAYSTATION', 'NINTENDO', 'XBOX', 'HOTEL', 'BOOKING', 'AIRBNB', 'VIAGEM'],
    categoryId: 'cat-lazer',
    categoryName: 'Lazer & Entretenimento',
    confidence: 93,
    explanation: 'Atividades recreativas, entretenimento cultural ou jogos.',
  },
  // Compras
  {
    keywords: ['MERCADO LIVRE', 'AMAZON.COM.BR', 'SHOPEE', 'ALIEXPRESS', 'MAGAZINE LUIZA', 'MAGALU', 'CASAS BAHIA', 'ZARA', 'RENNER', 'RIACHUELO', 'C&A', 'FAST SHOP', 'CENTAURO', 'SHEIN'],
    categoryId: 'cat-compras',
    categoryName: 'Compras Pessoais',
    confidence: 91,
    explanation: 'Comércio eletrônico ou loja de vestuário e utilidades.',
  },
  // Tarifas
  {
    keywords: ['TARIFA BANCARIA', 'MANUTENCAO CONTA', 'IOF', 'ENCARGOS', 'JUROS CARTAO', 'ANUIDADE', 'MULTA'],
    categoryId: 'cat-tarifas',
    categoryName: 'Tarifas & Tributos',
    confidence: 97,
    explanation: 'Tarifa bancária, encargos financeiros ou tributos.',
  },
];

/**
 * Classifica uma transação automaticamente:
 * 1. Primeiro verifica regras manuais salvas pelo usuário
 * 2. Em seguida regras heurísticas brasileiras
 * 3. Se nenhuma bater, atribui 'Outros' com baixa confiança (aguardando IA ou validação manual)
 */
export function classifyTransactionWithRules(
  description: string,
  amount: number,
  userRules: CategorizationRule[],
  allCategories: Category[]
): {
  categoryId: string;
  categoryName: string;
  confidence: number;
  explanation: string;
  isRecurring: boolean;
  isInternalTransfer: boolean;
  isConfidenceLow: boolean;
} {
  const descUpper = description.toUpperCase();

  // 1. Verifica regras manuais do usuário (tem precedência máxima)
  for (const rule of userRules) {
    if (descUpper.includes(rule.pattern.toUpperCase())) {
      return {
        categoryId: rule.categoryId,
        categoryName: rule.categoryName,
        confidence: 100,
        explanation: `Regra personalizada aprendida: corresponde ao padrão "${rule.pattern}".`,
        isRecurring: false,
        isInternalTransfer: rule.categoryId === 'cat-transferencia',
        isConfidenceLow: false,
      };
    }
  }

  // 2. Heurísticas locais brasileiras
  for (const mapping of BRAZILIAN_HEURISTICS) {
    for (const kw of mapping.keywords) {
      if (descUpper.includes(kw)) {
        return {
          categoryId: mapping.categoryId,
          categoryName: mapping.categoryName,
          confidence: mapping.confidence,
          explanation: mapping.explanation,
          isRecurring: !!mapping.isRecurring,
          isInternalTransfer: !!mapping.isInternalTransfer,
          isConfidenceLow: mapping.confidence < 70,
        };
      }
    }
  }

  // 3. Fallback inteligente baseado em valor e tipo
  if (amount > 0) {
    return {
      categoryId: 'cat-outras-receitas',
      categoryName: 'Outras Receitas',
      confidence: 50,
      explanation: 'Receita identificada sem padrão específico. Recomenda-se validação manual.',
      isRecurring: false,
      isInternalTransfer: false,
      isConfidenceLow: true,
    };
  }

  return {
    categoryId: 'cat-outros',
    categoryName: 'Outras Despesas',
    confidence: 45,
    explanation: 'Transação sem estabelecimento ou padrão identificado de imediato. Recomenda-se validação.',
    isRecurring: false,
    isInternalTransfer: false,
    isConfidenceLow: true,
  };
}
