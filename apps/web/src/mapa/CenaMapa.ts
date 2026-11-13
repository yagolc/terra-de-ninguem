import { estoqueVila, totalRecursos } from '@terra/regras';
import Phaser from 'phaser';
import { bandeiraDoJogador, formasDoPadrao } from '../lib/bandeira';
import { chaveDaBandeira, svgDaBandeira } from '../lib/svgBandeira';
import { COR_NEUTRA, corDoJogador, type DadosMapa, type JogadorMapa, type TerritorioMapa } from '../lib/useMapa';

/** Pixels por légua no "mundo" do Phaser; a câmera aplica o zoom por cima. */
const ESCALA = 20;
const CORES_TERRENO = { planicie: 0x7d8a45, floresta: 0x3d5e36, montanha: 0x6e6257 } as const;
const ICONE_TERRENO = { planicie: '', floresta: '🌲', montanha: '⛰️' } as const;
const ICONE_ESTRUTURA = { torre: '🗼', palicada: '🪵', entreposto: '🏪', acampamento: '⛺' } as const;
const COR_AMEACA = 0xff4d3d;
const COR_HORDA = 0x9b1b30;
const ARRASTO_MINIMO = 6;
/** Bandeirinha no mapa (3 × 2) e quantas vezes maior a imagem é desenhada, para ficar nítida no zoom. */
const BANDEIRA = { largura: 27, altura: 18, nitidez: 4 } as const;

const cor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const toPoints = (xy: number[]) => xy.flatMap((v, i) => (i % 2 === 0 ? [new Phaser.Geom.Point(v, xy[i + 1]!)] : []));

export type OpcoesCena = {
  dados: DadosMapa;
  meuId: string;
  onSelecionar: (id: string | null) => void;
};

/**
 * Desenha o mapa (territórios, regiões, donos e cidades) e cuida de arrastar, zoom e toque.
 * O React manda dados e seleção; a cena devolve o território tocado por `onSelecionar`.
 */
export class CenaMapa extends Phaser.Scene {
  private opcoes: OpcoesCena;
  private selecionado: string | null = null;
  private formas = new Map<string, Phaser.Geom.Polygon>();
  private camadaMapa?: Phaser.GameObjects.Graphics;
  private camadaDestaque?: Phaser.GameObjects.Graphics;
  private camadaMarchas?: Phaser.GameObjects.Graphics;
  private camadaBandeiras?: Phaser.GameObjects.Graphics;
  private rotulos: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
  /** Bandeiras (imagem gerada do SVG do perfil) sendo carregadas, ou que falharam: não tenta de novo. */
  private bandeirasCarregando = new Set<string>();
  private redesenhoPendente = false;
  private arrastou = false;
  private mexeu = false;
  private distanciaPinca: number | null = null;
  private zoomMinimo = 0.2;

  constructor(opcoes: OpcoesCena) {
    super('mapa');
    this.opcoes = opcoes;
  }

