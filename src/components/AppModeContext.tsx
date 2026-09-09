'use client';

import React, { createContext, useContext, useState } from 'react';

interface AppModeContextType {
  isProductionHolding: boolean;
  enterPortal: () => void;
  returnToHolding: () => void;
}

const AppModeContext = createContext<AppModeContextType>({
  isProductionHolding: false,
  enterPortal: () => {},
  returnToHolding: () => {},
});

export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const isProdEnv = process.env.NODE_ENV === 'production';
  const envConfig = process.env.NEXT_PUBLIC_PRODUCTION_MODE;
  const initialHolding =
    envConfig !== undefined && envConfig !== ''
      ? envConfig === 'true'
      : isProdEnv;

  const [bypassed, setBypassed] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)lvm_portal_bypass=([^;]*)/);
      return match ? match[1] === '1' : false;
    }
    return false;
  });

  const enterPortal = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'lvm_portal_bypass=1; path=/; max-age=86400';
    }
    setBypassed(true);
  };

  const returnToHolding = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'lvm_portal_bypass=0; path=/; max-age=0';
    }
    setBypassed(false);
  };

  const isProductionHolding = initialHolding && !bypassed;

  return (
    <AppModeContext.Provider value={{ isProductionHolding, enterPortal, returnToHolding }}>
      {children}
    </AppModeContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppModeContext);
}
