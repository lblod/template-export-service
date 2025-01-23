import { NextFunction, Request, Response } from 'express';
import { createTask, persistTask } from '../db/task';
import { JOB_STATUSES } from '../constants';
import { Task } from '../schemas/task';
import { isError, isOperational } from '../utils/app-error';
import { createJobError } from '../db/job-error';
import { logger } from './logger';
import { DataContainer } from '../schemas/data-container';
import { JobError } from '../schemas/job-error';

export type TaskHandler = (
  req?: Request,
  res?: Response,
  next?: NextFunction
) => Promise<DataContainer | void>;

export function withTask(handler: TaskHandler) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const now = new Date();
    const task = await createTask({
      createdOn: now,
      updatedOn: now,
      statusUri: JOB_STATUSES.SCHEDULED,
    });
    res.status(202).json({
      data: {
        id: task.id,
        attributes: {
          uri: task.uri,
          createdOn: task.createdOn,
          updatedOn: task.updatedOn,
          status: task.statusUri,
          operation: task.operationUri,
        },
      },
    });
    try {
      await updateTask(task, JOB_STATUSES.BUSY);
      const result = (await handler(req, res, next)) ?? null;
      await updateTask(task, JOB_STATUSES.SUCCESS, result);
    } catch (e: unknown) {
      if (isError(e) && isOperational(e)) {
        logger.error(
          `Error occurred while handling task with uri ${task.uri}:`,
          e
        );
        const jobError = await createJobError({ message: e.message });
        await updateTask(task, JOB_STATUSES.FAILED, null, jobError);
        return;
      } else {
        const jobError = await createJobError({
          message: 'Unknown error occurred',
        });
        await updateTask(task, JOB_STATUSES.FAILED, null, jobError);

        return next(e);
      }
    }
  };
}

async function updateTask(
  task: Task,
  status: JOB_STATUSES,
  result?: DataContainer | null,
  error?: JobError | null
) {
  task.statusUri = status;
  task.updatedOn = new Date();
  if (error) {
    task.errorUri = error.uri;
  }
  if (result) {
    task.resultUri = result.uri;
  }
  await persistTask(task);
}
