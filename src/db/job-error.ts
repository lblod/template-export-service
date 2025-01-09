import { query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';

import { Optional } from '../utils/types';
import { JobError } from '../schemas/job-error';

export async function createJobError(data: Optional<JobError, 'id' | 'uri'>) {
  const id: string = data.id ?? uuid();
  const uri: string =
    data.uri ?? `http://redpencil.data.gift/id/jobs/error/${id}`;
  await query(/* sparql */ `
  PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
  PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
  PREFIX oslc: <http://open-services.net/ns/core#>

  INSERT DATA {
    ${sparqlEscapeUri(uri)} 
      a oslc:Error;
      oslc:message ${sparqlEscapeString(data.message)}.
  }
  `);
  return {
    ...data,
    id,
    uri,
  };
}
