import { NextFunction, Request, Response } from 'express';
import AppError from './utils/app-error';
import { StatusCodes } from 'http-status-codes';
import { ALLOWED_USER_GROUPS } from './constants';
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
    next(unAuthorizedError);
  }
  const allowedGroups: Record<string, string>[] = JSON.parse(
    req.get('mu-auth-allowed-groups') as string
  );
  const match = allowedGroups.find((group) =>
    ALLOWED_USER_GROUPS.includes(group.name)
  );
  if (!match) {
    next(unAuthorizedError);
  }
  next();
};
