import { findDocumentContainerWithCurrentVersion } from '../db/document-container';
import { findSnippetListWithSnippets } from '../db/snippet-list';
import { findSnippetVersion } from '../db/snippet-version';
import { DocumentContainer } from '../schemas/document-container';
import { EditorDocument } from '../schemas/editor-document';
import { Snippet } from '../schemas/snippet';
import { SnippetList } from '../schemas/snippet-list';
import { SnippetVersion } from '../schemas/snippet-version';
import * as SetUtils from '../utils/set';

export type Export = {
  documentContainers: DocumentContainer[];
  editorDocuments: EditorDocument[];
  snippetLists: SnippetList[];
  snippets: Snippet[];
  snippetVersions: SnippetVersion[];
};
export async function collectResourcesToExport({
  documentContainerUris,
  snippetListUris,
}: {
  documentContainerUris: string[];
  snippetListUris: string[];
}): Promise<Export> {
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

export function serializeExport(
  exp: Export
): { fileName: string; content: string }[] {
  const result = [];
  const metadata = JSON.stringify(exp, (key, value) => {
    if (key === 'content') {
      return;
    }
    if (value instanceof Set) {
      return [...value];
    }
  });
  result.push({
    fileName: 'metadata.json',
    content: metadata,
  });
  for (const editorDocument of exp.editorDocuments) {
    result.push({
      fileName: `editor-document-${editorDocument.id}`,
      content: editorDocument.content,
    });
  }
  for (const snippetVersion of exp.snippetVersions) {
    result.push({
      fileName: `snippet-version-${snippetVersion.id}`,
      content: snippetVersion.content,
    });
  }
  return result;
}
