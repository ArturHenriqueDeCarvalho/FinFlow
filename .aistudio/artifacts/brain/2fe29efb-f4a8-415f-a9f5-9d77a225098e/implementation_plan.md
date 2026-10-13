# Plano de Implementação: Controle de Acesso (Google Login), Firestore e Open Finance Real

Estruturação do controle de acesso com autenticação Google via Firebase, persistência segura no Firestore com isolamento por usuário (Zero-Trust), transição para conta limpa com dados 100% reais e integração Open Finance gratuita.

---

### Decisões do Usuário & Provedores Gratuitos

> [!IMPORTANT]
> **Respostas confirmadas pelo usuário:**
> 1. **Autenticação & Banco de Dados:** Firebase Authentication (Login Google) + Cloud Firestore.
> 2. **Estado Inicial:** Iniciar a conta de novos usuários **100% limpa**, sem dados fictícios/mockados, pronta para receber apenas dados reais.
> 3. **Provedor Open Finance Gratuito:** O usuário questionou: *"Qual desses é gratuito?"*.
>    - **Pluggy (Recomendado):** Possui plano gratuito de desenvolvedor (**Free Developer Tier / Sandbox**) com acesso gratuito à API e ao widget **Pluggy Connect**, permitindo testar conexões bancárias reais e simuladas (Nubank, Itaú, Bradesco, Inter, BB) sem custo.
>    - **Importação Direta de Extratos (OFX / CSV):** É **100% gratuita para sempre**, sem necessidade de chave de API ou provedor intermediário, ideal para conciliação imediata de contas correntes e cartões de crédito.
>    - **Estratégia Escolhida:** Adotaremos a **Pluggy API (Sandbox Gratuita)** para Open Finance automatizado em conjunto com o motor nativo de **Importação de Extratos OFX/CSV reais**, garantindo custo zero e máxima flexibilidade para o usuário.

---

## 1. Visão Geral & Conceito

- **O que será entregue:**
  - Tela de autenticação e controle de acesso com botão **"Continuar com Google"** via Firebase Auth (`signInWithPopup`).
  - Proteção de rotas e estado global de sessão: usuários não autenticados veem a tela de login; usuários logados acessam seu painel pessoal exclusivo.
  - Banco de dados em nuvem no **Firestore** com isolamento estrito: cada usuário grava e lê apenas seus próprios dados (`users/{userId}/...`).
  - Remoção dos dados mockados fixos: novos usuários iniciam com saldo zerado e extrato limpo.
  - Integração Open Finance com a API gratuita da **Pluggy** (Widget Pluggy Connect + geração de token de conexão) para sincronização de contas bancárias reais/sandbox, além do suporte contínuo a extratos reais OFX e CSV.

---

## 2. Experiência do Usuário & Fluxos

### Fluxo 1: Autenticação com Google e Sessão
1. **Tela de Boas-Vindas & Login:**
   - Apresentação visual limpa do FinPulse com botão proeminente **"Entrar com o Google"**.
   - Ao clicar, abre o popup oficial de autenticação da conta Google do usuário.
2. **Inicialização da Conta:**
   - Após o login, o sistema verifica se o perfil já existe no Firestore. Se for o primeiro acesso, cria o documento do usuário em `users/{userId}` e inicializa coleções vazias.
   - Header atualizado exibindo foto de perfil do Google, nome do usuário e botão discreto de **Logout**.

### Fluxo 2: Conta Limpa & Primeiro Acesso (Zero-State)
1. **Painel Inicial Limpo:**
   - Indicadores zerados com mensagens acolhedoras e direcionamento claro:
     - *"Nenhuma conta conectada ainda. Conecte seu banco ou importe seu extrato."*
   - Duas ações em destaque no zero-state:
     - **"Conectar Banco via Open Finance (Pluggy Sandbox)"**
     - **"Importar Extrato Bancário (.OFX ou .CSV)"**

### Fluxo 3: Conexão Bancária Real / Sandbox Pluggy
1. Usuário clica em **"Conectar Instituição"**.
2. O widget oficial da Pluggy é instanciado via token gerado no backend (`/api/open-finance/pluggy/token`).
3. Usuário seleciona o banco (Nubank, Itaú, Bradesco, Inter, etc.) e autoriza a leitura.
4. As contas e movimentações reais/sandbox são gravadas diretamente no Firestore do usuário logado.

---

## 3. Decisões Técnicas & Trade-Offs

- **Autenticação:**
  - *Abordagem:* Firebase Authentication com provedor Google (`GoogleAuthProvider` + `signInWithPopup`).
  - *Motivo:* Integração nativa e segura no ambiente do AI Studio, sem necessidade de armazenar senhas ou implementar fluxos complexos de refresh tokens OAuth manualmente.
