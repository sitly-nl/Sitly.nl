export class JwtUtils {
    static parse<T>(token?: string) {
        const base64Url = token?.split('.')?.[1];
        if (!base64Url) {
            return undefined;
        }

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window
                .atob(base64)
                .split('')
                .map(char => {
                    return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
                })
                .join(''),
        );
        try {
            return JSON.parse(jsonPayload) as T;
        } catch {
            return undefined;
        }
    }
}
