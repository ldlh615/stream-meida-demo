const http = require('http');
const path = require('path');
const fs = require('fs');
const { URL } = require('url');

const host = '0.0.0.0';
const port = 3000;
const splitSize = 1 * 1024 * 1024; // 1mb

function computeRange(headerRange, fileSize) {
  const range = {
    start: 0,
    end: undefined,
    size: fileSize,
    length: 0,
  };
  if (!headerRange || typeof headerRange !== 'string' || headerRange.indexOf('bytes=') < 0) {
    return range;
  }
  const [_, value = ''] = headerRange.split('bytes=');
  if (!value) {
    return range;
  }
  const [start, end] = value.split('-');
  range.start = parseInt(start) || 0;
  range.end = parseInt(end) || range.start + splitSize;
  if (range.end > fileSize - 1) {
    range.end = fileSize - 1;
  }
  range.length = range.end - range.start + 1;
  return range;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + host + ':' + port);
  const resourcePath = path.resolve(__dirname, './resource', '.' + url.pathname);
  const params = url.searchParams;
  const type = params.get('type');

  if (!fs.existsSync(resourcePath)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const stat = fs.statSync(resourcePath);
  const fileSize = stat.size;

  if (type === 'fileSize') {
    res.write(String(fileSize));
    res.end();
    return;
  }

  // has range
  if (req.headers.range) {
    const range = computeRange(req.headers.range, fileSize);

    res.writeHead(206, {
      'Content-Range': `bytes ${range.start}-${range.end}/${range.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': range.length,
      'Content-Type': 'video/mp4',
    });

    const readStream = fs.createReadStream(resourcePath, {
      start: range.start,
      end: range.end,
    });
    readStream.pipe(res);
  }
  // has no range
  else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
    });
    res.end();
  }
});

server.listen(port, host, () => {
  console.log(`server start on http://127.0.0.1:${port}`);
});
