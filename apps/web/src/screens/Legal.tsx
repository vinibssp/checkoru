import { TopBar } from '../components/Shell';

/** Versão curta e legível. O texto completo fica em docs/ no repositório. */
export function Legal({ kind }: { kind: 'termos' | 'privacidade' }) {
  return (
    <div className="page">
      <TopBar title={kind === 'termos' ? 'Termos de uso' : 'Privacidade'} back={() => history.back()} />
      <div className="page-body pad prose">
        {kind === 'termos' ? (
          <>
            <p>O Checkoru é um projeto gratuito e de código aberto (licença AGPL-3.0). Ao usar, você concorda com estas regras:</p>
            <ul>
              <li>Jogue limpo: é proibido usar motor, outra pessoa ou qualquer ajuda durante partidas online.</li>
              <li>Respeito no chat: nada de ofensas, assédio, discriminação ou spam.</li>
              <li>Uma conta por pessoa. Nome de usuário ofensivo pode ser trocado ou a conta suspensa.</li>
              <li>Contas que quebram as regras podem perder o rating, ser marcadas ou removidas.</li>
              <li>O serviço é oferecido como está, sem garantia de funcionar sempre.</li>
            </ul>
          </>
        ) : (
          <>
            <p>Guardamos só o necessário para o app funcionar:</p>
            <ul>
              <li>Da sua conta Google: identificador, e-mail e nome. Ninguém mais vê seu e-mail ou nome real.</li>
              <li>Seu nome de usuário, foto escolhida, ratings, partidas e preferências de tema.</li>
              <li>Partidas online são públicas (qualquer um pode ver o PGN pelo link).</li>
              <li>Mensagens de chat não ficam guardadas depois da partida.</li>
              <li>Sem anúncios, sem rastreadores e sem venda de dados.</li>
              <li>A foto de fundo que você escolher fica só no seu aparelho.</li>
            </ul>
            <p>Para apagar sua conta e seus dados, abra um pedido no repositório do projeto ou escreva para o contato indicado lá.</p>
          </>
        )}
      </div>
    </div>
  );
}
