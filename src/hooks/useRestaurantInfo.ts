import { useEffect, useState } from 'react';
import { RestaurantInfoReadDTO } from '../types/api-types';
import { getCurrentRestaurantInfo } from '../services/restaurantInfo';

export default function useRestaurantInfo() {
  const [data, setData] = useState<RestaurantInfoReadDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const d = await getCurrentRestaurantInfo();
        if (active) setData(d);
      } catch (e) {
        if (active) setError(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { data, loading, error };
}
