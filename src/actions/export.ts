import { findDocumentContainerWithCurrentVersion } from '../db/document-container';
import { findSnippetListWithSnippets } from '../db/snippet-list';
import { findSnippetVersion } from '../db/snippet-version';
import { DocumentContainer } from '../schemas/document-container';
import { EditorDocument } from '../schemas/editor-document';
import { Snippet } from '../schemas/snippet';
import { SnippetList } from '../schemas/snippet-list';
import { SnippetVersion } from '../schemas/snippet-version';
import * as SetUtils from '../utils/set';
import { uuid } from 'mu';
import { stat } from 'fs/promises';
import AdmZip from 'adm-zip';
import { createLogicalFile, createPhysicalFile } from '../db/file';
import { Serialization } from '../schemas/serialization';

export async function collectResourcesToExport({
  documentContainerUris,
  snippetListUris,
}: {
  documentContainerUris: string[];
  snippetListUris: string[];
}): Promise<Serialization> {
  const documentContainers: DocumentContainer[] = [];
  const editorDocuments: EditorDocument[] = [];
  const snippetLists: SnippetList[] = [];
  const snippets: Snippet[] = [];
  const snippetVersions: SnippetVersion[] = [];
  const documentContainersWithCurrentVersion = await Promise.all(
    documentContainerUris.map(findDocumentContainerWithCurrentVersion)
  );
  documentContainers.push(
    ...documentContainersWithCurrentVersion.map((c) => c.documentContainer)
  );
  editorDocuments.push(
    ...documentContainersWithCurrentVersion.map((c) => c.currentVersion)
  );

  const seenSnippetListUris = new Set<string>();
  const unseenSnippetListUris = new Set<string>(snippetListUris);
  for (const container of documentContainers as DocumentContainer[]) {
    SetUtils.addAll(unseenSnippetListUris, ...container.linkedSnippetListUris);
  }
  let nextUri = SetUtils.popElement(unseenSnippetListUris);
  while (nextUri) {
    seenSnippetListUris.add(nextUri);
    const snippetListWithSnippets = await findSnippetListWithSnippets(nextUri);
    snippetLists.push(snippetListWithSnippets.snippetList);
    snippets.push(...snippetListWithSnippets.snippets);
    for (const snippet of snippetListWithSnippets.snippets) {
      for (const listUri of snippet.linkedSnippetListUris) {
        if (!seenSnippetListUris.has(listUri)) {
          unseenSnippetListUris.add(listUri);
        }
      }
      const snippetVersion = await findSnippetVersion(
        snippet.currentVersionUri
      );
      snippetVersions.push(snippetVersion);
    }
    nextUri = SetUtils.popElement(unseenSnippetListUris);
  }
  return {
    documentContainers,
    editorDocuments,
    snippetLists,
    snippets,
    snippetVersions,
  };
}

// TODO Error handling
export async function createZip(serialization: Serialization) {
  const zip = new AdmZip();
  Object.entries(serialization).forEach(([resource, entities]) => {
    entities?.forEach((entity) => {
      zip.addFile(
        `${resource}/${entity.id}.json`,
        Buffer.from(JSON.stringify(entity))
      );
    });
  });
  const name = `${uuid()}.zip`;
  const path = `/share/${name}`;
  await zip.writeZipPromise(path);
  const stats = await stat(path);
  const size = stats.size;
  const createdOn = new Date();
  const logicalFileUuid = uuid();
  const logicalFileUri = `http://lblod.data.gift/files/${logicalFileUuid}`;
  const physicalFileUri = `share://${name}`;
  const commonData = {
    name,
    format: 'application/zip',
    extension: 'zip',
    size,
    createdOn,
  };

  const logicalPromise = createLogicalFile({
    id: logicalFileUuid,
    uri: logicalFileUri,
    ...commonData,
  });

  const physicalPromise = createPhysicalFile({
    ...commonData,
    uri: physicalFileUri,
    sourceUri: logicalFileUri,
  });

  return Promise.all([logicalPromise, physicalPromise]).then(
    ([logicalFile, physicalFile]) => ({
      logicalFileUri: logicalFile.uri,
      physicalFileUri: physicalFile.uri,
    })
  );
}
