import { useState, type FormEvent } from 'react';
import Botao from '../componentes/Botao';
import Campo from '../componentes/Campo';
import Moldura from '../componentes/Moldura';
import { chamarFuncao } from '../lib/funcoes';
import { supabase } from '../lib/supabase';

type Aba = 'entrar' | 'convite';
type Estado = { tipo: 'parado' } | { tipo: 'enviando' } | { tipo: 'enviado'; email: string } | { tipo: 'erro'; mensagem: string };

export default function Entrada() {
  const [aba, setAba] = useState<Aba>('entrar');
  const [estado, setEstado] = useState<Estado>({ tipo: 'parado' });
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');

  function trocarAba(nova: Aba) {
    setAba(nova);
    setEstado({ tipo: 'parado' });
  }

  async function entrar(evento: FormEvent) {
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
          : `Não foi possível enviar o link: ${error.message}`,
      });
      return;
    }
    setEstado({ tipo: 'enviado', email: email.trim() });
  }

  async function resgatarConvite(evento: FormEvent) {
    evento.preventDefault();
    if (!supabase) return;
    setEstado({ tipo: 'enviando' });

    try {
      await chamarFuncao('resgatar-convite', {
        codigo: codigo.trim(),
        email: email.trim(),
        nome: nome.trim(),
        redirecionarPara: window.location.origin,
      });
    } catch (e) {
      setEstado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : 'Não foi possível resgatar o convite.' });
      return;
    }
    setEstado({ tipo: 'enviado', email: email.trim() });
  }

  const enviando = estado.tipo === 'enviando';

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
              Enviamos um link de entrada para <strong className="text-pergaminho">{estado.email}</strong>. Abra-o neste
              mesmo aparelho.
            </p>
            <Botao variante="discreto" onClick={() => setEstado({ tipo: 'parado' })}>
              Usar outro e-mail
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
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    aba === valor ? 'bg-couro text-ouro shadow' : 'text-pergaminho-escuro hover:text-pergaminho'
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <form onSubmit={aba === 'entrar' ? entrar : resgatarConvite} className="space-y-4">
              {aba === 'convite' && (
                <>
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
                </>
              )}
              <Campo
                id="email"
                rotulo="E-mail"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@exemplo.com"
              />

              {estado.tipo === 'erro' && (
                <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3.5 py-2.5 text-sm">
                  {estado.mensagem}
                </p>
              )}

              <Botao type="submit" disabled={!supabase || enviando}>
                {enviando ? 'Enviando…' : aba === 'entrar' ? 'Receber link de entrada' : 'Resgatar convite'}
              </Botao>
            </form>

            <p className="mt-5 text-center text-xs text-pergaminho-escuro/70">
              {aba === 'entrar'
                ? 'Sem senha: você recebe um link mágico por e-mail.'
                : 'O jogo é fechado. Peça um código a quem organiza a temporada.'}
            </p>
          </>
        )}
      </Moldura>
    </main>
  );
}
