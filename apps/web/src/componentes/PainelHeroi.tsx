import {
  BALANCEAMENTO,
  MENSAGENS_TREINO_HEROI,
  TIPOS_ESPECIALIDADE,
  bonusHeroi,
  custoTreinoHeroi,
  heroiEmTreino,
  heroiFerido,
  nomeHeroiValido,
  recursosQueFaltam,
  tempoTreinoHeroiMs,
  verificarTreinoHeroi,
  type EstadoCidade,
  type Especialidade,
  type Heroi,
} from '@terra/regras';
import { useState } from 'react';
import { imagemDoHeroi } from '../lib/arte';
import { ESPECIALIDADES_INFO, RECURSOS_INFO, formatarDuracao, formatarNumero } from '../lib/textos';
import Ilustracao from './Ilustracao';

type Props = {
  heroi: Heroi | null;
  cidade: EstadoCidade;
  /** Território da cidade principal (onde o herói treina). */
  cidadeTerritorioId: string | null;
  /** Nome de cada território do jogador, para dizer onde o herói está. */
  nomeDoTerritorio: (id: string) => string | null;
  habitantesLivres: number;
  agora: number;
  ocupado: boolean;
  onRecrutar: (nome: string, especialidade: Especialidade) => void;
  onTreinar: () => void;
};

const H = BALANCEAMENTO.herois;
const pct = (fracao: number) => `+${Math.round(fracao * 100)}%`;

/** Herói do jogador: recrutar (nome e especialidade) ou ver nível, onde está e treinar. */
export default function PainelHeroi(props: Props) {
  return (
    <section className="rounded-xl border border-couro bg-carvao/90 p-4">
      <h2 className="mb-3 font-titulo text-lg text-ouro">🎖️ Herói</h2>
      {props.heroi ? <Status {...props} heroi={props.heroi} /> : <Recrutar {...props} />}
    </section>
  );
}

function Recrutar({ cidade, habitantesLivres, ocupado, onRecrutar }: Props) {
  const [nome, setNome] = useState('');
  const [especialidade, setEspecialidade] = useState<Especialidade | null>(null);
  if (cidade.predios.quartel < H.nivelQuartelMinimo) {
    return <p className="text-sm text-pergaminho-escuro">Construa o Quartel para recrutar um herói.</p>;
  }
  const falta = Math.max(0, H.custoRecrutar.ouro - cidade.recursos.ouro);
  const pronto = nomeHeroiValido(nome) && especialidade && falta === 0 && habitantesLivres >= 1;
  return (
    <div className="space-y-3 text-sm">
      <p className="text-pergaminho-escuro">
        Um por temporada. Ele dá um bônus de {pct(bonusHeroi(1))} por nível (até {pct(bonusHeroi(H.nivelMaximo))}), nunca morre e ocupa 1 de
        população. A especialidade não muda depois.
      </p>
      <input
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        maxLength={H.nomeMaximo}
        placeholder="Nome do herói"
        className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho placeholder:text-pergaminho-escuro/60 focus:border-ouro focus:outline-none"
      />
      <div className="grid gap-2" role="radiogroup" aria-label="Especialidade">
        {TIPOS_ESPECIALIDADE.map((e) => (
          <button
            key={e}
            role="radio"
            aria-checked={especialidade === e}
            onClick={() => setEspecialidade(e)}
            className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-left ${especialidade === e ? 'border-ouro bg-ouro/10' : 'border-couro hover:border-ouro/50'}`}
          >
            {imagemDoHeroi(e) && <Ilustracao src={imagemDoHeroi(e)!} className="size-14 shrink-0" />}
            <span>
              <span className="font-semibold">
                {ESPECIALIDADES_INFO[e].icone} {ESPECIALIDADES_INFO[e].nome}
              </span>
              <span className="block text-xs text-pergaminho-escuro">{ESPECIALIDADES_INFO[e].descricao}</span>
            </span>
          </button>
        ))}
      </div>
      {falta > 0 && <p className="text-xs text-red-300">Faltam {formatarNumero(falta)} {RECURSOS_INFO.ouro.icone}.</p>}
      {habitantesLivres < 1 && <p className="text-xs text-red-300">Falta um habitante livre para virar herói.</p>}
      <button
        onClick={() => especialidade && onRecrutar(nome.trim(), especialidade)}
        disabled={!pronto || ocupado}
        className="w-full rounded-lg bg-ouro px-3 py-2 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
      >
        Recrutar · {formatarNumero(H.custoRecrutar.ouro)} {RECURSOS_INFO.ouro.icone}
      </button>
    </div>
  );
}

function Status({ heroi, cidade, cidadeTerritorioId, nomeDoTerritorio, agora, ocupado, onTreinar }: Props & { heroi: Heroi }) {
  const info = ESPECIALIDADES_INFO[heroi.especialidade];
  const emTreino = heroiEmTreino(heroi, agora);
  const ferido = heroiFerido(heroi, agora);
  const onde =
    heroi.marchaId !== null
      ? 'em marcha'
      : heroi.territorioId === cidadeTerritorioId
        ? 'na cidade'
        : `em ${(heroi.territorioId && nomeDoTerritorio(heroi.territorioId)) ?? 'um território'}`;
  const maximo = heroi.nivel >= H.nivelMaximo;
  const v = verificarTreinoHeroi({ heroi, cidadeTerritorioId, recursos: cidade.recursos, agora });
  const custo = custoTreinoHeroi(heroi.nivel + 1);
  const faltaOuro = recursosQueFaltam(cidade.recursos, custo).ouro;
  const retrato = imagemDoHeroi(heroi.especialidade);

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-3">
        {retrato && <Ilustracao src={retrato} className={`size-24 shrink-0 ${ferido ? 'grayscale' : ''}`} />}
        <div className="space-y-1">
          <p>
            <span className="font-semibold">{heroi.nome}</span> · {info.icone} {info.nome} · nível {heroi.nivel}/{H.nivelMaximo}
          </p>
          <p className="text-pergaminho-escuro">
            {pct(bonusHeroi(heroi.nivel))}: {info.descricao}
          </p>
        </div>
      </div>
      <p>
        📍 {onde}
        {emTreino && <span className="text-ouro-claro"> · treinando, pronto em {formatarDuracao(heroi.treinoProntoEm! - agora)}</span>}
        {ferido && <span className="text-red-300"> · ferido, recupera em {formatarDuracao(heroi.feridoAte! - agora)}</span>}
      </p>
      {!maximo && (
        <>
          <button
            onClick={onTreinar}
            disabled={!v.ok || ocupado}
            className="w-full rounded-lg border border-ouro/60 px-3 py-1.5 font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:border-couro disabled:text-pergaminho-escuro"
          >
            Treinar para nível {heroi.nivel + 1} · {formatarNumero(custo.ouro)} {RECURSOS_INFO.ouro.icone} · ⏱{' '}
            {formatarDuracao(tempoTreinoHeroiMs(heroi.nivel + 1))}
          </button>
          {!v.ok && !emTreino && (
            <p className="text-xs text-pergaminho-escuro">
              {v.motivo === 'recursos_insuficientes'
                ? `Faltam ${formatarNumero(faltaOuro)} ${RECURSOS_INFO.ouro.icone}.`
                : MENSAGENS_TREINO_HEROI[v.motivo]}
            </p>
          )}
        </>
      )}
      {maximo && <p className="text-xs text-ouro-claro">Nível máximo.</p>}
    </div>
  );
}
