import { ReadStream, createReadStream, unlink } from 'fs';
import { GenerateInvoicePdfInput } from './pdf-builder.service';
import { fork } from 'child_process';

export class ChildProcessService {
    static getPdf(input: GenerateInvoicePdfInput, callback: (readStream: ReadStream | undefined) => void) {
        const process = fork('dist/src/services/pdf-builder.service.js', { execArgv: [] });
        process.on('message', (pdfFilePath: string) => {
            if (pdfFilePath?.length > 0) {
                const onFinish = () => {
                    unlink(pdfFilePath, () => {});
                    process.kill('SIGINT');
                };

                callback(createReadStream(pdfFilePath).on('close', onFinish).on('finish', onFinish));
            } else {
                callback(undefined);
                process.kill('SIGINT');
            }
        });
        process.send(input);
    }
}
