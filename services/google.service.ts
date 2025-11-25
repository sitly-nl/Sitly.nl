import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class GoogleService {
    async loadGSIClientIfNecessary() {
        if (!window.google) {
            await this.loadScript('GOOGLE', 'https://accounts.google.com/gsi/client');
        }
    }

    private loadScript(id: string, src: string) {
        return new Promise<void>((resolve, reject) => {
            // get document if platform is only browser
            if (typeof document !== 'undefined' && !document.getElementById(id)) {
                const signInJS = document.createElement('script');

                signInJS.async = true;
                signInJS.src = src;
                signInJS.onload = () => resolve();

                document.head.appendChild(signInJS);
            } else {
                reject(new Error('platform is not supported'));
            }
        });
    }
}
