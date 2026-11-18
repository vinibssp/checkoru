import { useEffect, useState } from 'react';
import { Oru } from './components/Oru';
import { themeChosen, ThemeIntro } from './components/ThemePicker';
import { navigate, useRoute } from './router';
import { CreateAccount } from './screens/CreateAccount';
import { Customize } from './screens/Customize';
import { Game } from './screens/Game';
import { Home } from './screens/Home';
import { Legal } from './screens/Legal';
import { Analysis } from './screens/Analysis';
import { Bots } from './screens/Bots';
import { FamousScreen, Learn, LessonScreen } from './screens/Learn';
import { PuzzleScreen, Rush, Train } from './screens/Puzzles';
import { Analyze } from './screens/Analyze';
import { Local } from './screens/Local';
import { LoginReturn } from './screens/LoginReturn';
import { Play } from './screens/Play';
import { Toca } from './screens/Toca';
import { Welcome } from './screens/Welcome';
import { useStore } from './store';

const AFTER_LOGIN_KEY = 'checkoru.depoisDoLogin';

export function App() {
  const route = useRoute();
  const { me } = useStore();
  const [section, arg] = route.parts;
  const [themed, setThemed] = useState(themeChosen);

  // Quem abre um convite sem login volta para ele depois de entrar.
  useEffect(() => {
    if (me === null && section === 'partida') sessionStorage.setItem(AFTER_LOGIN_KEY, route.path);
    if (me?.user.username) {
      const after = sessionStorage.getItem(AFTER_LOGIN_KEY);
      if (after) {
        sessionStorage.removeItem(AFTER_LOGIN_KEY);
        if (after !== route.path) navigate(after, true);
      }
    }
  }, [me, section, route.path]);

  // Páginas abertas a todos.
  if (section === 'entrar') return <LoginReturn />;
  if (section === 'termos' || section === 'privacidade') return <Legal kind={section} />;

  // Primeira vez no aparelho: escolher o visual.
  if (!themed) return <ThemeIntro onDone={() => setThemed(true)} />;

  if (me === undefined) {
    return (
      <div className="center-screen">
        <Oru mood="pensando" size={96} />
      </div>
    );
  }
  if (me === null) return <Welcome />;
  if (!me.user.username) return <CreateAccount />;

  switch (section) {
    case undefined:
      return <Home />;
    case 'jogar':
      return <Play key={route.query.toString()} />;
    case 'bots':
      return <Bots />;
    case 'analisar':
      return <Analyze />;
    case 'analise':
      return <Analysis key={route.query.toString()} />;
    case 'local':
      return <Local />;
    case 'partida':
      return arg ? <Game key={arg} id={arg} /> : <Home />;
    case 'treinar':
      return <Train />;
    case 'puzzle':
      return <PuzzleScreen key={route.query.toString()} />;
    case 'corrida':
      return <Rush />;
    case 'aprender':
      return <Learn />;
    case 'aula':
      return <LessonScreen key={route.query.toString()} />;
    case 'jogo':
      return <FamousScreen key={route.query.toString()} />;
    case 'toca':
      return <Toca />;
    case 'personalizar':
      return <Customize />;
    default:
      return <Home />;
  }
}
