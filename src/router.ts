import { NextFunction, Request, Response, Router } from 'express';
import AppError, { isError, isOperational } from './utils/app-error';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import { logger } from './support/logger';
import { collectResourcesToExport } from './actions/export';
import { DocumentContainer } from './schemas/document-container';
import { SnippetList } from './schemas/snippet-list';
import { createTask, updateTask } from './db/task';
import { JOB_STATUSES } from './constants';
import { createJobError } from './db/job-error';

const router = Router();

interface ExportBody {
  documentContainerUris: string;
  snippetListUris: string;
}
interface ParsedExportBody {
  parsedBody: {
    documentContainerUris: string[];
    snippetListUris: string[];
  };
}

const validateExportBody = (
  req: Request<unknown, unknown, ExportBody, unknown, ParsedExportBody>,
  res: Response<unknown, ParsedExportBody>,
  next: NextFunction
) => {
  if (!req.body) {
    return next(
      new AppError(StatusCodes.BAD_REQUEST, 'Request is missing a body')
    );
  }
  let documentContainerUris: string[] | undefined;
  try {
    documentContainerUris = z
      .array(z.string())
      .optional()
      .parse(req.body.documentContainerUris);
  } catch (e) {
    logger.warn('Document Container URIs do not look like URIs', e);
    return next(
      new AppError(
        StatusCodes.BAD_REQUEST,
        `'documentContainerUris' property of request body is malformed`
      )
    );
  }
  let snippetListUris: string[] | undefined;
  try {
    snippetListUris = z
      .array(z.string())
      .optional()
      .parse(req.body.snippetListUris);
  } catch (e) {
    logger.warn('Snippet List URIs do not look like URIs', e);
    return next(
      new AppError(
        StatusCodes.BAD_REQUEST,
        `'snippetListUris' property of request body is malformed`
      )
    );
  }
  if (!documentContainerUris && !snippetListUris) {
    return next(
      new AppError(
        StatusCodes.BAD_REQUEST,
        `the 'snippetListUris' and 'documentContainerUris' request body properties may not be both undefined`
      )
    );
  }
  res.locals.parsedBody = {
    documentContainerUris: documentContainerUris ?? [],
    snippetListUris: snippetListUris ?? [],
  };
  logger.debug(res.locals.parsedBody);
  next();
};

router.post('/export', validateExportBody, async function (_req, res, next) {
  const documentContainerUris = res.locals.parsedBody.documentContainerUris;
  const snippetListUris = res.locals.parsedBody.snippetListUris as string[];

  const task = await createTask({
    createdOn: new Date(),
    statusUri: JOB_STATUSES.SCHEDULED,
  });
  res.status(201).json({
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

  task.statusUri = JOB_STATUSES.BUSY;
  await updateTask(task.uri, task);
  let resourcesToExport!: {
    documentContainers: DocumentContainer[];
    snippetLists: SnippetList[];
  };

  try {
    resourcesToExport = await collectResourcesToExport({
      documentContainerUris,
      snippetListUris,
    });
  } catch (e) {
    if (isError(e) && isOperational(e)) {
      const jobError = await createJobError({ message: e.message });
      task.statusUri = JOB_STATUSES.FAILED;
      task.errorUri = jobError.uri;
      await updateTask(task.uri, task);
    } else {
      return next(e);
    }
  }

  logger.debug(JSON.stringify(resourcesToExport));
  task.statusUri = JOB_STATUSES.SUCCESS;
  await updateTask(task.uri, task);
});

router.post('/import', function (_req, _res, _next) {});
export default router;
