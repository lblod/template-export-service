export enum JOB_STATUSES {
  SCHEDULED = 'http://redpencil.data.gift/id/concept/JobStatus/scheduled',
  BUSY = 'http://redpencil.data.gift/id/concept/JobStatus/busy',
  SUCCESS = 'http://redpencil.data.gift/id/concept/JobStatus/success',
  FAILED = 'http://redpencil.data.gift/id/concept/JobStatus/failed',
  CANCELED = 'http://redpencil.data.gift/id/concept/JobStatus/canceled',
}

// TODO: make this configurable through an environment variable
export const ALLOWED_USER_GROUPS = ['org-wf'];
export const MAXIMUM_FILE_UPLOAD_SIZE = 10000000; //10 MB
