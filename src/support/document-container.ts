import { DocumentContainer } from "../schemas/document-container";

export function mergeDocumentContainers(oldContainer: DocumentContainer, newContainer: DocumentContainer){
  const result: DocumentContainer = {
    id: oldContainer.id,
    uri: oldContainer.uri,
    currentVersionUri: newContainer.currentVersionUri,
    linkedSnippetListUris: newContainer.linkedSnippetListUris,
    
  }
}