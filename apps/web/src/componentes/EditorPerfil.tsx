import {
  CORES_JOGADORES,
  CORES_SECUNDARIAS,
  PADROES_BANDEIRA,
  TAMANHO_DESCRICAO,
  TAMANHO_NOME,
  limparNome,
  type Bandeira as DadosBandeira,
} from '@terra/regras';
import { useState } from 'react';
import { NOMES_CORES, PADROES_INFO } from '../lib/bandeira';
import { chamarFuncao } from '../lib/funcoes';
import type { DadosPerfil } from '../lib/usePerfil';
import Bandeira from './Bandeira';
import EditorEmblema from './EditorEmblema';

type Props = { perfil: DadosPerfil; onSalvo: () => void; onCancelar: () => void };

const ROTULO = 'text-sm text-pergaminho-escuro';

/** Botão redondo de cor; riscado e desligado quando outro jogador da temporada já usa a cor. */
function BolinhaCor({ cor, escolhida, ocupada, onEscolher }: { cor: string; escolhida: boolean; ocupada?: boolean; onEscolher: () => void }) {
  const nome = NOMES_CORES[cor] ?? cor;
  return (
    <button
      type="button"
      onClick={onEscolher}
      disabled={ocupada}
      aria-pressed={escolhida}
      title={ocupada ? `${nome} (em uso)` : nome}
      aria-label={ocupada ? `${nome}, em uso por outro jogador` : nome}
      className={`relative size-9 rounded-full border-2 transition ${escolhida ? 'border-ouro ring-2 ring-ouro/60' : 'border-couro'} disabled:cursor-not-allowed disabled:opacity-30`}
      style={{ background: cor }}
    >
      {ocupada && <span className="absolute inset-0 grid place-items-center text-lg text-noite">✕</span>}
    </button>
  );
}

/** Edição do próprio perfil: nome, bandeira (cor, segunda cor, padrão e emblema) e descrição. */
export default function EditorPerfil({ perfil, onSalvo, onCancelar }: Props) {
  const [nome, setNome] = useState(perfil.nome);
  const [descricao, setDescricao] = useState(perfil.descricao);
  const [bandeira, setBandeira] = useState<DadosBandeira>(perfil.bandeira);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const mudar = (parte: Partial<DadosBandeira>) => setBandeira((b) => ({ ...b, ...parte }));
  const nomeLimpo = limparNome(nome);
  const valido =
    nomeLimpo.length >= TAMANHO_NOME.minimo && nomeLimpo.length <= TAMANHO_NOME.maximo && descricao.trim().length <= TAMANHO_DESCRICAO;

  async function salvar() {
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', {
        acao: 'salvar_perfil',
        nome: nomeLimpo,
        descricao,
        cor: bandeira.cor,
        cor_secundaria: bandeira.corSecundaria,
        padrao: bandeira.padrao,
        emblema: bandeira.emblema,
      });
      onSalvo();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o perfil.');
      setEnviando(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valido && !enviando) void salvar();
      }}
    >
      <div className="flex justify-center rounded-xl border border-couro bg-noite/60 py-5">
        <Bandeira bandeira={bandeira} largura={150} titulo="Prévia da sua bandeira" />
      </div>

      <label className="block space-y-1">
        <span className={ROTULO}>Nome no jogo</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho focus:border-ouro focus:outline-none"
        />
        <span className={`block text-right text-xs tabular-nums ${nomeLimpo.length > TAMANHO_NOME.maximo ? 'text-sangue' : 'text-pergaminho-escuro'}`}>
          {nomeLimpo.length}/{TAMANHO_NOME.maximo}
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className={ROTULO}>Cor (pinta seus territórios no mapa)</legend>
        <div className="flex flex-wrap gap-2">
          {CORES_JOGADORES.map((cor) => (
            <BolinhaCor
              key={cor}
              cor={cor}
              escolhida={bandeira.cor === cor}
              ocupada={perfil.coresEmUso.includes(cor)}
              onEscolher={() => mudar({ cor })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={ROTULO}>Segunda cor</legend>
        <div className="flex flex-wrap gap-2">
          {CORES_SECUNDARIAS.map((cor) => (
            <BolinhaCor key={cor} cor={cor} escolhida={bandeira.corSecundaria === cor} onEscolher={() => mudar({ corSecundaria: cor })} />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={ROTULO}>Padrão</legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {PADROES_BANDEIRA.map((padrao) => (
            <button
              key={padrao}
              type="button"
              onClick={() => mudar({ padrao })}
              aria-pressed={bandeira.padrao === padrao}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 text-[11px] ${bandeira.padrao === padrao ? 'border-ouro bg-ouro/10 text-ouro' : 'border-couro text-pergaminho-escuro hover:border-ouro/50'}`}
            >
              <Bandeira bandeira={{ ...bandeira, padrao }} largura={42} semEmblema />
              {PADROES_INFO[padrao]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className={ROTULO}>Emblema (no centro da bandeira)</legend>
        <EditorEmblema camadas={bandeira.emblema} onMudar={(emblema) => mudar({ emblema })} fundo={bandeira.cor} />
      </fieldset>

      <label className="block space-y-1">
        <span className={ROTULO}>Descrição (todos podem ler)</span>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={4}
          placeholder="Quem é você no reino? Um lema, uma ameaça, uma proposta de aliança…"
          className="w-full resize-y rounded-lg border border-couro bg-noite px-3 py-2 text-sm text-pergaminho focus:border-ouro focus:outline-none"
        />
        <span className={`block text-right text-xs tabular-nums ${descricao.trim().length > TAMANHO_DESCRICAO ? 'text-sangue' : 'text-pergaminho-escuro'}`}>
          {descricao.trim().length}/{TAMANHO_DESCRICAO}
        </span>
      </label>

      {erro && (
        <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 rounded-lg border border-couro px-3 py-2.5 text-sm font-semibold text-pergaminho-escuro hover:border-ouro/60 hover:text-pergaminho"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!valido || enviando}
          className="flex-1 rounded-lg bg-ouro px-3 py-2.5 text-sm font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
        >
          {enviando ? 'Salvando…' : 'Salvar perfil'}
        </button>
      </div>
    </form>
  );
}
