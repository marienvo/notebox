import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';

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

function InboxStackScreen() {
  return (
    <InboxStack.Navigator>
      <InboxStack.Screen component={InboxScreen} name="Inbox" />
    </InboxStack.Navigator>
  );
}

function PodcastsStackScreen() {
  return (
    <PodcastsStack.Navigator>
      <PodcastsStack.Screen component={PodcastsScreen} name="Podcasts" />
    </PodcastsStack.Navigator>
  );
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen component={HomeScreen} name="Home" />
    </HomeStack.Navigator>
  );
}

function VaultStackScreen() {
  return (
    <VaultStack.Navigator>
      <VaultStack.Screen component={VaultScreen} name="Vault" />
      <VaultStack.Screen component={NoteDetailScreen} name="NoteDetail" />
    </VaultStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen component={SettingsScreen} name="Settings" />
    </SettingsStack.Navigator>
  );
}

export function MainTabNavigator() {
  return (
    <Tabs.Navigator initialRouteName="HomeTab">
      <Tabs.Screen component={InboxStackScreen} name="InboxTab" options={{title: 'Inbox'}} />
      <Tabs.Screen
        component={PodcastsStackScreen}
        name="PodcastsTab"
        options={{title: 'Podcasts'}}
      />
      <Tabs.Screen component={HomeStackScreen} name="HomeTab" options={{title: 'Home'}} />
      <Tabs.Screen component={VaultStackScreen} name="VaultTab" options={{title: 'Vault'}} />
      <Tabs.Screen
        component={SettingsStackScreen}
        name="SettingsTab"
        options={{title: 'Settings'}}
      />
    </Tabs.Navigator>
  );
}
