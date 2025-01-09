import { NextFunction, Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';
import AppError from './utils/app-error';
import { logger } from './support/logger';
import { collectResourcesToExport, createZip } from './actions/export';
import { withTask } from './support/task';
import { createArchive } from './db/archive';
import multer, { FileFilterCallback } from 'multer';
import path from 'node:path';
import { unzip } from './actions/import';

const router = Router();
interface ParsedExportBody {
  parsedBody: {
    documentContainerUris: string[];
    snippetListUris: string[];
  };
}

const validateExportBody = (
  req: Request,
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
  logger.debug('Received export request body', res.locals.parsedBody);
  next();
};

router.post('/export', validateExportBody, async function (req, res, next) {
  const documentContainerUris = res.locals.parsedBody.documentContainerUris;
  const snippetListUris = res.locals.parsedBody.snippetListUris;
  await withTask(async () => {
    const resourcesToExport = await collectResourcesToExport({
      documentContainerUris,
      snippetListUris,
    });

    logger.debug('Exporting resources', resourcesToExport);
    const { logicalFileUri } = await createZip(resourcesToExport);
    const archive = await createArchive({
      fileUri: logicalFileUri,
    });
    return archive;
  })(req, res, next);
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback
) => {
  const validExtension = /.zip/.test(
    path.extname(file.originalname).toLowerCase()
  );
  if (validExtension) {
    return callback(null, true);
  } else {
    return callback(
      new AppError(
        StatusCodes.NOT_ACCEPTABLE,
        `Expected a file with a .zip extension, got a file with a ${path.extname(file.originalname)} extension`
      )
    );
  }
};

const upload = multer({ storage: multer.memoryStorage(), fileFilter });

router.post('/import', upload.single('file'), async function (req, res, next) {
  const file = req.file!;
  await withTask(async () => {
    const serialization = unzip(file.buffer);
    logger.debug(serialization.documentContainers);
    return;
  })(req, res, next);
});
export default router;
