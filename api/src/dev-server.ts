import { Server } from './server';
import Debug from 'debug';
import * as http from 'http';
const debug = Debug('express:server');
const port = 3000;
const app = Server.bootstrap().app;

const webServer = http.createServer(app);

webServer.listen(port);

webServer.on('listening', function () {
    const addr = webServer.address();
    const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + (addr?.port?.toString() ?? '');
    debug(`Listening on ${bind}`);
});