- **Persistência & Isolamento de Dados:**
  - *Abordagem:* Firestore com subcoleções aninhadas sob o UID do usuário (`users/{userId}/accounts`, `users/{userId}/transactions`, `users/{userId}/budgets`, `users/{userId}/consents`).
  - *Motivo:* Garante conformidade total com a LGPD e regras de segurança matemáticas no `firestore.rules` (`allow read, write: if request.auth.uid == userId`).
- **Provedor Open Finance:**
  - *Abordagem:* Pluggy (Free Developer Sandbox) + Extratos OFX/CSV.
  - *Motivo:* Permite testar a experiência real de Open Finance sem custo de setup corporativo, com fallback garantido para arquivos bancários reais.

---

## 4. Arquitetura Técnica & Modelo de Dados

### Diagrama da Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                       Cliente Web (React)                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │ Firebase Auth   │  │ FinanceContext   │  │ Views      │  │
│  │ (Google Login)  │  │ (Firestore Sync) │  │ Dashboard, │  │
│  └────────┬────────┘  └────────┬─────────┘  │ Extratos,  │  │
│           │                    │            │ Bancos     │  │
└───────────┼────────────────────┼────────────┴────────────┘  │
            │ Token Auth         │ Leituras/Gravações         │
            ▼                    ▼                            │
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud / Firebase                 │
│  ┌───────────────────────┐   ┌───────────────────────────┐  │
│  │ Firebase Auth         │   │ Cloud Firestore           │  │
│  │ (Google Identity)     │   │ users/{userId}/accounts   │  │
│  │                       │   │ users/{userId}/transacts  │  │
│  │                       │   │ users/{userId}/budgets    │  │
│  └───────────────────────┘   └─────────────┬─────────────┘  │
│                                            │                │
│                         firestore.rules    │                │
│                         (Zero-Trust ABAC)  │                │
└────────────────────────────────────────────┼────────────────┘
                                             │
                                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Servidor Backend (server.ts)                │
│  ┌─────────────────────────┐   ┌─────────────────────────┐  │
│  │ /api/ai/categorize      │   │ /api/open-finance/*     │  │
│  │ /api/ai/insights        │   │ (Pluggy Connect Token   │  │
│  │ (Gemini 3.8 Flash)      │   │  & Sync Handler)        │  │
│  └─────────────────────────┘   └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Modelo de Dados no Firestore

- **`users/{userId}`**:
  - `email`: string
  - `displayName`: string
  - `photoURL`: string
  - `createdAt`: timestamp
  - `lastLoginAt`: timestamp
- **`users/{userId}/accounts/{accountId}`**:
  - `institutionName`: string
  - `institutionColor`: string
  - `type`: 'CHECKING' | 'CREDIT_CARD' | 'INVESTMENT'
  - `balance`: number
  - `lastSyncAt`: timestamp
  - `source`: 'PLUGGY_OPEN_FINANCE' | 'MANUAL_IMPORT'
- **`users/{userId}/transactions/{txId}`**:
  - `accountId`: string
  - `date`: string (YYYY-MM-DD)
  - `description`: string
  - `amount`: number
  - `categoryId`: string
  - `type`: 'EXPENSE' | 'INCOME' | 'TRANSFER'
  - `source`: 'OPEN_FINANCE' | 'IMPORT_OFX' | 'IMPORT_CSV'
  - `confidence`: number
- **`users/{userId}/budgets/{budgetId}`**:
  - `categoryId`: string
  - `monthlyLimit`: number
  - `alertThreshold`: number

---

## 5. Etapas de Execução

1. **Provisionamento do Firebase:**
   - Acionar fluxo interativo com `show_aistudio_ui` (`firebase_setup`) e provisionar Firestore e Auth via `ProvisionFirebase`.
2. **Configuração de Regras de Segurança (`firestore.rules`):**
   - Configurar regras que garantem que cada usuário acesse apenas seus próprios dados com validação `request.auth.uid == userId`.
3. **Criação da Camada de Autenticação (`src/context/AuthContext.tsx`):**
   - Implementar `signInWithGoogle` (popup) e `signOut`.
   - Gerenciar estado de carregamento de sessão e redirecionamento.
4. **Migração do `FinanceContext` para Firestore em Tempo Real:**
   - Substituir `mockData` por ouvintes `onSnapshot` conectados ao Firestore do usuário autenticado.
   - Tratar estados vazios (*empty states*) para novos usuários.
5. **Integração Open Finance com Pluggy Sandbox & Importação Real:**
   - Configurar rotas de backend para conectar com a API gratuita da Pluggy (geração de connect token e sincronização de itens).
   - Manter importador de OFX e CSV persistindo diretamente no Firestore do usuário.
