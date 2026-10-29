import { useSessao } from './lib/useSessao';
import Cidade from './telas/Cidade';
import Entrada from './telas/Entrada';

export default function App() {
  const sessao = useSessao();

  if (sessao === undefined) {
    return <div className="grid min-h-dvh place-items-center text-pergaminho-escuro">Carregando…</div>;
  }

  return sessao ? <Cidade sessao={sessao} /> : <Entrada />;
}
