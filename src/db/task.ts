import {
  query,
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';

import { Optional } from '../utils/types';
import { Task } from '../schemas/task';

export async function createTask(data: Optional<Task, 'id' | 'uri'>) {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://lblod.data.gift/tasks/${id}`;
  await query(/* sparql */ `
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
  PREFIX adms: <http://www.w3.org/ns/adms#>
  PREFIX dct: <http://purl.org/dc/terms/>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  INSERT DATA {
    ${sparqlEscapeUri(uri)} 
      a task:Task;
      mu:uuid ${sparqlEscapeString(id)};
      adms:status ${sparqlEscapeUri(data.statusUri)};
      dct:created ${sparqlEscapeDateTime(data.createdOn)};
      dct:modified ${sparqlEscapeDateTime(data.updatedOn ?? data.createdOn)}.
    
    ${
      data.operationUri
        ? `${sparqlEscapeUri(uri)} task:operation ${sparqlEscapeUri(data.operationUri)}`
        : ''
    }
    ${
      data.errorUri
        ? `${sparqlEscapeUri(uri)} task:error ${sparqlEscapeUri(data.errorUri)}`
        : ''
    }
  }`);
  return {
    ...data,
    id,
    uri,
  };
}

export async function updateTask(
  uri: string,
  data: Optional<Task, 'id' | 'uri'>
) {
  await update(/* sparql */ `
      PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
      PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
      PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
      PREFIX adms: <http://www.w3.org/ns/adms#>
      PREFIX dct: <http://purl.org/dc/terms/>
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
      DELETE {
        ${sparqlEscapeUri(uri)} 
          adms:status ?statusUri;
          dct:created ?createdOn;
          dct:modified ?updatedOn;
          task:operation ?operationUri.
      }
      INSERT {
        ${sparqlEscapeUri(uri)}
          adms:status ${sparqlEscapeUri(data.statusUri)};
          dct:created ${sparqlEscapeDateTime(data.createdOn)};
          dct:modified ${sparqlEscapeDateTime(data.updatedOn ?? data.createdOn)}.
        
        ${
          data.operationUri
            ? `${sparqlEscapeUri(uri)} task:operation ${sparqlEscapeUri(data.operationUri)}`
            : ''
        }
        ${
          data.errorUri
            ? `${sparqlEscapeUri(uri)} task:error ${sparqlEscapeUri(data.errorUri)}`
            : ''
        }
      }
      WHERE {
        ${sparqlEscapeUri(uri)} 
          a task:Task;
          mu:uuid ?id;
          adms:status ?statusUri;
          dct:created ?createdOn;
          dct:modified ?updatedOn.
        OPTIONAL {
          ${sparqlEscapeUri(uri)} task:operation ?operationUri.
        }
      }`);
}
