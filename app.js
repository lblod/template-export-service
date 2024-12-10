import { app } from 'mu';

app.get('/hello', function( req, res ) {
  res.send('Hello mu-javascript-template');
} );