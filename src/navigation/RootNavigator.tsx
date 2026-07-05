import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { BottomTabs } from './BottomTabs';

export function RootNavigator() {
  return (
    <NavigationContainer>
      <BottomTabs />
    </NavigationContainer>
  );
}
