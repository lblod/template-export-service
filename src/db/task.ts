import {
  sparqlEscapeDateTime,
  sparqlEscapeString,
  sparqlEscapeUri,
  update,
  uuid,
} from 'mu';

import { Optional } from '../utils/types';
import { Task } from '../schemas/task';

export async function createTask(
  data: Optional<Task, 'id' | 'uri'>
): Promise<Task> {
  const id: string = data.id ?? uuid();
  const uri: string = data.uri ?? `http://lblod.data.gift/tasks/${id}`;
  const task = {
    ...data,
    id,
    uri,
  };
  await persistTask(task);
  return task;
}

export async function persistTask(task: Task) {
  const { uri } = task;
  await update(/* sparql */ `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    DELETE {
      ${sparqlEscapeUri(uri)} 
        a task:Task;
        mu:uuid ?id;
        adms:status ?statusUri;
        dct:created ?createdOn;
        dct:modified ?updatedOn;
        task:operation ?operationUri.
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
    };
    INSERT DATA {
      ${sparqlEscapeUri(uri)}
        a task:Task;
        mu:uuid ${sparqlEscapeString(task.id)};
        adms:status ${sparqlEscapeUri(task.statusUri)};
        dct:created ${sparqlEscapeDateTime(task.createdOn)};
        dct:modified ${sparqlEscapeDateTime(task.updatedOn)}.
      
      ${
        task.operationUri
          ? `${sparqlEscapeUri(uri)} task:operation ${sparqlEscapeUri(task.operationUri)}`
          : ''
      }
      ${
        task.errorUri
          ? `${sparqlEscapeUri(uri)} task:error ${sparqlEscapeUri(task.errorUri)}`
          : ''
      }
      ${
        task.resultUri
          ? `${sparqlEscapeUri(uri)} task:resultsContainer ${sparqlEscapeUri(task.resultUri)}`
          : ''
      }
    }`);
}

/**
 * Add a result to a task and mark is as successful
 */
// export async function addResultToTask(
//   taskUri: string,
//   data: Optional<ResultsContainer, 'id' | 'uri'>
// ) {
//   const id = data.id ?? uuid();
//   const uri = data.uri ?? `http://data.lblod.info/archive/${id}`;
//   logger.debug('Setting result on task', { task: taskUri, data });
//   await update(/* sparql */ `
//       PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
//       PREFIX task: <http://redpencil.data.gift/vocabularies/tasks/>
//       PREFIX nfo: <http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#>
//       PREFIX adms: <http://www.w3.org/ns/adms#>
//       PREFIX dct: <http://purl.org/dc/terms/>
//       DELETE {
//         ${sparqlEscapeUri(taskUri)}
//           dct:modified ?updatedOn.
//       }
//       INSERT {
//         ${sparqlEscapeUri(uri)}
//           a nfo:DataContainer;
//           a nfo:Archive;
//           task:hasFile ${sparqlEscapeUri(data.logicalFileUri)};
//           mu:uuid ${sparqlEscapeString(id)}.
//         ${sparqlEscapeUri(taskUri)}
//           task:resultsContainer ${sparqlEscapeUri(uri)};
//           dct:modified ${sparqlEscapeDateTime(new Date())}.
//       }
//       WHERE {
//         ${sparqlEscapeUri(taskUri)}
//           a task:Task;
//           adms:status ?statusUri;
//           dct:modified ?updatedOn.
//       }`);
// }
