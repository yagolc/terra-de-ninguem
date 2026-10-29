import { useRef, useState, type FormEvent } from 'react';
import Botao from '../componentes/Botao';
import Campo from '../componentes/Campo';
import Moldura from '../componentes/Moldura';
import { chamarFuncao } from '../lib/funcoes';
import { supabase } from '../lib/supabase';

type Aba = 'entrar' | 'convite';
/** 'email' = link de entrada; 'invite' = e-mail de convite (o código de cada um é verificado com o tipo certo). */
type TipoCodigo = 'email' | 'invite';
type Estado =
  | { tipo: 'parado' }
  | { tipo: 'enviando' }
  | { tipo: 'enviado'; email: string; tipoCodigo: TipoCodigo }
  | { tipo: 'erro'; mensagem: string };

/**
 * Quando um link vencido é aberto, ou uma conta Google sem convite tenta entrar, o Supabase volta ao
 * site com o erro no endereço (#error_code=...). Lido ao carregar o módulo, antes de o cliente do
 * Supabase mexer no endereço.
 */
function lerErroDoLink(): string | null {
  const parametros = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
  const codigoErro = parametros.get('error_code');
  const descricao = parametros.get('error_description') ?? '';
  if (!codigoErro && !parametros.get('error')) return null;
  history.replaceState(null, '', location.pathname);
  if (codigoErro === 'otp_expired') {
    return 'Esse link expirou ou já foi usado. Peça um novo abaixo: o e-mail também traz um código para digitar.';
  }
  if (codigoErro === 'signup_disabled' || /signups? not allowed/i.test(descricao)) {
    return 'Essa conta Google não tem convite. Entre com a conta Google do e-mail convidado, ou resgate um convite com ela.';
  }
  return `Não foi possível entrar (${descricao || codigoErro}). Tente de novo.`;
}
const ERRO_DO_LINK = lerErroDoLink();

