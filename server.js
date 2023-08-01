const http = require('http');
const path = require('path');
const fs = require('fs');
const { format } = require('util');

const host = '0.0.0.0';
const port = 8080;
const judgeFileSplitSize = 512000; // 500kb

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
  const [start, end] = value.split('=');
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
  if (maxFileSize <= judgeFileSplitSize) {
    end = maxFileSize;
  } else {
    end = Math.min(maxFileSize, start + judgeFileSplitSize);
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

  return headers;
}

const server = http.createServer((req, res) => {
  const resourcePath = path.resolve(__dirname, './' + req.url);

  if (!fs.existsSync(resourcePath)) {
    res.writeHead(404);
    res.end();
    return;
  }

  const stat = fs.statSync(resourcePath);
  const range = computeHeaderRange(req.headers.range);
  const suitableRange = computeSuitableRange(range, stat);
  const responseHeader = formatMediaRangeResponseHeader(stat, resourcePath, suitableRange);
  for (let key in responseHeader) {
    res.setHeader(key, responseHeader[key]);
  }

  const readStream = fs.createReadStream(resourcePath, {
    ...suitableRange,
  });
  readStream.pipe(res);
});

server.listen(port, host, () => {
  console.log(`server start on http://127.0.0.1:${port}`);
});
