import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';

const TEXT: Record<string, { title: string; sub: string; items: string[] }> = {
  aprender: {
    title: 'Aprender',
    sub: 'Ninho',
    items: ['Trilha de aulas do zero', 'Jogos famosos comentados', 'Análise com motor no aparelho'],
  },
};

/** Seções que chegam nas próximas versões. Melhor dizer isso do que mostrar botão que não faz nada. */
export function Soon({ section }: { section: 'aprender' }) {
  const t = TEXT[section]!;
  return (
    <Page>
      <TopBar title={t.title} sub={t.sub} />
      <div className="center-screen">
        <Oru mood="dormindo" size={120} />
        <p className="lead">Esta parte ainda está sendo chocada.</p>
        <ul className="soon-list">
          {t.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <a className="btn primary" href="#/jogar">
          Jogar enquanto isso
        </a>
      </div>
    </Page>
  );
}
