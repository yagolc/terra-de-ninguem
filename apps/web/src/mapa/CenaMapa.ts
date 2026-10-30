import Phaser from 'phaser';
import { COR_NEUTRA, corDoJogador, type DadosMapa, type TerritorioMapa } from '../lib/useMapa';

/** Pixels por légua no "mundo" do Phaser; a câmera aplica o zoom por cima. */
const ESCALA = 20;
const CORES_TERRENO = { planicie: 0x7d8a45, floresta: 0x3d5e36, montanha: 0x6e6257 } as const;
const ICONE_TERRENO = { planicie: '', floresta: '🌲', montanha: '⛰️' } as const;
const ARRASTO_MINIMO = 6;

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
  private rotulos: Phaser.GameObjects.Text[] = [];
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

    this.camadaBandeiras!.clear();
    for (const t of dados.territorios) this.rotular(t);
    this.desenharDestaques();
    this.desenharMarchas();
  }

  /** Setas das marchas do jogador: dourada para ataque, verde para tropas voltando, azul para movimento. */
  private desenharMarchas() {
    const g = this.camadaMarchas!;
    g.clear();
    const { dados } = this.opcoes;
    for (const m of dados.marchas) {
      const de = dados.territorios.find((t) => t.id === m.origemId);
      const para = dados.territorios.find((t) => t.id === m.destinoId);
      if (!de || !para) continue;
      const cor = m.tipo === 'retorno' ? 0x8fd18a : m.tipo === 'movimento' ? 0x7fb3e8 : 0xe8c475;
      const [x1, y1, x2, y2] = [de.x * ESCALA, de.y * ESCALA, para.x * ESCALA, para.y * ESCALA];
      const angulo = Math.atan2(y2 - y1, x2 - x1);
      // Para um pouco antes do centro do alvo, para não cobrir o nome.
      const fimX = x2 - Math.cos(angulo) * 26;
      const fimY = y2 - Math.sin(angulo) * 26;
      g.lineStyle(6, 0x1c1410, 0.8);
      g.lineBetween(x1, y1, fimX, fimY);
      g.lineStyle(3, cor, 1);
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
      if (dono) this.desenharBandeira(x - 14, y - 14, corDoJogador(dono));
    } else if (dono) {
      // Território conquistado: a bandeira do dono no lugar do ícone de terreno.
      this.desenharBandeira(x - 5, y - 14, corDoJogador(dono));
    } else if (ICONE_TERRENO[t.terreno]) {
      this.rotulos.push(this.add.text(x, y - 16, ICONE_TERRENO[t.terreno], { ...estilo, fontSize: '20px' }).setOrigin(0.5));
    }
    this.rotulos.push(this.add.text(x, y + 6, t.nome, { ...estilo, fontSize: '13px', wordWrap: { width: 110 } }).setOrigin(0.5));
  }

  /** Bandeirinha: mastro escuro e flâmula com rabo de andorinha na cor do jogador. (x, y) = base do mastro. */
  private desenharBandeira(x: number, y: number, corHex: string) {
    const g = this.camadaBandeiras!;
    // Mastro escuro com borda clara, para destacar sobre a própria cor do território.
    g.lineStyle(5, 0xf1e6cf, 1);
    g.lineBetween(x, y + 12, x, y - 18);
    g.lineStyle(3, 0x1c1410, 1);
    g.lineBetween(x, y + 12, x, y - 18);
    const flamula = toPoints([x, y - 18, x + 22, y - 18, x + 16, y - 11, x + 22, y - 4, x, y - 4]);
    g.fillStyle(cor(corHex), 1);
    g.fillPoints(flamula, true);
    g.lineStyle(2.5, 0xf1e6cf, 1);
    g.strokePoints(flamula, true);
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

  /** Ajusta o zoom para o mapa inteiro caber na tela. */
  private enquadrar() {
    this.limitarZoom();
    const mundo = this.tamanhoDoMundo();
    this.cameras.main.setZoom(this.zoomMinimo).centerOn(mundo.largura / 2, mundo.altura / 2);
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
