import { query, sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import {
  DocumentContainer,
  DocumentContainerSchema,
} from '../schemas/document-container';
import { objectify } from '../utils/sparql';
import { Optional } from '../utils/types';
import { findEditorDocument } from './editor-document';

export async function findDocumentContainer(uri: string) {
  const response = await query<DocumentContainer>(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      SELECT 
        ?uri 
        ?id 
        ?currentVersionUri 
        ?folderUri
        (GROUP_CONCAT(DISTINCT ?linkedSnippetListUri;SEPARATOR="|") AS ?linkedSnippetListUris)
      WHERE {
        ?uri 
          a ext:DocumentContainer;
          mu:uuid ?id;
          pav:hasCurrentVersion ?currentVersionUri.

        OPTIONAL {
          ?uri ext:linkedSnippetList ?linkedSnippetListUri.
        }
        OPTIONAL {
          ?uri ext:editorDocumentFolder ?folderUri.
        }
        FILTER(?uri = ${sparqlEscapeUri(uri)})
      }
      GROUP BY ?uri ?id ?folderUri ?currentVersionUri
      `);
  if (!response.results.bindings.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `DocumentContainer ${uri} was not found in the database`
    );
  }
  if (response.results.bindings.length > 1) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Expected to only find a single result when querying DocumentContainer ${uri} `
    );
  }
  const data = objectify(response.results.bindings[0]);
  const documentContainer: DocumentContainer = {
    ...data,
    linkedSnippetListUris: data.linkedSnippetListUris
      ? new Set(data.linkedSnippetListUris.split('|'))
      : new Set<string>(),
  };
  return DocumentContainerSchema.parse(documentContainer);
}

export async function createDocumentContainer(
  data: Optional<DocumentContainer, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://data.lblod.info/document-containers/${id}`;
  await update(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a ext:DocumentContainer;
          mu:uuid ${sparqlEscapeString(id)};
          pav:hasCurrentVersion ${sparqlEscapeUri(data.currentVersionUri)}.
        
        ${
          data.folderUri
            ? `${sparqlEscapeUri(uri)} ext:editorDocumentFolder ${sparqlEscapeUri(data.folderUri)}`
            : ''
        }
      }`);
  return {
    ...data,
    uri,
    id,
  };
}

export async function findDocumentContainerWithCurrentVersion(uri: string) {
  const documentContainer = await findDocumentContainer(uri);
  const currentVersion = await findEditorDocument(
    documentContainer.currentVersionUri
  );
  return {
    documentContainer,
    currentVersion,
  };
}
