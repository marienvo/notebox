/**
 * @format
 */

import {
  exists,
  mkdir,
  readFile,
  writeFile,
} from 'react-native-saf-x';

import {
  initNotebox,
  readSettings,
  writeSettings,
} from '../src/storage/noteboxStorage';

jest.mock('react-native-saf-x', () => ({
  exists: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('noteboxStorage', () => {
  const existsMock = exists as jest.MockedFunction<typeof exists>;
  const mkdirMock = mkdir as jest.MockedFunction<typeof mkdir>;
  const readFileMock = readFile as jest.MockedFunction<typeof readFile>;
  const writeFileMock = writeFile as jest.MockedFunction<typeof writeFile>;
  const baseUri = 'content://notes';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initNotebox creates .notebox and default settings when missing', async () => {
    existsMock.mockResolvedValueOnce(false).mockResolvedValueOnce(false);

    await initNotebox(baseUri);

    expect(existsMock).toHaveBeenNthCalledWith(1, `${baseUri}/.notebox`);
    expect(mkdirMock).toHaveBeenCalledWith(`${baseUri}/.notebox`);
    expect(existsMock).toHaveBeenNthCalledWith(
      2,
      `${baseUri}/.notebox/settings.json`,
    );
    expect(writeFileMock).toHaveBeenCalledWith(
      `${baseUri}/.notebox/settings.json`,
      '{\n  "displayName": "My Notebox"\n}\n',
      {encoding: 'utf8', mimeType: 'application/json'},
    );
  });

  test('initNotebox skips writes when folder and file already exist', async () => {
    existsMock.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

    await initNotebox(baseUri);

    expect(mkdirMock).not.toHaveBeenCalled();
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  test('readSettings parses settings.json content', async () => {
    readFileMock.mockResolvedValueOnce('{"displayName":"Notebook A"}');

    await expect(readSettings(baseUri)).resolves.toEqual({
      displayName: 'Notebook A',
    });
    expect(readFileMock).toHaveBeenCalledWith(
      `${baseUri}/.notebox/settings.json`,
      {encoding: 'utf8'},
    );
  });

  test('writeSettings writes JSON to settings.json', async () => {
    await writeSettings(baseUri, {displayName: 'Notebook B'});

    expect(writeFileMock).toHaveBeenCalledWith(
      `${baseUri}/.notebox/settings.json`,
      '{\n  "displayName": "Notebook B"\n}\n',
      {encoding: 'utf8', mimeType: 'application/json'},
    );
  });
});
