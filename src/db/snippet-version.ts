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
  SnippetVersion,
  SnippetVersionInput,
  SnippetVersionSchema,
} from '../schemas/snippet-version';
import { expect } from '../utils/option';

export async function findSnippetVersion(uri: string) {
  const response = await query<SnippetVersion>(/* sparql */ `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX schema: <http://schema.org/>
      PREFIX say: <https://say.data.gift/ns/>
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>

      SELECT DISTINCT 
        ?uri
        ?id
        ?title
        ?content
        ?createdOn
        ?validThrough
        ?snippetUri
        ?previousVersionUri
      WHERE {
        ?uri 
          a say:SnippetVersion;
          mu:uuid ?id;
          dct:title ?title;
          ext:editorDocumentContent ?content;
          pav:createdOn ?createdOn;
          ^pav:hasVersion ?snippetUri.
        OPTIONAL {
          ?uri schema:validThrough ?validThrough.
        }
        OPTIONAL {
          ?uri pav:previousVersion ?previousVersionUri.
        }
        FILTER(?uri = ${sparqlEscapeUri(uri)})
      }`);
  if (!response.results.bindings.length) {
    return null;
  }
  if (response.results.bindings.length > 1) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Expected to only find a single result when querying SnippetVersion ${uri} `
    );
  }
  const snippet: SnippetVersionInput = objectify(response.results.bindings[0]);
  return SnippetVersionSchema.parse(snippet);
}

export async function findSnippetVersionOrFail(uri: string) {
  const snippetVersion = await findSnippetVersion(uri);
  return expect(
    snippetVersion,
    new AppError(
      StatusCodes.NOT_FOUND,
      `SnippetVersion ${uri} was not found in the database`
    )
  );
}

export async function createSnippet(
  data: Optional<SnippetVersion, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://data.lblod.info/id/snippet-versions/${id}`;
  await update(/* sparql */ `
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX schema: <http://schema.org/>
      PREFIX say: <https://say.data.gift/ns/>
      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a say:SnippetVersion;
          mu:uuid ${sparqlEscapeString(id)};
          dct:title ${sparqlEscapeString(data.title)};
          ext:editorDocumentContent ${sparqlEscapeString(data.content)};
          pav:createdOn ${sparqlEscapeDateTime(data.createdOn)}.
        
        ${
          data.validThrough
            ? `${sparqlEscapeUri(uri)} schema:position ${sparqlEscapeDateTime(data.validThrough)}`
            : ''
        }
        ${
          data.previousVersionUri
            ? `${sparqlEscapeUri(uri)} pav:previousVersion ${sparqlEscapeUri(data.previousVersionUri)}`
            : ''
        }
      }`);
  return {
    ...data,
    id,
    uri,
  };
}
