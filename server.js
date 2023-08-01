const http = require('http');
const path = require('path');
const fs = require('fs');
const { format } = require('util');

const host = '0.0.0.0';
const port = 8080;
const splitSize = 1 * 1024 * 1024; // 1mb

// video/mp4
function computeHeaderRange(headerRange) {
  const range = {
    start: 0,
    end: undefined,
  };
  if (!headerRange || typeof headerRange !== 'string' || headerRange.indexOf('bytes=') < 0) {
    return range;
  }
  const [_, value = ''] = headerRange.split('bytes=');
  if (!value) {
    return range;
  }
  const [start, end] = value.split('-');
  range.start = Number(start) || 0;
  range.end = Number(end) || undefined;
  return range;
}

function computeSuitableRange(headerComputedRange, stat) {
  const maxFileSize = stat.size;
  let start = 0;
  let end = 0;

  if (headerComputedRange.start) {
    start = headerComputedRange.start;
  }
  if (maxFileSize <= splitSize) {
    end = maxFileSize;
  } else {
    end = Math.min(maxFileSize, start + splitSize);
  }

  return {
    start,
    end,
  };
}

function formatMediaRangeResponseHeader(stat, resourcePath, suitableRange) {
  const maxFileSize = stat.size;
  const headers = {
    'Accept-Ranges': 'bytes',
  };
  const extName = path.extname(resourcePath).toLowerCase();
  if (extName.indexOf('mp4') > -1) {
    headers['Content-Type'] = 'video/mp4';
  }
  headers['Content-Range'] = format('bytes %d-%d/%d', suitableRange.start, suitableRange.end, maxFileSize);
  // headers['Content-Length'] = suitableRange.end - suitableRange.start;

  return headers;
}

const server = http.createServer((req, res) => {
  console.log('req come', req.headers.range);
  const resourcePath = path.resolve(__dirname, './' + req.url);

  if (!fs.existsSync(resourcePath)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const stat = fs.statSync(resourcePath);
  // has range
  if (req.headers.range) {
    const range = computeHeaderRange(req.headers.range);
    const suitableRange = computeSuitableRange(range, stat);
    console.log(range, suitableRange, stat.size, '\n---\n');

    res.writeHead(206, {
      'Content-Range': `bytes ${suitableRange.start}-${suitableRange.end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': suitableRange.end - suitableRange.start + 1,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'max-age=3600',
    });

    const readStream = fs.createReadStream(resourcePath, {
      ...suitableRange,
    });
    readStream.pipe(res);
  }
  // has no range
  else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache',
    });
    res.end();
  }
});

server.listen(port, host, () => {
  console.log(`server start on http://127.0.0.1:${port}`);
});
