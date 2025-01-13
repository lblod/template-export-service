import { sparqlEscapeString, sparqlEscapeUri, update, uuid } from 'mu';

import { Optional } from '../utils/types';
import { JobError } from '../schemas/job-error';

export async function createJobError(data: Optional<JobError, 'id' | 'uri'>) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://redpencil.data.gift/id/jobs/error/${id}`;
  const error = {
    ...data,
    id,
    uri,
  };
  await persistError(error);
  return error;
}

export async function persistError(error: JobError) {
  await update(/* sparql */ `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    DELETE {
      ?uri
        a oslc:Error;
        mu:uuid ?id;
        oslc:message ?message.
    }
    WHERE {
      ?uri
        a oslc:Error;
        mu:uuid ?id;
        oslc:message ?message.

      FILTER(?uri = ${sparqlEscapeUri(error.uri)})
    };
    INSERT DATA {
      ${sparqlEscapeUri(error.uri)}
        a oslc:Error;
        mu:uuid ${sparqlEscapeString(error.id)};
        oslc:message ${sparqlEscapeString(error.message)}.
    }
  `);
}
