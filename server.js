const http = require('http');
const path = require('path');
const fs = require('fs');
const host = '0.0.0.0';
const port = 8080;

const server = http.createServer((req, res) => {
  const resourcePath = path.resolve(__dirname, './' + req.url);
  console.log(resourcePath);
  const readStream = fs.createReadStream(resourcePath);
  readStream.pipe(res);
});

server.listen(port, host, () => {
  console.log(`server start on http://127.0.0.1:${port}`);
});