  create() {
    this.input.addPointer(1); // dois dedos para a pinça
    this.camadaMapa = this.add.graphics();
    this.camadaDestaque = this.add.graphics();
    this.camadaBandeiras = this.add.graphics();
    this.camadaMarchas = this.add.graphics();
    this.desenhar();
    this.enquadrar();

    // Reenquadra ao mudar de tamanho, a menos que o jogador já tenha mexido no zoom ou na posição.
    this.scale.on('resize', () => (this.mexeu ? this.limitarZoom() : this.enquadrar()));
    this.input.on('pointerdown', () => (this.arrastou = false));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => this.mover(p));
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.distanciaPinca = null;
      if (!this.arrastou) this.tocar(p);
    });
    this.input.on('wheel', (p: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      this.aplicarZoom(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1), p.x, p.y);
    });
  }

  atualizar(opcoes: OpcoesCena) {
    this.opcoes = opcoes;
    if (this.camadaMapa) this.desenhar();
  }

  selecionar(id: string | null) {
    this.selecionado = id;
    if (this.camadaDestaque) this.desenharDestaques();
  }

  private desenhar() {
    const { dados } = this.opcoes;
    const g = this.camadaMapa!;
    g.clear();
    this.rotulos.forEach((r) => r.destroy());
    this.rotulos = [];
    this.formas.clear();

    for (const t of dados.territorios) {
      const forma = new Phaser.Geom.Polygon(t.poligono.flatMap(([x, y]) => [x * ESCALA, y * ESCALA]));
      this.formas.set(t.id, forma);
      g.fillStyle(CORES_TERRENO[t.terreno], 1);
      g.fillPoints(forma.points, true);
      const dono = t.dono_id ? dados.jogadores.get(t.dono_id) : null;
      // Território com dono fica bem pintado com a cor dele; neutro só escurece o terreno.
      g.fillStyle(dono ? cor(corDoJogador(dono)) : cor(COR_NEUTRA), dono ? 0.75 : 0.35);
      g.fillPoints(forma.points, true);
      g.lineStyle(1.5, 0x1c1410, 0.9);
      g.strokePoints(forma.points, true);
    }
    this.desenharBordasDeRegiao(g, dados.territorios);
    this.desenharBarreiras(g);
    this.desenharEstradas(g);

    this.camadaBandeiras!.clear();
    for (const t of dados.territorios) this.rotular(t);
    // Caveira na borda do mapa, de onde vem cada horda bárbara a caminho.
    for (const h of dados.hordas.filter((h) => h.aCaminho)) {
      const caveira = this.add.text(h.origem.x * ESCALA, h.origem.y * ESCALA, '☠️', { fontSize: '24px' });
      this.rotulos.push(caveira.setOrigin(0.5));
    }
    this.desenharDestaques();
    this.desenharMarchas();
  }

  /**
   * Setas das marchas do jogador (dourada para ataque, verde para tropas voltando, azul para movimento,
   * lilás para batedor) e, em vermelho grosso, as marchas inimigas que as torres dele avistam.
   */
  private desenharMarchas() {
    const g = this.camadaMarchas!;
    g.clear();
    const { dados } = this.opcoes;
    for (const m of dados.marchas) {
      const batedor = m.tipo === 'reconhecimento' || (m.tipo === 'retorno' && m.tropas.lanceiro + m.tropas.arqueiro + m.tropas.cavalaria === 0);
      const cor = batedor ? 0xc39bd3 : m.tipo === 'retorno' ? 0x8fd18a : m.tipo === 'movimento' ? 0x7fb3e8 : 0xe8c475;
      this.desenharSeta(g, m.origemId, m.destinoId, cor, 3);
    }
    for (const m of dados.marchasVistas) this.desenharSeta(g, m.origemId, m.destinoId, COR_AMEACA, 4);
    // Hordas bárbaras a caminho (públicas): seta grossa vinho, da borda do mapa até o alvo.
    for (const h of dados.hordas.filter((h) => h.aCaminho)) {
      const alvo = dados.territorios.find((t) => t.id === h.territorioId);
      if (alvo) this.desenharSetaEntre(g, h.origem.x, h.origem.y, alvo.x, alvo.y, COR_HORDA, 5);
    }
  }

  private desenharSeta(g: Phaser.GameObjects.Graphics, origemId: string, destinoId: string, cor: number, espessura: number) {
    const { dados } = this.opcoes;
    const de = dados.territorios.find((t) => t.id === origemId);
    const para = dados.territorios.find((t) => t.id === destinoId);
    if (!de || !para) return;
    this.desenharSetaEntre(g, de.x, de.y, para.x, para.y, cor, espessura);
  }

  /** Seta entre dois pontos do mapa (em léguas). */
  private desenharSetaEntre(g: Phaser.GameObjects.Graphics, deX: number, deY: number, paraX: number, paraY: number, cor: number, espessura: number) {
    const [x1, y1, x2, y2] = [deX * ESCALA, deY * ESCALA, paraX * ESCALA, paraY * ESCALA];
    const angulo = Math.atan2(y2 - y1, x2 - x1);
    // Para um pouco antes do centro do alvo, para não cobrir o nome.
    const fimX = x2 - Math.cos(angulo) * 26;
    const fimY = y2 - Math.sin(angulo) * 26;
    g.lineStyle(espessura + 3, 0x1c1410, 0.8);
    g.lineBetween(x1, y1, fimX, fimY);
    g.lineStyle(espessura, cor, 1);
    g.lineBetween(x1, y1, fimX, fimY);
    g.fillStyle(cor, 1);
    g.fillTriangle(
      fimX + Math.cos(angulo) * 12,
      fimY + Math.sin(angulo) * 12,
      fimX + Math.cos(angulo + 2.5) * 12,
      fimY + Math.sin(angulo + 2.5) * 12,
      fimX + Math.cos(angulo - 2.5) * 12,
      fimY + Math.sin(angulo - 2.5) * 12,
    );
  }

  /** Arestas entre regiões diferentes (ou na borda do mapa) em dourado. */
  private desenharBordasDeRegiao(g: Phaser.GameObjects.Graphics, territorios: TerritorioMapa[]) {
    const arestas = new Map<string, { a: [number, number]; b: [number, number]; regioes: string[] }>();
    for (const t of territorios) {
      t.poligono.forEach((a, i) => {
        const b = t.poligono[(i + 1) % t.poligono.length]!;
        const chave = [a.join(','), b.join(',')].sort().join('|');
        const aresta = arestas.get(chave) ?? { a, b, regioes: [] };
        aresta.regioes.push(t.regiao_id);
        arestas.set(chave, aresta);
      });
    }
    g.lineStyle(4, 0xd4a64a, 0.9);
    for (const { a, b, regioes } of arestas.values()) {
      if (regioes.length === 1 || regioes[0] !== regioes[1]) {
        g.lineBetween(a[0] * ESCALA, a[1] * ESCALA, b[0] * ESCALA, b[1] * ESCALA);
      }
    }
  }

  /**
   * Rios (azul) e cordilheiras (escuras): a aresta que os dois vizinhos dividem, por cima da borda das regiões.
   * Não são fronteira: ninguém ataca nem move por ali.
   */
  private desenharBarreiras(g: Phaser.GameObjects.Graphics) {
    const { dados } = this.opcoes;
    if (dados.barreiras.length === 0) return;
    const porId = new Map(dados.territorios.map((t) => [t.id, t]));
    const chave = (p: [number, number]) => p.join(',');
    for (const { a, b, tipo } of dados.barreiras) {
      const ta = porId.get(a);
      const tb = porId.get(b);
      if (!ta || !tb) continue;
      const deB = new Set(tb.poligono.map(chave));
      ta.poligono.forEach((p, i) => {
        const q = ta.poligono[(i + 1) % ta.poligono.length]!;
        if (!deB.has(chave(p)) || !deB.has(chave(q))) return;
        const [x1, y1, x2, y2] = [p[0] * ESCALA, p[1] * ESCALA, q[0] * ESCALA, q[1] * ESCALA];
        if (tipo === 'rio') {
          g.lineStyle(9, 0x1c3a5e, 0.9);
          g.lineBetween(x1, y1, x2, y2);
          g.lineStyle(6, 0x3a7bd5, 1);
          g.lineBetween(x1, y1, x2, y2);
        } else {
          g.lineStyle(11, 0x1c1410, 0.95);
          g.lineBetween(x1, y1, x2, y2);
          g.lineStyle(5, 0x6b5d50, 1);
          g.lineBetween(x1, y1, x2, y2);
        }
      });
    }
  }

  /**
   * Estradas (públicas): um caminho de terra batida entre o centro de dois vizinhos que têm estrada; meio apagado
   * se uma delas ainda está em obra. Estrada sem vizinha com estrada vira um trecho curto saindo do centro.
   */
  private desenharEstradas(g: Phaser.GameObjects.Graphics) {
    const { dados } = this.opcoes;
    const agora = Date.now();
    const porId = new Map(dados.territorios.map((t) => [t.id, t]));
    const trecho = (x1: number, y1: number, x2: number, y2: number, pronta: boolean) => {
      g.lineStyle(7, 0x1c1410, pronta ? 0.7 : 0.35);
      g.lineBetween(x1, y1, x2, y2);
      g.lineStyle(4, 0xd9b77a, pronta ? 1 : 0.45);
      g.lineBetween(x1, y1, x2, y2);
    };
    for (const [id, estrada] of dados.estradas) {
      const t = porId.get(id);
      if (!t) continue;
      const vizinhasComEstrada = (dados.vizinhos.get(id) ?? []).filter((v) => dados.estradas.has(v));
      for (const v of vizinhasComEstrada) {
        const outra = porId.get(v);
        if (!outra || v < id) continue; // cada par uma vez só
        const pronta = estrada.prontoEm <= agora && dados.estradas.get(v)!.prontoEm <= agora;
        trecho(t.x * ESCALA, t.y * ESCALA, outra.x * ESCALA, outra.y * ESCALA, pronta);
      }
      if (vizinhasComEstrada.length === 0) {
        const x = t.x * ESCALA;
        const y = t.y * ESCALA;
        trecho(x - 22, y + 24, x + 22, y + 24, estrada.prontoEm <= agora);
      }
    }
  }

  private rotular(t: TerritorioMapa) {
    const estilo = {
      fontFamily: 'Georgia, serif',
      color: '#f1e6cf',
      stroke: '#1c1410',
      strokeThickness: 4,
      align: 'center',
    };
    const x = t.x * ESCALA;
    const y = t.y * ESCALA;
    const dono = t.dono_id ? this.opcoes.dados.jogadores.get(t.dono_id) : null;
    if (t.cidade_principal) {
      // Cidade: castelo com a bandeira do dono ao lado.
      this.rotulos.push(this.add.text(x + 9, y - 16, '🏰', { ...estilo, fontSize: '20px' }).setOrigin(0.5));
      if (dono) this.desenharBandeira(x - 28, y - 14, dono);
      // Coroa sobre a bandeira do herdeiro do trono caído (vencedor da temporada anterior).
      if (dono && dono.id === this.opcoes.dados.herdeiroId) {
        this.rotulos.push(this.add.text(x - 15, y - 42, '👑', { ...estilo, fontSize: '16px', strokeThickness: 0 }).setOrigin(0.5));
      }
    } else if (dono) {
      // Território conquistado: a bandeira do dono no lugar do ícone de terreno.
      this.desenharBandeira(x - 12, y - 14, dono);
    } else if (ICONE_TERRENO[t.terreno]) {
      this.rotulos.push(this.add.text(x, y - 16, ICONE_TERRENO[t.terreno], { ...estilo, fontSize: '20px' }).setOrigin(0.5));
    }
    this.rotulos.push(this.add.text(x, y + 6, t.nome, { ...estilo, fontSize: '13px', wordWrap: { width: 110 } }).setOrigin(0.5));
    // Estrutura do território num canto do ícone; meio apagada enquanto está em construção. As dos outros
    // jogadores são secretas: aparecem como ❓ até um batedor descobrir.
    const estrutura = this.opcoes.dados.estruturas.get(t.id);
    if (estrutura) {
      // Selo redondo escuro para o ícone se destacar sobre qualquer cor de território.
      const [ix, iy] = [x + (t.cidade_principal ? 32 : 28), y - 14];
      const emObra = estrutura.prontoEm !== null && estrutura.prontoEm > Date.now();
      const g = this.camadaBandeiras!;
      g.fillStyle(0x1c1410, emObra ? 0.55 : 0.9);
      g.fillCircle(ix, iy, 12);
      g.lineStyle(2, emObra ? 0x8a7a66 : 0xffe08a, 1);
      g.strokeCircle(ix, iy, 12);
      const icone = this.add.text(ix, iy, estrutura.tipo ? ICONE_ESTRUTURA[estrutura.tipo] : '❓', { ...estilo, fontSize: '14px', strokeThickness: 0 });
      this.rotulos.push(icone.setOrigin(0.5).setAlpha(emObra ? 0.5 : 1));
    }
    // Povoado no canto esquerdo: vila (borda clara) ou cidade livre (borda dourada, maior). Vila neutra
    // recém-saqueada aparece apagada até o estoque voltar a encher.
    // Herói do próprio jogador (só ele vê): medalha embaixo, à direita do nome.
    const heroi = this.opcoes.dados.heroi;
    if (heroi?.territorioId === t.id) {
      const [hx, hy] = [x + 30, y + 20];
      const g = this.camadaBandeiras!;
      g.fillStyle(0x1c1410, 0.9);
      g.fillCircle(hx, hy, 11);
      g.lineStyle(2, 0xffd54a, 1);
      g.strokeCircle(hx, hy, 11);
      this.rotulos.push(this.add.text(hx, hy, '🎖️', { ...estilo, fontSize: '13px', strokeThickness: 0 }).setOrigin(0.5));
    }
    const povoado = this.opcoes.dados.povoados.get(t.id);
    if (povoado) {
      const livre = povoado.tipo === 'cidade_livre';
      const [px, py, raio] = [x - (livre ? 30 : 26), y - 14, livre ? 14 : 12];
      const vazia = !livre && !t.dono_id && totalRecursos(estoqueVila(povoado.saqueadaEm, Date.now())) === 0;
      const g = this.camadaBandeiras!;
      g.fillStyle(0x1c1410, vazia ? 0.55 : 0.9);
      g.fillCircle(px, py, raio);
      g.lineStyle(livre ? 3 : 2, livre ? 0xffd54a : 0xd9c3a0, 1);
      g.strokeCircle(px, py, raio);
      const icone = this.add.text(px, py, livre ? '⚖️' : '🏘️', { ...estilo, fontSize: livre ? '16px' : '14px', strokeThickness: 0 });
      this.rotulos.push(icone.setOrigin(0.5).setAlpha(vazia ? 0.5 : 1));
    }
  }

  /**
   * Bandeirinha do jogador, igual à do perfil (cor, padrão e emblema): mastro escuro e o pano, uma imagem gerada
   * do SVG da bandeira. Enquanto a imagem carrega (só na primeira vez de cada bandeira), vai o pano só com cor e
   * padrão. (x, y) = base do mastro.
   */
  private desenharBandeira(x: number, y: number, dono: JogadorMapa) {
    const g = this.camadaBandeiras!;
    const bandeira = bandeiraDoJogador(dono);
    const { largura, altura } = BANDEIRA;
    const [esq, topo] = [x, y - 20];
    // Mastro escuro com borda clara, para destacar sobre a própria cor do território.
    g.lineStyle(5, 0xf1e6cf, 1);
    g.lineBetween(x, y + 12, x, topo);
    g.lineStyle(3, 0x1c1410, 1);
    g.lineBetween(x, y + 12, x, topo);

    const chave = chaveDaBandeira(bandeira);
    if (this.textures.exists(chave)) {
      this.rotulos.push(this.add.image(esq, topo, chave).setOrigin(0, 0).setDisplaySize(largura, altura));
      return;
    }
    this.carregarBandeira(chave, svgDaBandeira(bandeira, largura * BANDEIRA.nitidez));
    g.fillStyle(cor(bandeira.cor), 1);
    g.fillRect(esq, topo, largura, altura);
    g.fillStyle(cor(bandeira.corSecundaria), 1);
    for (const forma of formasDoPadrao(bandeira.padrao)) {
      g.fillPoints(toPoints(forma.map((v, i) => (i % 2 === 0 ? esq + v * largura : topo + v * altura))), true);
    }
    g.lineStyle(2, 0xf1e6cf, 1);
    g.strokeRect(esq, topo, largura, altura);
  }

  /** Transforma o SVG da bandeira em textura do Phaser e redesenha o mapa quando ficar pronta. */
  private carregarBandeira(chave: string, svg: string) {
    if (this.bandeirasCarregando.has(chave)) return;
    this.bandeirasCarregando.add(chave);
    const imagem = new Image();
    imagem.onload = () => {
      if (!this.sys.isActive()) return;
      if (!this.textures.exists(chave)) this.textures.addImage(chave, imagem);
      this.bandeirasCarregando.delete(chave);
      // Várias bandeiras ficam prontas quase juntas: um redesenho só.
      if (this.redesenhoPendente) return;
      this.redesenhoPendente = true;
      this.time.delayedCall(50, () => {
        this.redesenhoPendente = false;
        if (this.camadaMapa) this.desenhar();
      });
    };
    // Se falhar, fica a bandeira só com cor e padrão (a chave segue marcada, para não tentar sem parar).
    imagem.onerror = () => undefined;
    imagem.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }

  private desenharDestaques() {
    const g = this.camadaDestaque!;
    g.clear();
    const { dados, meuId } = this.opcoes;
    // Borda grossa na cor do dono em todo território com dono; os do próprio jogador ganham um fio dourado.
    for (const t of dados.territorios) {
      const dono = t.dono_id ? dados.jogadores.get(t.dono_id) : null;
      if (!dono) continue;
      g.lineStyle(5, cor(corDoJogador(dono)), 1);
      g.strokePoints(this.formas.get(t.id)!.points, true);
    }
    for (const t of dados.territorios) {
      if (t.dono_id !== meuId) continue;
      g.lineStyle(2, 0xffe08a, 1);
      g.strokePoints(this.formas.get(t.id)!.points, true);
    }
    if (this.selecionado && this.formas.has(this.selecionado)) {
      g.lineStyle(5, 0xffffff, 1);
      g.strokePoints(this.formas.get(this.selecionado)!.points, true);
    }
  }

  private tamanhoDoMundo() {
    const { territorios } = this.opcoes.dados;
    return {
      largura: Math.max(...territorios.flatMap((t) => t.poligono.map(([x]) => x))) * ESCALA,
      altura: Math.max(...territorios.flatMap((t) => t.poligono.map(([, y]) => y))) * ESCALA,
    };
  }

  /** Recalcula o menor zoom (mapa inteiro na tela) e mantém o zoom atual dentro do limite. */
  private limitarZoom() {
    const { width, height } = this.scale.gameSize;
    const mundo = this.tamanhoDoMundo();
    this.zoomMinimo = Math.min(width / mundo.largura, height / mundo.altura) * 0.95;
    const cam = this.cameras.main;
    cam.setBounds(-mundo.largura * 0.25, -mundo.altura * 0.25, mundo.largura * 1.5, mundo.altura * 1.5);
    cam.setZoom(Phaser.Math.Clamp(cam.zoom, this.zoomMinimo * 0.8, 4));
  }

  /**
   * Enquadramento inicial. Na tela deitada, o mapa inteiro. Na tela em pé (celular), o mapa largo ficaria
   * minúsculo: aproxima até ocupar a altura e mostra a parte da cidade do jogador, sem passar da borda do mapa.
   */
  private enquadrar() {
    this.limitarZoom();
    const mundo = this.tamanhoDoMundo();
    const { width, height } = this.scale.gameSize;
    const cam = this.cameras.main;
    if (height <= width) {
      cam.setZoom(this.zoomMinimo).centerOn(mundo.largura / 2, mundo.altura / 2);
      return;
    }
    const zoom = Math.min((height / mundo.altura) * 0.95, 4);
    cam.setZoom(zoom);
    const minhaCidade = this.opcoes.dados.territorios.find((t) => t.cidade_principal && t.dono_id === this.opcoes.meuId);
    const metadeLargura = width / 2 / zoom;
    const x = minhaCidade ? Phaser.Math.Clamp(minhaCidade.x * ESCALA, metadeLargura, mundo.largura - metadeLargura) : mundo.largura / 2;
    cam.centerOn(x, mundo.altura / 2);
  }

  private aplicarZoom(novo: number, telaX: number, telaY: number) {
    this.mexeu = true;
    const cam = this.cameras.main;
    const antes = cam.getWorldPoint(telaX, telaY);
    cam.setZoom(Phaser.Math.Clamp(novo, this.zoomMinimo * 0.8, 4));
    const depois = cam.getWorldPoint(telaX, telaY);
    // Mantém o ponto sob o cursor/dedos parado.
    cam.scrollX += antes.x - depois.x;
    cam.scrollY += antes.y - depois.y;
  }

  private mover(p: Phaser.Input.Pointer) {
    const [p1, p2] = [this.input.pointer1, this.input.pointer2];
    if (p1.isDown && p2.isDown) {
      const distancia = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      if (this.distanciaPinca) {
        this.aplicarZoom(this.cameras.main.zoom * (distancia / this.distanciaPinca), (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      }
      this.distanciaPinca = distancia;
      this.arrastou = true;
      return;
    }
    if (!p.isDown) return;
    if (Phaser.Math.Distance.Between(p.downX, p.downY, p.x, p.y) > ARRASTO_MINIMO) this.arrastou = true;
    if (!this.arrastou) return;
    this.mexeu = true;
    const cam = this.cameras.main;
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
  }

  private tocar(p: Phaser.Input.Pointer) {
    const ponto = this.cameras.main.getWorldPoint(p.x, p.y);
    for (const [id, forma] of this.formas) {
      if (Phaser.Geom.Polygon.Contains(forma, ponto.x, ponto.y)) {
        this.opcoes.onSelecionar(id);
        return;
      }
    }
    this.opcoes.onSelecionar(null);
  }
}
