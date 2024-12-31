import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import { objectify } from '../utils/sparql';
import { Optional } from '../utils/types';
import {
  SnippetList,
  SnippetListInput,
  SnippetListSchema,
} from '../schemas/snippet-list';
import { findSnippet } from './snippet';

export async function findSnippetList(uri: string) {
  const response = await query<SnippetList>(/* sparql */ `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX say: <https://say.data.gift/ns/>
      SELECT 
        ?uri 
        ?id 
        ?label 
        ?createdOn 
        (GROUP_CONCAT(DISTINCT ?importedResourceUri;SEPARATOR="|") AS ?importedResourceUris)
        (GROUP_CONCAT(DISTINCT ?snippetUri;SEPARATOR="|") AS ?snippetUris)
      WHERE {
        ?uri 
          a say:SnippetList;
          mu:uuid ?id;
          skos:prefLabel ?label;
          pav:createdOn ?createdOn.
        OPTIONAL {
          ?uri say:hasSnippet ?snippetUri.
        }
        OPTIONAL {
          ?uri say:snippetImportedResource ?importedResourceUri.
        }
        FILTER(?uri = ${sparqlEscapeUri(uri)})
      }
      GROUP BY ?uri ?id ?label ?createdOn`);
  if (!response.results.bindings.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `SnippetList ${uri} was not found in the database`
    );
  }
  if (response.results.bindings.length > 1) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Expected to only find a single result when querying SnippetList ${uri} `
    );
  }
  const data = objectify(response.results.bindings[0]);
  const snippetList: SnippetListInput = {
    ...data,
    importedResourceUris: data.importedResourceUris
      ? new Set(data.importedResourceUris.split('|'))
      : new Set(),
    snippetUris: data.snippetUris
      ? new Set(data.snippetUris.split('|'))
      : new Set(),
  };
  return SnippetListSchema.parse(snippetList);
}

export async function createSnippetList(
  data: Optional<SnippetList, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://data.lblod.info/snippet-lists/${id}`;
  await update(/* sparql */ `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX say: <https://say.data.gift/ns/>
      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a say:SnippetList;
          mu:uuid ${sparqlEscapeString(id)};
          skos:prefLabel ${sparqlEscapeString(data.label)};
          pav:createdOn ${sparqlEscapeDateTime(data.createdOn)}.

        ${[...data.snippetUris]
          .map(
            (snippetUri) =>
              `${sparqlEscapeUri(uri)} say:hasSnippet ${sparqlEscapeUri(snippetUri)}.`
          )
          .join(`\n`)}
        
        ${[...data.importedResourceUris]
          .map(
            (importedResourceUri) =>
              `${sparqlEscapeUri(uri)} say:snippetImportedResource ${sparqlEscapeUri(importedResourceUri)}.`
          )
          .join(`\n`)}
      }`);
  return {
    ...data,
    id,
    uri,
  };
}

export async function findSnippetListWithSnippets(listUri: string) {
  const snippetList = await findSnippetList(listUri);
  const snippets = await Promise.all(
    [...snippetList.snippetUris].map(async (uri) => {
      const snippet = await findSnippet(uri);
      return snippet;
    })
  );
  return {
    snippetList,
    snippets,
  };
}
