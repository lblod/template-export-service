import bodyParser from 'body-parser';
import { app } from 'mu';

app.use(
  bodyParser.json({
    limit: '50mb',
  })
);
