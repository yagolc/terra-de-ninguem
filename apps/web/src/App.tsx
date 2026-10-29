import { useSessao } from './lib/useSessao';
import Jogo from './telas/Jogo';
import Entrada from './telas/Entrada';

export default function App() {
  const sessao = useSessao();

  if (sessao === undefined) {
    return <div className="grid min-h-dvh place-items-center text-pergaminho-escuro">Carregando…</div>;
  }

  return sessao ? <Jogo sessao={sessao} /> : <Entrada />;
}
