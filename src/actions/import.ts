import AdmZip from 'adm-zip';
import { Serialization, SerializationSchema } from '../schemas/serialization';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import path from 'node:path';
import { logger } from '../support/logger';
import { persistEditorDocument } from '../db/editor-document';
import { persistDocumentContainer } from '../db/document-container';
import { persistSnippetList } from '../db/snippet-list';
import { persistSnippet } from '../db/snippet';
import { persistSnippetVersion } from '../db/snippet-version';
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

export async function importResources(serialization: Serialization) {
  const {
    documentContainers,
    editorDocuments,
    snippetLists,
    snippets,
    snippetVersions,
  } = serialization;
  await Promise.all(documentContainers.map(persistDocumentContainer));
  await Promise.all(editorDocuments.map(persistEditorDocument));
  await Promise.all(snippetLists.map(persistSnippetList));
  await Promise.all(snippets.map(persistSnippet));
  await Promise.all(snippetVersions.map(persistSnippetVersion));
}
