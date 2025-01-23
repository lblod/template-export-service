import {
  sparqlEscapeDateTime,
  sparqlEscapeInt,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';
import { LogicalFile, PhysicalFile } from '../schemas/file';
import { Optional } from '../utils/types';

export async function createLogicalFile(
  data: Optional<LogicalFile, 'uri' | 'id'>
) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://lblod.data.gift/files/${id}`;
  await update(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX dbpedia: <http://dbpedia.org/resource/>
      INSERT DATA {
        ${sparqlEscapeUri(uri)} 
          a nfo:FileDataObject;
            mu:uuid ${sparqlEscapeString(id)};
            nfo:fileName ${sparqlEscapeString(data.name)};
            dct:format ${sparqlEscapeString(data.format)};
            nfo:fileSize ${sparqlEscapeInt(data.size)};
            dbpedia:fileExtension ${sparqlEscapeString(data.extension)};
            nfo:fileCreated ${sparqlEscapeDateTime(data.createdOn)}.
      }`);
  return {
    ...data,
    uri,
    id,
  };
}

export async function createPhysicalFile(data: Optional<PhysicalFile, 'id'>) {
  const id: string = data.id ?? uuid();
  await update(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
      PREFIX dbpedia: <http://dbpedia.org/resource/>
      PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
      INSERT DATA {
        ${sparqlEscapeUri(data.uri)} 
          a nfo:FileDataObject;
            mu:uuid ${sparqlEscapeString(id)};
            nfo:fileName ${sparqlEscapeString(data.name)};
            dct:format ${sparqlEscapeString(data.format)};
            nfo:fileSize ${sparqlEscapeInt(data.size)};
            dbpedia:fileExtension ${sparqlEscapeString(data.extension)};
            nfo:fileCreated ${sparqlEscapeDateTime(data.createdOn)};
            nie:dataSource ${sparqlEscapeUri(data.sourceUri)}.
      }`);
  return {
    ...data,
    id,
  };
}
