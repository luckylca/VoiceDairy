import React, { useMemo } from 'react';
import { PanResponder, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../navigation/types';

const tabOrder: Array<keyof RootTabParamList> = ['Home', 'Category', 'Settings'];

export function SwipeableTabScreen({
  routeName,
  children,
}: {
  routeName: keyof RootTabParamList;
  children: React.ReactNode;
}) {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const horizontalDistance = Math.abs(gestureState.dx);
          const verticalDistance = Math.abs(gestureState.dy);
          return horizontalDistance > 24 && horizontalDistance > verticalDistance * 1.5;
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldSwitch = Math.abs(gestureState.dx) >= 70 || Math.abs(gestureState.vx) >= 0.45;
          if (!shouldSwitch) {
            return;
          }

          const currentIndex = tabOrder.indexOf(routeName);
          const nextIndex = gestureState.dx < 0 ? currentIndex + 1 : currentIndex - 1;
          const nextRoute = tabOrder[nextIndex];

          if (nextRoute) {
            navigation.navigate(nextRoute);
          }
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [navigation, routeName],
  );

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}
