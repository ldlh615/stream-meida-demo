const http = require("http");

const server = http.createServer((request, response) => {

});

server.listen(8080, "0.0.0.0", () => {
  console.log("server is listen on http://localhost:8080");
});
