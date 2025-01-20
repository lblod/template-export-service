import { sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';
import { Archive } from '../schemas/archive';
import { Optional } from '../utils/types';

export async function createArchive(data: Optional<Archive, 'id' | 'uri'>) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://redpencil.data.gift/id/archive/${id}`;
  await update(/* sparql */ `
        PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
        PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
        PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
        INSERT DATA {
          ${sparqlEscapeUri(uri)}
            a nfo:DataContainer; 
            a nfo:Archive;
            mu:uuid ${sparqlEscapeString(id)};
            task:hasFile ${sparqlEscapeUri(data.fileUri)}.
        }`);
  return {
    ...data,
    uri,
    id,
  };
}
