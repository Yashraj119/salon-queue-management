import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Scissors } from 'lucide-react';
import { getCustomerQueueStatus } from '../api/publicApi';
import type { CustomerQueueStatus } from '../api/publicApi';
import { socket } from '../realtime/socket';
import { strings } from '../strings';

export function CustomerStatusPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<CustomerQueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [live, setLive] = useState(socket.connected);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setData(await getCustomerQueueStatus(id));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    const onChanged = () => void refresh();
    const onConnect = () => { setLive(true); void refresh(); };
    const onDisconnect = () => setLive(false);
    socket.on('queue:changed', onChanged);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('queue:changed', onChanged);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [refresh]);

  if (loading && !data) return <section className="customer-status-card luxury-card" role="status">{strings.statusLoading}</section>;
  if (!data) return <section className="customer-status-card luxury-card" role="alert"><p>{strings.statusError}</p><button className="button-secondary" type="button" onClick={() => void refresh()}>{strings.statusRetry}</button></section>;

  const barberName = data.assignedBarberName ?? data.preferredBarberName ?? strings.brand;
  const statusMessage = data.status === 'Called' ? strings.statusCalled(barberName)
    : data.status === 'In chair' ? strings.statusInChair(barberName)
      : data.status === 'Done' ? strings.statusDone
        : data.status === 'Cancelled' ? strings.statusCancelled
          : data.status === 'No-show' ? strings.statusNoShow : strings.statusWaiting;

  return (
    <section className="customer-status-page">
      <header className="customer-status-heading"><p className="eyebrow"><Scissors size={15} />{strings.brand}</p><h1>{strings.tokenLabel}</h1></header>
      <article className={`customer-status-card luxury-card status-${data.status.toLowerCase().replaceAll(' ', '-')}`}>
        <span className="customer-status-token">{data.token}</span>
        <div className="customer-status-live"><span className={`status-dot${live ? '' : ' is-offline'}`} />{live ? strings.live : strings.syncUnavailable}</div>
        <h2>{statusMessage}</h2>
        {data.status === 'In chair' && <p className="customer-status-detail"><Clock3 size={16} />{strings.inService}</p>}
        {data.preferredBarberOnBreak && data.preferredBarberName && <p className="customer-status-break" role="status">{strings.statusBarberOnBreak(data.preferredBarberName)}</p>}
        {data.services.length > 0 && <div className="customer-status-services"><span>{strings.services}</span><strong>{data.services.join(' · ')}</strong></div>}
        {data.status === 'Done' && <CheckCircle2 className="customer-status-check" size={24} />}
      </article>
      {error && <p className="customer-status-error" role="alert">{strings.statusError} <button type="button" onClick={() => void refresh()}>{strings.statusRetry}</button></p>}
    </section>
  );
}
