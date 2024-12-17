//@ts-expect-error mu does not have type declaration
import { app } from 'mu';

app.get('/hello', function (req, res) {
  res.send('Hello mu-javascript-template');
});
