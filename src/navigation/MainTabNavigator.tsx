import {BottomTabNavigationOptions, createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import {HomeScreen} from '../features/home/screens/HomeScreen';
import {InboxScreen} from '../features/inbox/screens/InboxScreen';
import {PodcastsScreen} from '../features/podcasts/screens/PodcastsScreen';
import {SettingsScreen} from '../features/settings/screens/SettingsScreen';
import {NoteDetailScreen} from '../features/vault/screens/NoteDetailScreen';
import {VaultScreen} from '../features/vault/screens/VaultScreen';
import {
  HomeStackParamList,
  InboxStackParamList,
  MainTabParamList,
  PodcastsStackParamList,
  SettingsStackParamList,
  VaultStackParamList,
} from './types';

const Tabs = createBottomTabNavigator<MainTabParamList>();
const InboxStack = createStackNavigator<InboxStackParamList>();
const PodcastsStack = createStackNavigator<PodcastsStackParamList>();
const HomeStack = createStackNavigator<HomeStackParamList>();
const VaultStack = createStackNavigator<VaultStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();
const inboxTabIcon: BottomTabNavigationOptions['tabBarIcon'] = ({color, size}) => (
  <MaterialIcons color={color} name="inbox" size={size} />
);
const podcastsTabIcon: BottomTabNavigationOptions['tabBarIcon'] = ({color, size}) => (
  <MaterialIcons color={color} name="headphones" size={size} />
);
const homeTabIcon: BottomTabNavigationOptions['tabBarIcon'] = ({color, size}) => (
  <MaterialIcons color={color} name="home" size={size} />
);
const vaultTabIcon: BottomTabNavigationOptions['tabBarIcon'] = ({color, size}) => (
  <MaterialIcons color={color} name="book" size={size} />
);
const settingsTabIcon: BottomTabNavigationOptions['tabBarIcon'] = ({color, size}) => (
  <MaterialIcons color={color} name="settings" size={size} />
);

function InboxStackScreen() {
  return (
    <InboxStack.Navigator screenOptions={{headerShown: false}}>
      <InboxStack.Screen component={InboxScreen} name="Inbox" />
    </InboxStack.Navigator>
  );
}

function PodcastsStackScreen() {
  return (
    <PodcastsStack.Navigator screenOptions={{headerShown: false}}>
      <PodcastsStack.Screen component={PodcastsScreen} name="Podcasts" />
    </PodcastsStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{headerShown: false}}>
      <HomeStack.Screen component={HomeScreen} name="Home" />
    </HomeStack.Navigator>
  );
}

function VaultStackScreen() {
  return (
    <VaultStack.Navigator screenOptions={{headerShown: false}}>
      <VaultStack.Screen component={VaultScreen} name="Vault" />
      <VaultStack.Screen component={NoteDetailScreen} name="NoteDetail" />
    </VaultStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator screenOptions={{headerShown: false}}>
      <SettingsStack.Screen component={SettingsScreen} name="Settings" />
    </SettingsStack.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <Tabs.Navigator initialRouteName="HomeTab">
      <Tabs.Screen
        component={InboxStackScreen}
        name="InboxTab"
        options={{
          tabBarIcon: inboxTabIcon,
          title: 'Inbox',
        }}
      />
      <Tabs.Screen
        component={PodcastsStackScreen}
        name="PodcastsTab"
        options={{
          tabBarIcon: podcastsTabIcon,
          title: 'Podcasts',
        }}
      />
      <Tabs.Screen
        component={HomeStackScreen}
        name="HomeTab"
        options={{
          tabBarIcon: homeTabIcon,
          title: 'Home',
        }}
      />
      <Tabs.Screen
        component={VaultStackScreen}
        name="VaultTab"
        options={{
          tabBarIcon: vaultTabIcon,
          title: 'Vault',
        }}
      />
      <Tabs.Screen
        component={SettingsStackScreen}
        name="SettingsTab"
        options={{
          tabBarIcon: settingsTabIcon,
          title: 'Settings',
        }}
      />
    </Tabs.Navigator>
  );
}
