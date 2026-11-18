import { Oru } from '../components/Oru';
import { Page, TopBar } from '../components/Shell';
import { BOOKS, libraryExample, sectionById } from '../learn/library';
import { useRoute } from '../router';

/** Biblioteca de clássicos em domínio público, traduzidos, com os exemplos no tabuleiro. */
export function Library() {
  return (
    <Page>
      <TopBar title="Biblioteca" sub="clássicos traduzidos" back="/aprender" />
      <div className="pad">
        <div className="hello">
          <Oru mood="pensando" size={64} />
          <p>Livros clássicos que já são de domínio público, traduzidos para o português, com cada exemplo no tabuleiro.</p>
        </div>
        {BOOKS.map((b) => (
          <section key={b.id} className="card book-card">
            <h2 className="h2">{b.title}</h2>
            <p className="muted small">
              {b.author}, <i>{b.original}</i> ({b.year})
            </p>
            {b.chapters.map((c) => (
              <div key={c.id}>
                <p className="book-chapter">{c.title}</p>
                {c.sections.map((s) => (
                  <a key={s.id} className="card link-card" href={`#/livro?secao=${s.id}`}>
                    <span className="choice-title">
                      {s.number}. {s.title}
                    </span>
                    <span className="choice-sub">{s.blocks.filter((x) => x.kind === 'ex').length} exemplos no tabuleiro</span>
                  </a>
                ))}
              </div>
            ))}
            <p className="muted small">
              {b.source} {b.rights}
            </p>
          </section>
        ))}
        <p className="muted small">Os próximos capítulos chegam aos poucos. Cada tradução é conferida com o original.</p>
      </div>
    </Page>
  );
}

export function BookReader() {
  const { query } = useRoute();
  const id = query.get('secao') ?? '';
  const found = sectionById(id);
  if (!found) {
    return (
      <Page>
        <TopBar title="Biblioteca" back="/biblioteca" />
        <div className="pad center">
          <Oru mood="triste" size={80} />
          <p className="muted">Não achei esse trecho.</p>
        </div>
      </Page>
    );
  }
  const { book, chapter, section } = found;
  const back = encodeURIComponent(`livro?secao=${id}`);
  return (
    <Page>
      <TopBar title={`${section.number}. ${section.title}`} sub={book.title} back="/biblioteca" />
      <article className="pad book-text">
        <p className="book-chapter">{chapter.title}</p>
        <p>{chapter.intro}</p>
        {section.blocks.map((blk, i) => {
          if (blk.kind === 'h') return <h2 key={i} className="h2">{blk.text}</h2>;
          if (blk.kind === 'p') return <p key={i}>{blk.text}</p>;
          const ex = libraryExample(blk.id);
          return ex ? (
            <a key={i} className="card link-card book-example" href={`#/jogo?id=${ex.id}&de=${back}`}>
              <span className="choice-title">♟ Ver no tabuleiro</span>
              <span className="choice-sub">{ex.title} · com os comentários e o modo adivinhar</span>
            </a>
          ) : null;
        })}
        <p className="lesson-ref">
          {book.author}, <i>{book.original}</i> ({book.year}). {book.source} O livro usa a notação descritiva da época; aqui os lances estão em notação algébrica.
        </p>
      </article>
    </Page>
  );
}
