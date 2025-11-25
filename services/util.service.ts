import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class UtilService {
    delay(callback: (...args: unknown[]) => void, timeout = 0) {
        return setTimeout(callback, timeout);
    }

    static tryUntil(callback: () => boolean, interval = 100, numberOfRetries = 50) {
        const int = setInterval(() => {
            const ret = callback();
            numberOfRetries--;
            if (ret || numberOfRetries === 0) {
                clearInterval(int);
            }
        }, interval);
    }
}
