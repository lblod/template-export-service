import { NextFunction, Request, Response } from 'express';
import AppError, { isOperational } from './utils/app-error';
import { StatusCodes } from 'http-status-codes';
import { ALLOWED_USER_GROUPS } from './constants';
import { logger } from './support/logger';

export const validateUser = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const unAuthorizedError = new AppError(
    StatusCodes.UNAUTHORIZED,
    "You don't have the correct access rights to access this endpoint"
  );
  if (!req.get('mu-auth-allowed-groups')) {
    return next(unAuthorizedError);
  }
  const allowedGroups: Record<string, string>[] = JSON.parse(
    req.get('mu-auth-allowed-groups') as string
  );
  const match = allowedGroups.find((group) =>
    ALLOWED_USER_GROUPS.includes(group.name)
  );
  if (!match) {
    return next(unAuthorizedError);
  }
  next();
};

export const errorHandler = (error: Error, res?: Response) => {
  if (!isOperational(error)) {
    logger.error('Handling non-operational error: ', error);
    if (res && !res.headersSent) {
      res.status(500).json({ errors: [{ title: 'An unknown error occured' }] });
    }
    if (process.env.NODE_ENV === 'production') {
      // TODO: find a way to more gracefully exit the service
      // e.g. https://expressjs.com/en/advanced/healthcheck-graceful-shutdown.html,
      // https://nodejs.org/api/http.html#serverclosecallback
      process.exit(1);
    } else {
      logger.error('Process not ending in development mode');
    }
  } else {
    logger.error('Handling operational error: ', error);
    if (res && !res.headersSent) {
      const statusCode =
        error instanceof AppError && error.statusCode
          ? error.statusCode
          : StatusCodes.INTERNAL_SERVER_ERROR;
      res.status(statusCode).json({ errors: [{ title: error.message }] });
    }
  }
};
