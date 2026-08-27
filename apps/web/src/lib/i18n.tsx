import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { setLocale } from "./format";

export type Lang = "pt-PT" | "pt-BR" | "en";

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "pt-PT", label: "Português (Portugal)", flag: "🇵🇹" },
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

// Dicionários. pt-PT é a base; as outras traduzem as mesmas chaves.
type Dict = Record<string, string>;

const ptPT: Dict = {
  // comuns
  "common.save": "Guardar",
  "common.saving": "A guardar…",
  "common.cancel": "Cancelar",
  "common.delete": "Eliminar",
  "common.back": "Voltar",
  "common.next": "Seguinte",
  "common.skip": "Saltar",
  "common.close": "Fechar",
  "common.add": "Adicionar",
  "common.loading": "A carregar…",
  "common.error": "Não foi possível carregar os dados.",

  // navegação / shell
  "nav.newEntry": "Novo lançamento",
  "nav.home": "Início",
  "nav.month": "Mês",
  "nav.wallet": "Carteira",
  "nav.goalsInvest": "Objetivos & Investimentos",
  "nav.settings": "Definições",
  "nav.tagline": "Finanças Premium",
  "nav.accountOptions": "Opções da conta",
  "nav.redoSetup": "Refazer configuração",
  "nav.deleteAccount": "Eliminar conta",
  "nav.logout": "Sair",
  "shell.openMenu": "Abrir menu",

  // login
  "login.title": "Bem-vindo de volta",
  "login.subtitle": "Entra para continuares a cuidar das tuas finanças.",
  "login.email": "E-mail",
  "login.password": "Palavra-passe",
  "login.enter": "Entrar",
  "login.entering": "A entrar…",
  "login.noAccount": "Ainda não tens conta?",
  "login.createAccount": "Criar conta",
  "login.cantLogin": "Não foi possível entrar",

  // registo
  "register.title": "Criar conta",
  "register.subtitle": "Começa a organizar as tuas finanças em minutos.",
  "register.name": "Nome",
  "register.namePh": "O teu nome",
  "register.min8": "Mínimo de 8 caracteres",
  "register.creating": "A criar…",
  "register.haveAccount": "Já tens conta?",
  "register.pwTooShort": "A palavra-passe precisa de pelo menos 8 caracteres",
  "register.cantCreate": "Não foi possível criar a conta",

  // definições
  "settings.title": "Definições",
  "settings.language": "Idioma",
  "settings.languageHelp": "Escolhe o idioma da aplicação.",
  "settings.currency": "Moeda",
  "settings.currencyHelp": "Define o símbolo e o formato usados em toda a aplicação. Atual:",
  "settings.chooseCurrency": "Escolhe a moeda",
  "settings.connectBank": "Ligar Banco",
  "settings.connectBankDesc": "Importar transações automaticamente",
  "settings.categories": "Categorias",
  "settings.categoriesDesc": "Organiza os teus gastos por categoria",

  // banco
  "bank.title": "Ligar Banco",
  "bank.help": "Liga as tuas contas via Open Finance para importar transações automaticamente, sem digitar.",
  "bank.connect": "Ligar banco",
  "bank.secureTitle": "Seguro e sob o teu controlo",
  "bank.secureBody": "A ligação é feita no ambiente do teu próprio banco, via Open Finance — o Saldo nunca vê a tua palavra-passe. Autorizas só a leitura das transações e podes remover quando quiseres.",
  "bank.none": "Ainda não ligaste nenhum banco. Carrega em “Ligar banco” para importar as tuas transações.",
  "bank.linked": "Ligado",
  "bank.sync": "Sincronizar",
  "bank.syncing": "A sincronizar…",
  "bank.chooseBank": "Escolhe o teu banco",
  "bank.searchBank": "Procurar banco…",
  "bank.noBank": "Nenhum banco encontrado.",
  "bank.notSynced": "Ainda não sincronizado",
};

const ptBR: Dict = {
  "common.save": "Salvar",
  "common.saving": "Salvando…",
  "common.cancel": "Cancelar",
  "common.delete": "Excluir",
  "common.back": "Voltar",
  "common.next": "Próximo",
  "common.skip": "Pular",
  "common.close": "Fechar",
  "common.add": "Adicionar",
  "common.loading": "Carregando…",
  "common.error": "Não foi possível carregar os dados.",

  "nav.newEntry": "Novo lançamento",
  "nav.home": "Início",
  "nav.month": "Mês",
  "nav.wallet": "Carteira",
  "nav.goalsInvest": "Metas & Investimentos",
  "nav.settings": "Configurações",
  "nav.tagline": "Finanças Premium",
  "nav.accountOptions": "Opções da conta",
  "nav.redoSetup": "Refazer configuração",
  "nav.deleteAccount": "Excluir conta",
  "nav.logout": "Sair",
  "shell.openMenu": "Abrir menu",

  "login.title": "Bem-vindo de volta",
  "login.subtitle": "Entre para continuar cuidando das suas finanças.",
  "login.email": "E-mail",
  "login.password": "Senha",
  "login.enter": "Entrar",
  "login.entering": "Entrando…",
  "login.noAccount": "Ainda não tem conta?",
  "login.createAccount": "Criar conta",
  "login.cantLogin": "Não foi possível entrar",

  "register.title": "Criar conta",
  "register.subtitle": "Comece a organizar suas finanças em minutos.",
  "register.name": "Nome",
  "register.namePh": "Seu nome",
  "register.min8": "Mínimo de 8 caracteres",
  "register.creating": "Criando…",
  "register.haveAccount": "Já tem conta?",
  "register.pwTooShort": "A senha precisa de ao menos 8 caracteres",
  "register.cantCreate": "Não foi possível criar a conta",

  "settings.title": "Configurações",
  "settings.language": "Idioma",
  "settings.languageHelp": "Escolha o idioma do aplicativo.",
  "settings.currency": "Moeda",
  "settings.currencyHelp": "Define o símbolo e o formato usados em todo o app. Hoje:",
  "settings.chooseCurrency": "Escolha a moeda",
  "settings.connectBank": "Conectar Banco",
  "settings.connectBankDesc": "Importe transações automaticamente",
  "settings.categories": "Categorias",
  "settings.categoriesDesc": "Organize seus gastos por categoria",

  "bank.title": "Conectar Banco",
  "bank.help": "Conecte suas contas via Open Finance para importar transações automaticamente, sem digitar.",
  "bank.connect": "Conectar banco",
  "bank.secureTitle": "Seguro e sob seu controle",
  "bank.secureBody": "A conexão é feita no ambiente do seu próprio banco, via Open Finance — o Saldo nunca vê sua senha. Você autoriza só a leitura das transações e pode remover quando quiser.",
  "bank.none": "Você ainda não conectou nenhum banco. Clique em “Conectar banco” para importar suas transações.",
  "bank.linked": "Conectado",
  "bank.sync": "Sincronizar",
  "bank.syncing": "Sincronizando…",
  "bank.chooseBank": "Escolha seu banco",
  "bank.searchBank": "Buscar banco…",
  "bank.noBank": "Nenhum banco encontrado.",
  "bank.notSynced": "Ainda não sincronizado",
};