/** Leva à tela do Google; ao voltar, o Supabase cria a sessão. `email` pré-seleciona a conta certa. */
async function entrarComGoogle(email?: string): Promise<string | null> {
  if (!supabase) return 'O Supabase não está configurado.';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
      queryParams: email ? { login_hint: email } : { prompt: 'select_account' },
    },
  });
  return error ? `Não foi possível abrir o login do Google: ${error.message}` : null;
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function BotaoGoogle({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 font-semibold text-[#1f1f1f] transition hover:bg-[#f2f2f2] focus-visible:ring-2 focus-visible:ring-ouro/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogoGoogle />
      {children}
    </button>
  );
}

export default function Entrada() {
  const [aba, setAba] = useState<Aba>('entrar');
  const [estado, setEstado] = useState<Estado>(ERRO_DO_LINK ? { tipo: 'erro', mensagem: ERRO_DO_LINK } : { tipo: 'parado' });
  const [porEmail, setPorEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [codigoEmail, setCodigoEmail] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [erroCodigo, setErroCodigo] = useState<string | null>(null);
  const formConvite = useRef<HTMLFormElement>(null);

  function trocarAba(nova: Aba) {
    setAba(nova);
    setEstado({ tipo: 'parado' });
  }

  async function google(emailConvidado?: string) {
    setEstado({ tipo: 'enviando' });
    const erro = await entrarComGoogle(emailConvidado);
    // Em caso de sucesso o navegador já está indo para o Google.
    if (erro) setEstado({ tipo: 'erro', mensagem: erro });
  }

  /** Entra digitando o código do e-mail: serve para quem leu o e-mail em outro aparelho. */
  async function entrarComCodigo(evento: FormEvent) {
    evento.preventDefault();
    if (!supabase || estado.tipo !== 'enviado') return;
    setVerificando(true);
    setErroCodigo(null);
    const { error } = await supabase.auth.verifyOtp({
      email: estado.email,
      token: codigoEmail.replace(/\D/g, ''),
      type: estado.tipoCodigo,
    });
    setVerificando(false);
    // Se deu certo, a sessão muda e o App troca para o jogo sozinho.
    if (error) setErroCodigo('Código inválido ou expirado. Confira o e-mail mais recente ou peça um novo.');
  }

  async function entrarPorEmail(evento: FormEvent) {
    evento.preventDefault();
    if (!supabase) return;
    setEstado({ tipo: 'enviando' });

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Só quem já resgatou um convite tem conta; aqui nunca se cria usuário.
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });

    if (error) {
      const semConta = /signups not allowed|user not found/i.test(error.message);
      setEstado({
        tipo: 'erro',
        mensagem: semConta
          ? 'Não há conta com esse e-mail. Se você recebeu um convite, use a aba "Tenho um convite".'
          : `Não foi possível enviar o e-mail: ${error.message}`,
      });
      return;
    }
    setEstado({ tipo: 'enviado', email: email.trim(), tipoCodigo: 'email' });
  }

  /** 'google': cria a conta e já abre o Google com esse e-mail. 'email': manda o convite por e-mail. */
  async function resgatarConvite(metodo: 'google' | 'email') {
    if (!supabase || !formConvite.current?.reportValidity()) return;
    setEstado({ tipo: 'enviando' });

    try {
      await chamarFuncao('resgatar-convite', {
        codigo: codigo.trim(),
        email: email.trim(),
        nome: nome.trim(),
        metodo,
        redirecionarPara: window.location.origin,
      });
    } catch (e) {
      setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não foi possível resgatar o convite.' });
      return;
    }
    if (metodo === 'google') await google(email.trim());
    else setEstado({ tipo: 'enviado', email: email.trim(), tipoCodigo: 'invite' });
  }

  const enviando = estado.tipo === 'enviando';
  const mensagemErro = estado.tipo === 'erro' && (
    <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3.5 py-2.5 text-sm">
      {estado.mensagem}
    </p>
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-10">
      <header className="text-center">
        <img src="/escudo.svg" alt="" className="mx-auto mb-4 size-16 drop-shadow-lg" />
        <h1 className="font-titulo text-3xl font-bold tracking-wide text-ouro sm:text-4xl">Terra de Ninguém</h1>
        <p className="mt-2 text-pergaminho-escuro">Construa, conquiste e traia seus amigos.</p>
      </header>

      <Moldura>
        {!supabase && (
          <p className="mb-5 rounded-lg border border-ouro/40 bg-ouro/10 px-3.5 py-2.5 text-sm text-ouro-claro">
            O Supabase ainda não está configurado. Preencha <code className="font-mono">apps/web/.env.local</code> para o
            login funcionar.
          </p>
        )}

        {estado.tipo === 'enviado' ? (
          <div className="space-y-4 text-center">
            <h2 className="font-titulo text-xl text-ouro">Confira seu e-mail</h2>
            <p className="text-pergaminho-escuro">
              Enviamos um e-mail para <strong className="text-pergaminho">{estado.email}</strong>. Clique no link se ele
              abrir <strong className="text-pergaminho">neste aparelho</strong>, ou digite aqui o código que veio nele.
            </p>
            <form onSubmit={entrarComCodigo} className="space-y-3 text-left">
              <Campo
                id="codigo-email"
                rotulo="Código do e-mail"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                required
                value={codigoEmail}
                onChange={(e) => setCodigoEmail(e.target.value)}
                placeholder="12345678"
              />
              {erroCodigo && (
                <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3.5 py-2.5 text-sm">
                  {erroCodigo}
                </p>
              )}
              <Botao type="submit" disabled={verificando || codigoEmail.replace(/\D/g, '').length < 6}>
                {verificando ? 'Conferindo…' : 'Entrar com o código'}
              </Botao>
            </form>
            <Botao
              variante="discreto"
              onClick={() => {
                setEstado({ tipo: 'parado' });
                setCodigoEmail('');
                setErroCodigo(null);
              }}
            >
              Voltar
            </Botao>
          </div>
        ) : (
          <>
            <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-noite/70 p-1">
              {(
                [
                  ['entrar', 'Entrar'],
                  ['convite', 'Tenho um convite'],
                ] as const
              ).map(([valor, rotulo]) => (
                <button
                  key={valor}
                  role="tab"
                  aria-selected={aba === valor}
                  onClick={() => trocarAba(valor)}
                  className={`rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                    aba === valor ? 'bg-couro text-ouro shadow' : 'text-pergaminho-escuro hover:text-pergaminho'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            {aba === 'entrar' ? (
              <div className="space-y-4">
                <BotaoGoogle onClick={() => void google()} disabled={!supabase || enviando}>
                  {enviando ? 'Abrindo o Google…' : 'Entrar com Google'}
                </BotaoGoogle>
                {!porEmail && mensagemErro}

                {porEmail ? (
                  <form onSubmit={entrarPorEmail} className="space-y-4 border-t border-couro pt-4">
                    <Campo
                      id="email"
                      rotulo="E-mail da sua conta"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@exemplo.com"
                    />
                    {mensagemErro}
                    <Botao type="submit" variante="discreto" disabled={!supabase || enviando}>
                      {enviando ? 'Enviando…' : 'Receber código por e-mail'}
                    </Botao>
                  </form>
                ) : (
                  <button
                    onClick={() => setPorEmail(true)}
                    className="w-full text-center text-sm text-pergaminho-escuro underline-offset-4 hover:text-pergaminho hover:underline"
                  >
                    Não usa Google? Entrar com código por e-mail
                  </button>
                )}
              </div>
            ) : (
              <form
                ref={formConvite}
                onSubmit={(e) => {
                  e.preventDefault();
                  void resgatarConvite('google');
                }}
                className="space-y-4"
              >
                <Campo
                  id="codigo"
                  rotulo="Código do convite"
                  required
                  autoComplete="off"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  placeholder="EX: LOBO-4821"
                />
                <Campo
                  id="nome"
                  rotulo="Seu nome no jogo"
                  required
                  maxLength={24}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como os outros vão te ver"
                />
                <Campo
                  id="email"
                  rotulo="Seu e-mail (o da conta Google, se for entrar com ela)"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@gmail.com"
                />
                {mensagemErro}
                <BotaoGoogle onClick={() => void resgatarConvite('google')} disabled={!supabase || enviando}>
                  {enviando ? 'Criando sua conta…' : 'Resgatar e entrar com Google'}
                </BotaoGoogle>
                <button
                  type="button"
                  onClick={() => void resgatarConvite('email')}
                  disabled={!supabase || enviando}
                  className="w-full text-center text-sm text-pergaminho-escuro underline-offset-4 hover:text-pergaminho hover:underline disabled:opacity-50"
                >
                  Não usa Google? Resgatar com código por e-mail
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-xs text-pergaminho-escuro/70">
              {aba === 'entrar'
                ? 'Use a conta Google do e-mail que recebeu o convite.'
                : 'O jogo é fechado. Peça um código a quem organiza a temporada.'}
            </p>
          </>
        )}
      </Moldura>
    </main>
  );
}
