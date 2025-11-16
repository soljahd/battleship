import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

export function startHttpServer(port: number) {
  const httpServer = http.createServer(function (req, res) {
    const __dirname = path.resolve(path.dirname(''));
    const file_path = __dirname + (req.url === '/' ? '/front/index.html' : '/front' + (req.url || ''));
    fs.readFile(file_path, function (err, data) {
      if (err) {
        res.writeHead(404);
        res.end(JSON.stringify(err));
        return;
      }
      res.writeHead(200);
      res.end(data);
    });
  });

  console.log(`Start static http server on the ${String(port)} port!`);
  httpServer.listen(port);
}