const en: Dict = {
  "common.save": "Save",
  "common.saving": "Saving…",
  "common.cancel": "Cancel",
  "common.delete": "Delete",
  "common.back": "Back",
  "common.next": "Next",
  "common.skip": "Skip",
  "common.close": "Close",
  "common.add": "Add",
  "common.loading": "Loading…",
  "common.error": "Couldn't load the data.",

  "nav.newEntry": "New entry",
  "nav.home": "Home",
  "nav.month": "Month",
  "nav.wallet": "Wallet",
  "nav.goalsInvest": "Goals & Investments",
  "nav.settings": "Settings",
  "nav.tagline": "Premium Finance",
  "nav.accountOptions": "Account options",
  "nav.redoSetup": "Redo setup",
  "nav.deleteAccount": "Delete account",
  "nav.logout": "Log out",
  "shell.openMenu": "Open menu",

  "login.title": "Welcome back",
  "login.subtitle": "Sign in to keep managing your finances.",
  "login.email": "Email",
  "login.password": "Password",
  "login.enter": "Sign in",
  "login.entering": "Signing in…",
  "login.noAccount": "Don't have an account?",
  "login.createAccount": "Create account",
  "login.cantLogin": "Couldn't sign in",

  "register.title": "Create account",
  "register.subtitle": "Start organizing your finances in minutes.",
  "register.name": "Name",
  "register.namePh": "Your name",
  "register.min8": "At least 8 characters",
  "register.creating": "Creating…",
  "register.haveAccount": "Already have an account?",
  "register.pwTooShort": "Password must be at least 8 characters",
  "register.cantCreate": "Couldn't create the account",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.languageHelp": "Choose the app language.",
  "settings.currency": "Currency",
  "settings.currencyHelp": "Sets the symbol and format used across the app. Currently:",
  "settings.chooseCurrency": "Choose the currency",
  "settings.connectBank": "Connect Bank",
  "settings.connectBankDesc": "Import transactions automatically",
  "settings.categories": "Categories",
  "settings.categoriesDesc": "Organize your spending by category",

  "bank.title": "Connect Bank",
  "bank.help": "Link your accounts via Open Finance to import transactions automatically, no typing.",
  "bank.connect": "Connect bank",
  "bank.secureTitle": "Secure and under your control",
  "bank.secureBody": "The connection happens inside your own bank's environment, via Open Finance — Saldo never sees your password. You only authorize read access to transactions and can remove it whenever you want.",
  "bank.none": "You haven't connected a bank yet. Tap “Connect bank” to import your transactions.",
  "bank.linked": "Connected",
  "bank.sync": "Sync",
  "bank.syncing": "Syncing…",
  "bank.chooseBank": "Choose your bank",
  "bank.searchBank": "Search bank…",
  "bank.noBank": "No bank found.",
  "bank.notSynced": "Not synced yet",
};

const MESSAGES: Record<Lang, Dict> = { "pt-PT": ptPT, "pt-BR": ptBR, en };

const LOCALE_FOR: Record<Lang, string> = { "pt-PT": "pt-PT", "pt-BR": "pt-BR", en: "en" };

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem("saldo_lang") as Lang | null;
    if (stored && MESSAGES[stored]) return stored;
  } catch {
    /* ignora */
  }
  const nav = (typeof navigator !== "undefined" ? navigator.language : "pt-PT") || "pt-PT";
  if (nav.toLowerCase().startsWith("pt-br")) return "pt-BR";
  if (nav.toLowerCase().startsWith("pt")) return "pt-PT";
  return "en";
}

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const l = detectLang();
    setLocale(LOCALE_FOR[l]); // já ajusta o formato de números/datas antes do 1º render
    return l;
  });

  useEffect(() => {
    setLocale(LOCALE_FOR[lang]);
    try {
      localStorage.setItem("saldo_lang", lang);
      document.documentElement.lang = lang;
    } catch {
      /* ignora */
    }
  }, [lang]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = MESSAGES[lang][key] ?? MESSAGES["pt-PT"][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      return s;
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang: setLangState, t }), [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n fora do LanguageProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useT() {
  return useI18n().t;
}
