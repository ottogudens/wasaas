'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './auth-context';
import { api } from './api';

interface FeatureFlagsContextType {
  features: Record<string, boolean>;
  isLoading: boolean;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType>({
  features: {},
  isLoading: true,
});

export const FeatureFlagsProvider = ({ children }: { children: React.ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchFlags = async () => {
      if (!isAuthenticated || !token) {
        if (isMounted) {
          setFeatures({});
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await api.getFeatures();
        if (isMounted) {
          setFeatures(data.features || {});
        }
      } catch (error) {
        console.error('Failed to fetch feature flags:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    fetchFlags();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, token]);

  return (
    <FeatureFlagsContext.Provider value={{ features, isLoading }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlag = (flagName: string): boolean => {
  const { features } = useContext(FeatureFlagsContext);
  return !!features[flagName];
};

export const useFeatureFlags = () => {
  return useContext(FeatureFlagsContext);
};
