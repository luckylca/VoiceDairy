import React, { createContext, useContext, useMemo } from 'react';

const MainTabActivityContext = createContext(true);

export function MainTabActivityProvider({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  const value = useMemo(() => active, [active]);
  return <MainTabActivityContext.Provider value={value}>{children}</MainTabActivityContext.Provider>;
}

export function useMainTabActive(): boolean {
  return useContext(MainTabActivityContext);
}
