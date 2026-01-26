import AdmZip from 'adm-zip';
import { Serialization, SerializationSchema } from '../schemas/serialization';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import path from 'node:path';
import { logger } from '../support/logger';
import { persistEditorDocument } from '../db/editor-document';
import {
  findCurrentVersion as findCurrentVersion_DocumentContainer,
  findDocumentContainer,
  persistDocumentContainer,
} from '../db/document-container';
import { persistSnippetList } from '../db/snippet-list';
import {
  findCurrentVersion as findCurrentVersion_Snippet,
  findSnippet,
  persistSnippet,
} from '../db/snippet';
import { persistSnippetVersion } from '../db/snippet-version';
import { unwrap } from '../utils/option';

export function unzip(buffer: Buffer): Serialization {
  const result: Record<keyof Serialization, unknown[]> = {
    documentContainers: [],
    editorDocuments: [],
    snippetLists: [],
    snippets: [],
    snippetVersions: [],
  };
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  for (const entry of entries) {
    if (entry.isDirectory) {
      continue;
    }
    const entryPath = entry.entryName;
    if (path.extname(entryPath) !== '.json') {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Expected all files in uploaded archive to have .json extension. Got ${path.extname(entryPath)}`
      );
    }
    const directory = path.dirname(entryPath);
    if (!Object.keys(result).includes(directory)) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Incorrect folder structure in uploaded archive. Got ${directory}`
      );
    }
    const content = JSON.parse(entry.getData().toString());
    result[directory as keyof Serialization].push(content);
  }
  try {
    const serialization = SerializationSchema.parse(result);
    return serialization;
  } catch (e) {
    logger.error(e);
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Unexpected error occured while parsing files in uploaded zip folder.'
    );
  }
}

export function validateRelationships(serialization: Serialization) {
  validateDocumentContainerRelationships(serialization);
  validateSnippetListRelationships(serialization);
  validateSnippetRelationships(serialization);
}

function validateDocumentContainerRelationships(serialization: Serialization) {
  const { documentContainers, editorDocuments, snippetLists } = serialization;
  if (documentContainers.length !== editorDocuments.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Expected the same number of DocumentContainer resources as EditorDocument resources in the uploaded zip archive'
    );
  }
  for (const container of documentContainers) {
    const currentVersion = editorDocuments.find(
      (doc) => doc.uri === container.currentVersionUri
    );
    if (!currentVersion) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `EditorDocument ${container.currentVersionUri} not found in the uploaded zip archive`
      );
    }
    if (currentVersion.documentContainerUri !== container.uri) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `DocumentContainer ${currentVersion.documentContainerUri} not found in the uploaded zip archive`
      );
    }
    for (const linkedSnippetListUri of container.linkedSnippetListUris) {
      const linkedSnippetList = snippetLists.find(
        (list) => linkedSnippetListUri === list.uri
      );
      if (!linkedSnippetList) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `SnippetList ${linkedSnippetListUri} not found in the uploaded zip archive`
        );
      }
    }
  }
}

function validateSnippetListRelationships(serialization: Serialization) {
  const { snippetLists, snippets } = serialization;
  for (const list of snippetLists) {
    for (const snippetUri of list.snippetUris) {
      const snippet = snippets.find((snippet) => snippet.uri === snippetUri);
      if (!snippet) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `Snippet ${snippetUri} not found in the uploaded zip archive`
        );
      }
    }
  }
}

function validateSnippetRelationships(serialization: Serialization) {
  const { snippets, snippetVersions, snippetLists } = serialization;
  if (snippets.length !== snippetVersions.length) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      'Expected the same number of Snippet resources as SnippetVersion resources in the uploaded zip archive'
    );
  }
  for (const snippet of snippets) {
    const currentVersion = snippetVersions.find(
      (version) => version.uri === snippet.currentVersionUri
    );
    if (!currentVersion) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `SnippetVersion ${snippet.currentVersionUri} not found in the uploaded zip archive`
      );
    }
    if (currentVersion.snippetUri !== snippet.uri) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Snippet ${currentVersion.snippetUri} not found in the uploaded zip archive`
      );
    }
    for (const linkedSnippetListUri of snippet.linkedSnippetListUris) {
      const linkedSnippetList = snippetLists.find(
        (list) => linkedSnippetListUri === list.uri
      );
      if (!linkedSnippetList) {
        throw new AppError(
          StatusCodes.BAD_REQUEST,
          `SnippetList ${linkedSnippetListUri} not found in the uploaded zip archive`
        );
      }
    }
  }
}

export async function importResources(serialization: Serialization) {
  await importDocumentContainers(serialization);
  await importSnippetLists(serialization);
  await importSnippets(serialization);
}

async function importDocumentContainers(serialization: Serialization) {
  const { documentContainers, editorDocuments } = serialization;
  await Promise.all(
    documentContainers.map(async (container) => {
      const currentVersion = unwrap(
        editorDocuments.find((doc) => doc.uri === container.currentVersionUri)
      );
      await persistEditorDocument(currentVersion);
      const documentContainerInDB = await findDocumentContainer(container.uri);
      const currentVersionInDB = documentContainerInDB
        ? await findCurrentVersion_DocumentContainer(documentContainerInDB, [
            'uri',
          ])
        : null;
      if (
        !currentVersionInDB ||
        currentVersion.updatedOn > currentVersionInDB.updatedOn
      ) {
        await persistDocumentContainer(container);
      }
    })
  );
}

async function importSnippetLists(serialization: Serialization) {
  const { snippetLists } = serialization;
  await Promise.all(snippetLists.map(persistSnippetList));
}

async function importSnippets(serialization: Serialization) {
  const { snippets, snippetVersions } = serialization;
  await Promise.all(
    snippets.map(async (snippet) => {
      const currentVersion = unwrap(
        snippetVersions.find((doc) => doc.uri === snippet.currentVersionUri)
      );
      await persistSnippetVersion(currentVersion);
      const snippetInDB = await findSnippet(snippet.uri);
      const currentVersionInDB = snippetInDB
        ? await findCurrentVersion_Snippet(snippetInDB)
        : null;
      if (
        !currentVersionInDB ||
        currentVersion.createdOn > currentVersionInDB.createdOn
      ) {
        await persistSnippet(snippet);
      }
    })
  );
}
