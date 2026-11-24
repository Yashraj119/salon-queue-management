import { useCallback, useEffect, useState } from 'react';
import { socket } from '../realtime/socket';
import { ApiError } from '../api/publicApi';

export function usePublicData<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await load();
      setData(next);
      setError(null);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause : new ApiError('request_failed'));
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void refresh();
    const onQueueChanged = () => void refresh();
    socket.on('queue:changed', onQueueChanged);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      socket.off('queue:changed', onQueueChanged);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
