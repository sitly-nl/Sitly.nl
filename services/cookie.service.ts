import { Injectable } from '@angular/core';
import { EnvironmentUtils } from 'app/utils/device-utils';

@Injectable({
    providedIn: 'root',
})
export class CookieService {
    deleteCookie(key: string) {
        const domain = EnvironmentUtils.isLocalhost ? 'localhost' : `sitly${window.location.host.split('sitly').pop()}`;
        document.cookie = `${key}=;domain=${domain}` + ';path=/' + ';expires=' + new Date().toUTCString();
        document.cookie = `${key}=;path=/;expires=` + new Date().toUTCString(); // added cookie deletion for .com domain
    }

    getCookieValue(cookieName: string) {
        const cookies = document.cookie.split(';');
        const cookie = cookies.find(cookie => cookie.trim().startsWith(`${cookieName}=`));
        return cookie?.split('=')[1];
    }

    setRegistrationLoginAuthTokenCookie(authToken: string) {
        const cookieHostName = window.location.host.includes('localhost') ? '' : `domain=sitly${window.location.host.split('sitly').pop()}`;
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 1);
        document.cookie = `authToken=${authToken}; expires=${maxDate.toUTCString()}; path=/; ${cookieHostName}`;
    }
}
