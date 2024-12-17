import { validateUser } from './src/middleware';
import { NextFunction, Response, Request } from 'express';
import bodyParser from 'body-parser';
import { app } from 'mu';

app.use(
  bodyParser.json({
    limit: '50mb',
  })
);

app.use(validateUser);
