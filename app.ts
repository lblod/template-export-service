import { app } from 'mu';
import { errorHandler, validateUser } from './src/middleware';
import { NextFunction, Response, Request } from 'express';
import router from './src/router';
import bodyParser from 'body-parser';

app.use(
  bodyParser.json({
    limit: '50mb',
  })
);

app.use(validateUser);

app.use(router);

app.use(function (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  errorHandler(err, res);
});

process.on('uncaughtException', (err) => {
  errorHandler(err);
});
