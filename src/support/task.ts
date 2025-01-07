import { NextFunction, Request, Response } from 'express';
import { createTask, updateTask } from '../db/task';
import { JOB_STATUSES } from '../constants';
import { Task } from '../schemas/task';
import { isError, isOperational } from '../utils/app-error';
import { createJobError } from '../db/job-error';
import { logger } from './logger';
import { DataContainer } from '../schemas/data-container';

export type TaskHandler = (
  req?: Request,
  res?: Response,
  next?: NextFunction
) => Promise<DataContainer | void>;

export function withTask(handler: TaskHandler) {
  return async function (req: Request, res: Response, next: NextFunction) {
    const task = await createTask({
      createdOn: new Date(),
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
      await updateTaskStatus(task, JOB_STATUSES.BUSY);
      const result = await handler(req, res, next);
      if (result) {
        await setTaskResult(task, result);
      }
      await updateTaskStatus(task, JOB_STATUSES.SUCCESS);
    } catch (e: unknown) {
      if (isError(e) && isOperational(e)) {
        logger.error(
          'Error occured while handling task with uri ${task.uri}:',
          e
        );
        const jobError = await createJobError({ message: e.message });
        task.statusUri = JOB_STATUSES.FAILED;
        task.errorUri = jobError.uri;
        await updateTask(task.uri, task);
        return;
      } else {
        const jobError = await createJobError({
          message: `Unknown error occured while handling task with uri ${task.uri}`,
        });
        task.statusUri = JOB_STATUSES.FAILED;
        task.errorUri = jobError.uri;
        await updateTask(task.uri, task);
        return next(e);
      }
    }
  };
}

async function updateTaskStatus(task: Task, status: JOB_STATUSES) {
  task.statusUri = status;
  task.updatedOn = new Date();
  await updateTask(task.uri, task);
}

async function setTaskResult(task: Task, result: DataContainer) {
  task.resultUri = result.uri;
  task.updatedOn = new Date();
  await updateTask(task.uri, task);
}
