import {
  query,
  sparqlEscapeInt,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';
import AppError from '../utils/app-error';
import { StatusCodes } from 'http-status-codes';
import { objectify } from '../utils/sparql';
import { Optional } from '../utils/types';
import { Snippet, SnippetInput, SnippetSchema } from '../schemas/snippet';
import { expect } from '../utils/option';
import { findSnippetVersionOrFail } from './snippet-version';

export async function findSnippet(uri: string) {
  const response = await query<Snippet>(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX schema: <http://schema.org/>
      PREFIX say: <https://say.data.gift/ns/>
      SELECT 
        ?uri
        ?id
        ?position 
        ?createdOn
        ?updatedOn
        ?currentVersionUri
        (GROUP_CONCAT(DISTINCT ?linkedSnippetListUri;SEPARATOR="|") AS ?linkedSnippetListUris)
      WHERE {
        ?uri 
          a say:Snippet;
          mu:uuid ?id;
          pav:createdOn ?createdOn;
          pav:lastUpdateOn ?updatedOn;
          pav:hasCurrentVersion ?currentVersionUri.
        OPTIONAL {
          ?uri schema:position ?position.
        }
        OPTIONAL {
          ?uri ext:linkedSnippetList ?linkedSnippetListUri.
        }
        FILTER(?uri = ${sparqlEscapeUri(uri)})   
      }
      GROUP BY ?uri ?id ?position ?createdOn ?updatedOn ?currentVersionUri`);
  if (!response.results.bindings.length) {
    return null;
  }
  if (response.results.bindings.length > 1) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Expected to only find a single result when querying Snippet ${uri} `
    );
  }
  const data = objectify(response.results.bindings[0]);
  const snippet: SnippetInput = {
    ...data,
    linkedSnippetListUris: data.linkedSnippetListUris
      ? new Set(data.linkedSnippetListUris.split('|'))
      : new Set(),
  };
  return SnippetSchema.parse(snippet);
}

export async function findSnippetOrFail(uri: string) {
  const snippet = await findSnippet(uri);
  return expect(
    snippet,
    new AppError(
      StatusCodes.NOT_FOUND,
      `Snippet ${uri} was not found in the database`
    )
  );
}

export async function createSnippet(data: Optional<Snippet, 'id' | 'uri'>) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://data.lblod.info/id/snippets/${id}`;
  const snippet = {
    ...data,
    id,
    uri,
  };
  await persistSnippet(snippet);
  return snippet;
}

export async function persistSnippet(snippet: Snippet) {
  await update(/* sparql */ `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX pav: <http://purl.org/pav/>
    PREFIX schema: <http://schema.org/>
    PREFIX say: <https://say.data.gift/ns/>
    DELETE WHERE {
      ?uri 
        a say:Snippet;
        mu:uuid ?id;
        pav:createdOn ?createdOn;
        pav:lastUpdateOn ?updatedOn;
        pav:hasCurrentVersion ?currentVersionUri.
      OPTIONAL {
        ?uri schema:position ?position.
      }
      OPTIONAL {
        ?uri ext:linkedSnippetList ?linkedSnippetListUri.
      }
      FILTER(?uri = ${sparqlEscapeUri(snippet.uri)})
    };
    INSERT DATA {
      ${sparqlEscapeUri(snippet.uri)} 
        a say:Snippet;
        mu:uuid ${sparqlEscapeString(snippet.id)};
        pav:createdOn ?createdOn;
        pav:lastUpdateOn ?updatedOn;
        pav:hasCurrentVersion ?currentVersionUri.

      ${
        snippet.position
          ? `${sparqlEscapeUri(snippet.uri)} schema:position ${sparqlEscapeInt(snippet.position)}`
          : ''
      }

      ${[...snippet.linkedSnippetListUris]
        .map(
          (snippetListUri) =>
            `${sparqlEscapeUri(snippet.uri)} ext:linkedSnippetList ${sparqlEscapeUri(snippetListUri)}.`
        )
        .join(`\n`)}
    }`);
}

export async function findCurrentVersion(snippet: Snippet) {
  return findSnippetVersionOrFail(snippet.currentVersionUri);
}
