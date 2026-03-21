/**
 * @format
 */

import {useNavigation} from '@react-navigation/native';
import {
  act,
  create,
  ReactTestInstance,
  ReactTestRenderer,
} from 'react-test-renderer';
import {Button, TextInput} from 'react-native';

import {HomeScreen} from '../src/screens/HomeScreen';
import {clearUri, getSavedUri} from '../src/storage/appStorage';
import {
  initNotebox,
  readSettings,
  writeSettings,
} from '../src/storage/noteboxStorage';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../src/storage/appStorage', () => ({
  clearUri: jest.fn(),
  getSavedUri: jest.fn(),
}));

jest.mock('../src/storage/noteboxStorage', () => ({
  initNotebox: jest.fn(),
  readSettings: jest.fn(),
  writeSettings: jest.fn(),
}));

describe('HomeScreen', () => {
  const navigateMock = jest.fn();
  const useNavigationMock = useNavigation as jest.MockedFunction<
    typeof useNavigation
  >;
  const getSavedUriMock = getSavedUri as jest.MockedFunction<typeof getSavedUri>;
  const clearUriMock = clearUri as jest.MockedFunction<typeof clearUri>;
  const initNoteboxMock = initNotebox as jest.MockedFunction<typeof initNotebox>;
  const readSettingsMock = readSettings as jest.MockedFunction<
    typeof readSettings
  >;
  const writeSettingsMock = writeSettings as jest.MockedFunction<
    typeof writeSettings
  >;

  function getButtonByTitle(
    tree: ReactTestRenderer,
    title: string,
  ): ReactTestInstance {
    return tree.root.findAllByType(Button).find(button => button.props.title === title)!;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    useNavigationMock.mockReturnValue({navigate: navigateMock} as never);
    getSavedUriMock.mockResolvedValue('content://notes');
    initNoteboxMock.mockResolvedValue();
    readSettingsMock.mockResolvedValue({displayName: 'My Notebox'});
    writeSettingsMock.mockResolvedValue();
    clearUriMock.mockResolvedValue();
  });

  test('loads URI and settings on mount', async () => {
    let tree: ReactTestRenderer;

    await act(async () => {
      tree = create(<HomeScreen />);
    });

    expect(getSavedUriMock).toHaveBeenCalled();
    expect(initNoteboxMock).toHaveBeenCalledWith('content://notes');
    expect(readSettingsMock).toHaveBeenCalledWith('content://notes');
    const input = tree!.root.findByType(TextInput);
    expect(input.props.value).toBe('My Notebox');
  });

  test('saves trimmed displayName', async () => {
    let tree: ReactTestRenderer;

    await act(async () => {
      tree = create(<HomeScreen />);
    });

    const input = tree!.root.findByType(TextInput);
    await act(async () => {
      input.props.onChangeText('  Team Notes  ');
    });

    const saveButton = getButtonByTitle(tree!, 'Save');
    await act(async () => {
      await saveButton.props.onPress();
    });

    expect(writeSettingsMock).toHaveBeenCalledWith('content://notes', {
      displayName: 'Team Notes',
    });
  });

  test('clears URI and returns to setup', async () => {
    let tree: ReactTestRenderer;

    await act(async () => {
      tree = create(<HomeScreen />);
    });

    const changeDirectoryButton = getButtonByTitle(tree!, 'Change directory');
    await act(async () => {
      await changeDirectoryButton.props.onPress();
    });

    expect(clearUriMock).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith('Setup');
  });
});
