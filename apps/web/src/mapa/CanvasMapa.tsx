import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import type { DadosMapa } from '../lib/useMapa';
import { CenaMapa } from './CenaMapa';

type Props = {
  dados: DadosMapa;
  meuId: string;
  selecionado: string | null;
  onSelecionar: (id: string | null) => void;
};

/** Ponte entre React e Phaser: cria o jogo uma vez e repassa dados e seleção para a cena. */
export default function CanvasMapa({ dados, meuId, selecionado, onSelecionar }: Props) {
  const recipiente = useRef<HTMLDivElement>(null);
  const cena = useRef<CenaMapa | null>(null);
  const aoSelecionar = useRef(onSelecionar);
  aoSelecionar.current = onSelecionar;

  useEffect(() => {
    const novaCena = new CenaMapa({ dados, meuId, onSelecionar: (id) => aoSelecionar.current(id) });
    const jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: recipiente.current!,
      backgroundColor: '#1c1410',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: novaCena,
      banner: false,
    });
    cena.current = novaCena;
    // O Phaser só percebe redimensionamento da janela; o contêiner pode mudar sozinho (barra do celular, painel).
    const observador = new ResizeObserver(() => jogo.scale.refresh());
    observador.observe(recipiente.current!);
    return () => {
      observador.disconnect();
      cena.current = null;
      jogo.destroy(true);
    };
    // O jogo é criado uma vez só; mudanças de dados vão pelo efeito abaixo.
  }, []);

  useEffect(() => {
    cena.current?.atualizar({ dados, meuId, onSelecionar: (id) => aoSelecionar.current(id) });
  }, [dados, meuId]);

  useEffect(() => {
    cena.current?.selecionar(selecionado);
  }, [selecionado]);

  return <div ref={recipiente} className="absolute inset-0 touch-none" />;
}
