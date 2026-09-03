'use client';

import React, { createContext, useContext } from 'react';

interface AppModeContextType {
  isProductionHolding: boolean;
}

const AppModeContext = createContext<AppModeContextType>({
  isProductionHolding: false,
});

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  // In production environment or if explicitly set via NEXT_PUBLIC_PRODUCTION_MODE
  const isProdEnv = process.env.NODE_ENV === 'production';
  const envConfig = process.env.NEXT_PUBLIC_PRODUCTION_MODE;

  // Strict lockdown: production holding is active if envConfig === 'true' or NODE_ENV === 'production'
  const isProductionHolding = envConfig !== undefined ? envConfig === 'true' : isProdEnv;

  return (
    <AppModeContext.Provider value={{ isProductionHolding }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
