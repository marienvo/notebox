/**
 * @format
 */

import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {resolveInitialRoute} from './src/bootstrap/resolveInitialRoute';
import {RootStackParamList} from './src/navigation/types';
import {HomeScreen} from './src/screens/HomeScreen';
import {SetupScreen} from './src/screens/SetupScreen';
import {clearUri} from './src/storage/appStorage';

type InitialRoute = keyof RootStackParamList;

const Stack = createStackNavigator<RootStackParamList>();

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [initialRoute, setInitialRoute] = useState<InitialRoute | null>(null);

  useEffect(() => {
    let isActive = true;

    const bootstrap = async () => {
      try {
        const route = await resolveInitialRoute();
        if (isActive) {
          setInitialRoute(route);
        }
      } catch {
        await clearUri();
        if (isActive) {
          setInitialRoute('Setup');
        }
      }
    };

    bootstrap().catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        {initialRoute === null ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <NavigationContainer>
            <Stack.Navigator initialRouteName={initialRoute}>
              <Stack.Screen component={SetupScreen} name="Setup" />
              <Stack.Screen component={HomeScreen} name="Home" />
            </Stack.Navigator>
          </NavigationContainer>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});

export default App;
