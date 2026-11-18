// Música de fundo do jogo. Uma instância só para a página inteira: escolhe a faixa pelo horário do aparelho e pelo
// momento do jogo (aba aberta, inimigos à vista, fim de temporada), faz a transição suave entre uma e outra e guarda
// volume e mudo no aparelho. O som passa por Web Audio (um ganho por faixa e um geral) porque o iPhone ignora o
// `volume` do <audio>. Só começa depois do primeiro toque na página (os navegadores bloqueiam som antes disso), pausa
// quando a aba some e não baixa nada enquanto está mudo. Os arquivos ficam em `public/musica` (fora do cache do app).
import { useSyncExternalStore } from 'react';

/** Faixas de RandomMind (opengameart.org), licença CC0. */
export const FAIXAS = {
  'taverna-da-torre': { titulo: 'A Taverna da Torre Velha', original: 'Medieval: The Old Tower Inn', pagina: 'medieval-the-old-tower-inn' },
  'banquete-do-rei': { titulo: 'O Banquete do Rei', original: "Medieval: King's Feast", pagina: 'medieval-kings-feast' },
  'conto-do-bardo': { titulo: 'O Conto do Bardo', original: "Medieval: The Bard's Tale", pagina: 'medieval-the-bards-tale' },
  'dia-de-feira': { titulo: 'Dia de Feira', original: 'Medieval: Market Day', pagina: 'medieval-market-day' },
  exploracao: { titulo: 'Exploração', original: 'Medieval: Exploration', pagina: 'medieval-exploration' },
  colheita: { titulo: 'Tempo de Colheita', original: 'Medieval: Harvest Season', pagina: 'medieval-harvest-season' },
  'danca-do-menestrel': { titulo: 'Dança do Menestrel', original: 'Medieval: Minstrel Dance', pagina: 'medieval-minstrel-dance' },
  festejo: { titulo: 'Festejo', original: 'Medieval: Rejoicing', pagina: 'medieval-rejoicing' },
  'lua-nascente': { titulo: 'Lua Nascente', original: 'Fantasy: Rising Moon', pagina: 'fantasy-rising-moon' },
  batalha: { titulo: 'Batalha', original: 'Medieval: Battle', pagina: 'medieval-battle' },
  vitoria: { titulo: 'Vitória', original: 'Medieval: Victory Theme', pagina: 'medieval-victory-theme' },
  derrota: { titulo: 'Derrota', original: 'Medieval: Defeat Theme', pagina: 'medieval-defeat-theme' },
  lamento: { titulo: 'Lamento pela Alma de um Guerreiro', original: "Fantasy: Lament for a Warrior's Soul", pagina: 'fantasy-lament-for-a-warriors-soul' },
} as const;

export type IdFaixa = keyof typeof FAIXAS;

/** Parte do dia pelo relógio do aparelho. */
export type Periodo = 'manha' | 'tarde' | 'noite' | 'altaNoite';

export function periodoDoDia(hora: number): Periodo {
  if (hora >= 5 && hora < 12) return 'manha';
  if (hora >= 12 && hora < 18) return 'tarde';
  if (hora >= 18 && hora < 22) return 'noite';
  return 'altaNoite';
}

type Peso = { base: number; periodo?: Partial<Record<Periodo, number>>; aba?: Partial<Record<string, number>> };

/**
 * Chance de cada faixa entrar na sequência normal. Todas podem tocar a qualquer hora (`base`), mas cada uma tem
 * prioridade no horário que combina com ela (`periodo`); a aba aberta multiplica (`aba`).
 */
const PESOS: Partial<Record<IdFaixa, Peso>> = {
  'lua-nascente': { base: 1, periodo: { altaNoite: 10 } },
  'banquete-do-rei': { base: 2, periodo: { noite: 4, altaNoite: 3 } },
  'taverna-da-torre': { base: 2, periodo: { noite: 5 } },
  'conto-do-bardo': { base: 2, periodo: { tarde: 3, altaNoite: 2 } },
  'dia-de-feira': { base: 2, periodo: { manha: 4, tarde: 4, altaNoite: 1 }, aba: { cidade: 1.5 } },
  exploracao: { base: 2, periodo: { manha: 3, tarde: 3 }, aba: { mapa: 3 } },
  colheita: { base: 2, periodo: { manha: 5, altaNoite: 1 }, aba: { cidade: 1.5 } },
  'danca-do-menestrel': { base: 2, periodo: { tarde: 3, noite: 4 } },
  festejo: { base: 1, periodo: { noite: 3 } },
};

/** Peso de cada faixa da sequência normal, na hora e na aba dadas (a faixa que acabou de tocar fica de fora). */
export function pesosDasFaixas(periodo: Periodo, aba: string, anterior: IdFaixa | null): [IdFaixa, number][] {
  return (Object.entries(PESOS) as [IdFaixa, Peso][])
    .filter(([id]) => id !== anterior)
    .map(([id, p]) => [id, (p.periodo?.[periodo] ?? p.base) * (p.aba?.[aba] ?? 1)]);
}

