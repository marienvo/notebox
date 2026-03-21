/**
 * @format
 */

import {
  exists,
  listFiles,
  mkdir,
  readFile,
  writeFile,
} from 'react-native-saf-x';

import {
  createNote,
  listNotes,
  readNote,
  initNotebox,
  readSettings,
  writeNoteContent,
  writeSettings,
} from '../src/core/storage/noteboxStorage';

jest.mock('react-native-saf-x', () => ({
  exists: jest.fn(),
  listFiles: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

describe('noteboxStorage', () => {
  const existsMock = exists as jest.MockedFunction<typeof exists>;
  const listFilesMock = listFiles as jest.MockedFunction<typeof listFiles>;
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

  test('listNotes returns markdown files sorted by lastModified', async () => {
    listFilesMock.mockResolvedValueOnce([
      {lastModified: 11, name: 'older.md', type: 'file', uri: `${baseUri}/older.md`},
      {lastModified: 22, name: 'newer.md', type: 'file', uri: `${baseUri}/newer.md`},
      {name: 'settings.json', type: 'file', uri: `${baseUri}/settings.json`},
      {name: '.notebox', type: 'directory', uri: `${baseUri}/.notebox`},
    ] as never);

    await expect(listNotes(baseUri)).resolves.toEqual([
      {lastModified: 22, name: 'newer.md', uri: `${baseUri}/newer.md`},
      {lastModified: 11, name: 'older.md', uri: `${baseUri}/older.md`},
    ]);
  });

  test('readNote reads markdown content by URI', async () => {
    readFileMock.mockResolvedValueOnce('# Hello');

    await expect(readNote(`${baseUri}/hello.md`)).resolves.toEqual({
      content: '# Hello',
      summary: {
        lastModified: null,
        name: 'hello.md',
        uri: `${baseUri}/hello.md`,
      },
    });
  });

  test('createNote sanitizes title and writes markdown content', async () => {
    await expect(createNote(baseUri, ' Team Ideas! ', 'first line')).resolves.toMatchObject({
      name: 'team-ideas.md',
      uri: `${baseUri}/team-ideas.md`,
    });
    expect(writeFileMock).toHaveBeenCalledWith(`${baseUri}/team-ideas.md`, 'first line\n', {
      encoding: 'utf8',
      mimeType: 'text/markdown',
    });
  });

  test('writeNoteContent writes markdown content by URI', async () => {
    await writeNoteContent(`${baseUri}/test.md`, 'updated');

    expect(writeFileMock).toHaveBeenCalledWith(`${baseUri}/test.md`, 'updated\n', {
      encoding: 'utf8',
      mimeType: 'text/markdown',
    });
  });
});
