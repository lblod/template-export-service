import { query, sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import {
  DocumentContainer,
  DocumentContainerSchema,
} from '../schemas/document-container';
import { objectify } from '../utils/sparql';
import { Optional } from '../utils/types';
import { findEditorDocumentOrFail } from './editor-document';
import { expect } from '../utils/option';

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
    return null;
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

export async function findDocumentContainerOrFail(uri: string) {
  const container = await findDocumentContainer(uri);
  return expect(
    container,
    new AppError(
      StatusCodes.NOT_FOUND,
      `DocumentContainer ${uri} was not found in the database`
    )
  );
}

export async function persistDocumentContainer(container: DocumentContainer) {
  await update(/* sparql */ `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>

    DELETE {
      ?uri
        a ext:DocumentContainer;
        mu:uuid ?id;
        pav:hasCurrentVersion ?currentVersionUri.
      ?uri ext:editorDocumentFolder ?folderUri.
    }
    WHERE {
      ?uri
        a ext:DocumentContainer;
        mu:uuid ?id;
        pav:hasCurrentVersion ?currentVersionUri.
      OPTIONAL { ?uri ext:editorDocumentFolder ?folderUri. }

      FILTER(?uri = ${sparqlEscapeUri(container.uri)})
    };
    INSERT DATA {
      ${sparqlEscapeUri(container.uri)} 
          a ext:DocumentContainer;
          mu:uuid ${sparqlEscapeString(container.id)};
          pav:hasCurrentVersion ${sparqlEscapeUri(container.currentVersionUri)}.
      ${
        container.folderUri
          ? `${sparqlEscapeUri(container.uri)} ext:editorDocumentFolder ${sparqlEscapeUri(container.folderUri)}`
          : ''
      }
    }
    `);
}

export async function createDocumentContainer(
  data: Optional<DocumentContainer, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://data.lblod.info/document-containers/${id}`;
  const container = {
    ...data,
    uri,
    id,
  };
  await persistDocumentContainer(container);
  return container;
}

export async function findCurrentVersion(documentContainer: DocumentContainer) {
  return findEditorDocumentOrFail(documentContainer.currentVersionUri);
}