/** Sorteio pelos pesos; `sorte` vai de 0 a 1. */
export function sortearFaixa(pesos: [IdFaixa, number][], sorte: number): IdFaixa {
  const total = pesos.reduce((s, [, p]) => s + p, 0);
  let alvo = sorte * total;
  for (const [id, p] of pesos) {
    alvo -= p;
    if (alvo < 0) return id;
  }
  return pesos[pesos.length - 1]![0];
}

export type EstadoMusica = { volume: number; mudo: boolean; faixa: IdFaixa | null };

const CHAVE = 'terra:musica';
const VOLUME_INICIAL = 0.3;
const TRANSICAO_S = 2.5;

function lerPreferencias(): { volume: number; mudo: boolean } {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? 'null') as { volume?: unknown; mudo?: unknown } | null;
    const volume = typeof salvo?.volume === 'number' && salvo.volume >= 0 && salvo.volume <= 1 ? salvo.volume : VOLUME_INICIAL;
    return { volume, mudo: salvo?.mudo === true };
  } catch {
    return { volume: VOLUME_INICIAL, mudo: false };
  }
}

type Canal = { el: HTMLAudioElement; ganho: GainNode };

class Musica {
  private estado: EstadoMusica;
  private ouvintes = new Set<() => void>();
  private ctx: AudioContext | null = null;
  private mestre: GainNode | null = null;
  private canais: Canal[] = [];
  private ativo = 0;
  private liberado = false;
  // Momento do jogo, que decide as faixas obrigatórias e o peso das outras.
  private aba = 'cidade';
  private ameaca = false;
  private fim: 'vitoria' | 'derrota' | null = null;
  // Vitória ou derrota de um relatório tocando por cima da sequência (uma vez só).
  private tema: IdFaixa | null = null;
  private espera: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.estado = { ...lerPreferencias(), faixa: null };
    if (typeof document === 'undefined') return;
    // O primeiro toque libera o som. Os seguintes religam o áudio que o navegador suspendeu sozinho (o iPhone só deixa
    // voltar dentro de um toque, então a volta pela troca de aba às vezes fica esperando o próximo).
    const aoTocar = () => {
      if (this.estado.mudo || document.hidden) {
        this.liberado = true;
        return;
      }
      if (!this.liberado || this.ctx?.state !== 'running') {
        this.liberado = true;
        this.tocar();
      }
    };
    addEventListener('pointerdown', aoTocar, true);
    addEventListener('keydown', aoTocar, true);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pausar();
      else if (this.liberado && !this.estado.mudo) this.tocar();
    });
  }

  assinar = (ouvinte: () => void) => {
    this.ouvintes.add(ouvinte);
    return () => void this.ouvintes.delete(ouvinte);
  };

  ler = () => this.estado;

  private mudar(parcial: Partial<EstadoMusica>) {
    this.estado = { ...this.estado, ...parcial };
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ volume: this.estado.volume, mudo: this.estado.mudo }));
    } catch {
      // Sem armazenamento (aba anônima no iPhone, por exemplo): vale só até fechar.
    }
    this.ouvintes.forEach((o) => o());
  }

  alternarMudo() {
    this.liberado = true;
    if (this.estado.mudo) {
      // Mudo pelo controle de volume no zero: volta no volume inicial.
      this.mudar({ mudo: false, volume: this.estado.volume > 0 ? this.estado.volume : VOLUME_INICIAL });
      if (this.mestre && this.ctx) this.mestre.gain.setValueAtTime(this.ganhoDoVolume(), this.ctx.currentTime);
      this.tocar();
    } else {
      this.mudar({ mudo: true });
      this.pausar();
    }
  }

  definirVolume(volume: number) {
    const v = Math.min(1, Math.max(0, volume));
    const estavaMudo = this.estado.mudo;
    this.mudar({ volume: v, mudo: v === 0 });
    if (this.mestre && this.ctx) this.mestre.gain.setTargetAtTime(this.ganhoDoVolume(), this.ctx.currentTime, 0.05);
    this.liberado = true;
    if (v === 0) this.pausar();
    else if (estavaMudo || this.ctx?.state !== 'running') this.tocar();
  }

  /** Pula para outra faixa da sequência (as obrigatórias, como a de batalha, voltam se ainda valem). */
  proxima() {
    this.tema = null;
    if (!this.estado.mudo && this.liberado) this.trocarPara(this.escolher(true));
  }

  /** Aba aberta e se há tropas inimigas à vista das torres (toca a de batalha enquanto houver). */
  definirMomento(aba: string, ameaca: boolean) {
    this.aba = aba;
    if (ameaca === this.ameaca) return;
    this.ameaca = ameaca;
    this.reavaliar();
  }

  /** Tela de fim de temporada: o vencedor ouve o festejo; os outros, o lamento. null ao sair dela. */
  definirFim(fim: 'vitoria' | 'derrota' | null) {
    if (fim === this.fim) return;
    this.fim = fim;
    this.reavaliar();
  }

  /** Tema curto de vitória ou derrota ao abrir um relatório de batalha novo; depois a sequência continua. */
  tocarTema(tema: 'vitoria' | 'derrota') {
    if (this.estado.mudo || !this.liberado || this.fim) return;
    this.tema = tema;
    this.trocarPara(tema);
  }

  /** Troca na hora se a faixa obrigatória mudou (entrou ou saiu a batalha, o fim de temporada). */
  private reavaliar() {
    if (this.estado.mudo || !this.liberado || this.tema) return;
    const obrigatoria = this.obrigatoria();
    const atual = this.estado.faixa;
    if (obrigatoria) {
      if (obrigatoria !== atual) this.trocarPara(obrigatoria);
      return;
    }
    // Acabou a ameaça ou saiu do fim de temporada: a batalha e o lamento param logo (o festejo é da sequência normal).
    if (atual === 'batalha' || atual === 'lamento') this.trocarPara(this.escolher(false));
  }

  private obrigatoria(): IdFaixa | null {
    if (this.fim) return this.fim === 'vitoria' ? 'festejo' : 'lamento';
    if (this.ameaca) return 'batalha';
    return null;
  }

  private escolher(pular: boolean): IdFaixa {
    const obrigatoria = this.obrigatoria();
    if (obrigatoria && !pular) return obrigatoria;
    const periodo = periodoDoDia(new Date().getHours());
    return sortearFaixa(pesosDasFaixas(periodo, this.aba, this.estado.faixa), Math.random());
  }

  private ganhoDoVolume() {
    // Curva quadrática: o meio do controle soa como metade do volume.
    return this.estado.volume * this.estado.volume;
  }

  private prepararAudio(): boolean {
    if (this.ctx) return true;
    const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return false;
    this.ctx = new Contexto();
    this.mestre = this.ctx.createGain();
    this.mestre.gain.value = this.ganhoDoVolume();
    this.mestre.connect(this.ctx.destination);
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.preload = 'none';
      const ganho = this.ctx.createGain();
      ganho.gain.value = 0;
      this.ctx.createMediaElementSource(el).connect(ganho);
      ganho.connect(this.mestre);
      el.addEventListener('ended', () => {
        if (this.canais[this.ativo]?.el === el) this.aoTerminar();
      });
      el.addEventListener('error', () => {
        if (this.canais[this.ativo]?.el !== el) return;
        // Arquivo que não carregou (sem internet, por exemplo): tenta outra daqui a pouco.
        if (this.espera) clearTimeout(this.espera);
        this.espera = setTimeout(() => this.aoTerminar(), 15_000);
      });
      this.canais.push({ el, ganho });
    }
    return true;
  }

  private aoTerminar() {
    this.tema = null;
    if (this.estado.mudo || document.hidden) return;
    this.trocarPara(this.escolher(false));
  }

  private tocar() {
    if (!this.prepararAudio() || !this.ctx) return;
    void this.ctx.resume();
    const canal = this.canais[this.ativo];
    if (canal && this.estado.faixa && canal.el.src && !canal.el.ended) {
      // Volta de onde parou (aba escondida, mudo), se a faixa ainda serve.
      const obrigatoria = this.tema ? null : this.obrigatoria();
      if (!obrigatoria || obrigatoria === this.estado.faixa) {
        canal.ganho.gain.setTargetAtTime(1, this.ctx.currentTime, 0.3);
        void canal.el.play().catch(() => {});
        return;
      }
    }
    this.trocarPara(this.escolher(false));
  }

  private pausar() {
    for (const c of this.canais) c.el.pause();
    void this.ctx?.suspend();
  }

  private trocarPara(id: IdFaixa) {
    if (!this.prepararAudio() || !this.ctx) return;
    if (this.espera) clearTimeout(this.espera);
    void this.ctx.resume();
    const agora = this.ctx.currentTime;
    const antigo = this.canais[this.ativo]!;
    this.ativo = 1 - this.ativo;
    const novo = this.canais[this.ativo]!;
    // A antiga some aos poucos e para; a nova entra do silêncio.
    antigo.ganho.gain.cancelScheduledValues(agora);
    antigo.ganho.gain.setValueAtTime(antigo.ganho.gain.value, agora);
    antigo.ganho.gain.linearRampToValueAtTime(0, agora + TRANSICAO_S);
    const elAntigo = antigo.el;
    setTimeout(() => {
      if (this.canais[this.ativo]?.el !== elAntigo) elAntigo.pause();
    }, TRANSICAO_S * 1000 + 100);
    novo.el.src = `/musica/${id}.mp3`;
    novo.ganho.gain.cancelScheduledValues(agora);
    novo.ganho.gain.setValueAtTime(0, agora);
    novo.ganho.gain.linearRampToValueAtTime(1, agora + TRANSICAO_S);
    void novo.el.play().catch(() => {});
    this.mudar({ faixa: id });
  }
}

export const musica = new Musica();

/** Volume, mudo e a faixa tocando, para o controle do cabeçalho. */
export function useMusica(): EstadoMusica {
  return useSyncExternalStore(musica.assinar, musica.ler);
}
