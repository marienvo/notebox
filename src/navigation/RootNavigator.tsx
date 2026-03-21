import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import {SetupScreen} from '../features/setup/screens/SetupScreen';
import {MainTabNavigator} from './MainTabNavigator';
import {RootStackParamList} from './types';

const RootStack = createStackNavigator<RootStackParamList>();

type RootNavigatorProps = {
  initialRouteName: keyof RootStackParamList;
};

export function RootNavigator({initialRouteName}: RootNavigatorProps) {
  return (
    <NavigationContainer>
      <RootStack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{headerShown: false}}>
        <RootStack.Screen component={SetupScreen} name="Setup" />
        <RootStack.Screen component={MainTabNavigator} name="MainTabs" />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
