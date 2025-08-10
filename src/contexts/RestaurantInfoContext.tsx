import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { RestaurantInfoReadDTO } from '../types/api-types';
import { getCurrentRestaurantInfo } from '../services/restaurantInfo';

type Ctx = {
  info?: RestaurantInfoReadDTO;
  isLoading: boolean;
  error?: string;
  refetch: () => Promise<void>;
};

const RestaurantInfoContext = createContext<Ctx>({
  info: undefined,
  isLoading: true,
  error: undefined,
  refetch: async () => {},
});

export const RestaurantInfoProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [info, setInfo] = useState<RestaurantInfoReadDTO>();
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = async () => {
    try {
      setLoading(true);
      const data = await getCurrentRestaurantInfo();
      setInfo(data);
      setError(undefined);
    } catch (e: any) {
      setError(e?.message || 'Failed to load restaurant info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const value = useMemo(() => ({ info, isLoading, error, refetch: load }), [info, isLoading, error]);
  return <RestaurantInfoContext.Provider value={value}>{children}</RestaurantInfoContext.Provider>;
};

export const useRestaurantInfoCtx = () => useContext(RestaurantInfoContext);