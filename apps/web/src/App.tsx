import { useSessao } from './lib/useSessao';
import Entrada from './telas/Entrada';
import Inicio from './telas/Inicio';

export default function App() {
  const sessao = useSessao();

  if (sessao === undefined) {
    return <div className="grid min-h-dvh place-items-center text-pergaminho-escuro">Carregando…</div>;
  }

  return sessao ? <Inicio sessao={sessao} /> : <Entrada />;
}
