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
import {
  EditorDocument,
  EditorDocumentInput,
  EditorDocumentSchema,
} from '../schemas/editor-document';
import { Optional } from '../utils/types';

export async function findEditorDocument(uri: string) {
  const response = await query<EditorDocument>(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>

      SELECT DISTINCT ?uri ?id ?title ?content ?context ?createdOn ?updatedOn
      WHERE {
        ?uri 
          a ext:EditorDocument;
          mu:uuid ?id;
          dct:title ?title;
          ext:editorDocumentContent ?content;
          pav:createdOn ?createdOn;
          pav:lastUpdateOn ?updatedOn.

        OPTIONAL {
          ?uri ext:editorDocumentContext ?context.
        }
        FILTER(?uri = ${sparqlEscapeUri(uri)})
      }`);
  if (!response.results.bindings.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `EditorDocument ${uri} was not found in the database`
    );
  }
  if (response.results.bindings.length > 1) {
    throw new AppError(
      StatusCodes.CONFLICT,
      `Expected to only find a single result when querying EditorDocument ${uri} `
    );
  }
  const editorDocument: EditorDocumentInput = objectify(
    response.results.bindings[0]
  );
  return EditorDocumentSchema.parse(editorDocument);
}

export async function createEditorDocument(
  data: Optional<EditorDocument, 'id' | 'uri'>
) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://data.lblod.info/editor-documents/${id}`;
  await update(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX pav: <http://purl.org/pav/>
      PREFIX dct: <http://purl.org/dc/terms/>
      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a ext:EditorDocument;
            mu:uuid ${sparqlEscapeString(id)};
            dct:title ${sparqlEscapeString(data.title)};
            ext:editorDocumentContent ${sparqlEscapeString(data.content)};
            pav:createdOn ${sparqlEscapeDateTime(data.createdOn)};
            pav:lastUpdateOn ${sparqlEscapeDateTime(data.updatedOn)}.
        ${
          data.context
            ? `${sparqlEscapeUri(uri)} ext:editorDocumentContext ${sparqlEscapeString(data.context)}`
            : ''
        }
      }`);
  return {
    ...data,
    id,
    uri,
  };
}
