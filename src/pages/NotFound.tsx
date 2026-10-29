import { Link } from 'react-router-dom';
import { Page, PageTitle, btn } from '../components/ui';

export default function NotFound() {
  return (
    <Page width="narrow">
      <PageTitle eyebrow="Erro 404" title="Página não encontrada" />
      <p className="text-base text-body">O endereço pode ter mudado ou o registro foi removido.</p>
      <div><Link to="/" className={btn('primary')}>Ir para o início</Link></div>
    </Page>
  );
}
