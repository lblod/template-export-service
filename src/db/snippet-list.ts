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
import { findSnippetOrFail } from './snippet';
import { expect } from '../utils/option';

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
    return null;
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

export async function findSnippetListOrFail(uri: string) {
  const snippetList = await findSnippetList(uri);
  return expect(
    snippetList,
    new AppError(
      StatusCodes.NOT_FOUND,
      `SnippetList ${uri} was not found in the database`
    )
  );
}

export async function createSnippetList(
  data: Optional<SnippetList, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://data.lblod.info/snippet-lists/${id}`;
  const snippetList = {
    ...data,
    id,
    uri,
  };
  await persistSnippetList(snippetList);
  return snippetList;
}

export async function persistSnippetList(snippetList: SnippetList) {
  await update(/* sparql */ `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
    PREFIX say: <https://say.data.gift/ns/>
    DELETE {
      ?uri 
        a say:SnippetList;
        mu:uuid ?id;
        skos:prefLabel ?label;
        pav:createdOn ?createdOn.
      ?uri say:hasSnippet ?snippetUri.
      ?uri say:snippetImportedResource ?importedResourceUri.
    } 
    WHERE {
      ?uri 
        a say:SnippetList;
        mu:uuid ?id;
        skos:prefLabel ?label;
        pav:createdOn ?createdOn.
      OPTIONAL { ?uri say:hasSnippet ?snippetUri. }
      OPTIONAL { ?uri say:snippetImportedResource ?importedResourceUri. }
      
      FILTER(?uri = ${sparqlEscapeUri(snippetList.uri)})
    };
    INSERT DATA {
      ${sparqlEscapeUri(snippetList.uri)} 
        a say:SnippetList;
        mu:uuid ${sparqlEscapeString(snippetList.id)};
        skos:prefLabel ${sparqlEscapeString(snippetList.label)};
        pav:createdOn ${sparqlEscapeDateTime(snippetList.createdOn)}.

      ${[...snippetList.snippetUris]
        .map(
          (snippetUri) =>
            `${sparqlEscapeUri(snippetList.uri)} say:hasSnippet ${sparqlEscapeUri(snippetUri)}.`
        )
        .join(`\n`)}
      
      ${[...snippetList.importedResourceUris]
        .map(
          (importedResourceUri) =>
            `${sparqlEscapeUri(snippetList.uri)} say:snippetImportedResource ${sparqlEscapeUri(importedResourceUri)}.`
        )
        .join(`\n`)}
    }`);
}

export async function findSnippets(snippetList: SnippetList) {
  return Promise.all(
    [...snippetList.snippetUris].map(async (uri) => findSnippetOrFail(uri))
  );
}
