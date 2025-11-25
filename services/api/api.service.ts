import { StatusCode } from 'app/models/status-codes';
import { Injectable, EventEmitter, inject } from '@angular/core';
import {
    HttpClient,
    HttpHeaders,
    HttpParams,
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpErrorResponse,
    HttpContext,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { StorageService } from 'app/services/storage.service';
import { ServerResponse } from 'app/models/api/response';
import { EnvironmentService } from 'app/services/environment.service';
import { environment } from 'environments/environment';
import { CountryCode } from 'app/models/api/country';
import { LocaleService } from 'app/services/locale.service';

export type ParamsMapValue = string | number | boolean | { [key: string]: ParamsMapValue } | Array<string | number | boolean>;
export type ParamsMap = Record<string, ParamsMapValue>;
export type BrandCode = CountryCode | 'main';

export interface Error<T> extends HttpErrorResponse {
    status: number;
    error: {
        errors?: T[];
    } | null;
}

export type GenericError = Error<{
    code: 'INVALID_VALUE' | 'INVALID_FORMAT';
    title: string;
    source: {
        parameter: string;
    };
}>;

interface RequestOptions {
    headers?: HttpHeaders | { [header: string]: string | string[] };
    context?: HttpContext;
    observe?: 'body';
    params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
    reportProgress?: boolean;
    responseType?: 'json';
    withCredentials?: boolean;
}

interface RequestInput {
    brandCode?: BrandCode;
    responseType?: string;
    noAuth?: boolean;
    headers?: {
        [header: string]: string | string[];
    };
    cachable?: boolean;
    body?: unknown;
    params?: ParamsMap;
}

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    private readonly storageService = inject(StorageService);
    private readonly http = inject(HttpClient);

    private cache: Record<number, ServerResponse> = {};

    clearCache() {
        this.cache = {};
    }

    get<T = ServerResponse>(endpoint: string, input: RequestInput = {}) {
        const paramsObject = this.parseParamsObject(input.params);

        const appendChar = !endpoint.includes('?') ? '?' : '&';
        const parsedParams = paramsObject.toString().replace(/\+/g, '%2B');
        const urlForCaching = `${endpoint}${appendChar}${parsedParams}`;
        const cacheId = this.createCacheId(urlForCaching);
        if (input.cachable) {
            if (this.cache[cacheId]) {
                return new Observable<T>(observer => {
                    observer.next(this.cache[cacheId] as T);
                    observer.complete();
                });
            }
        }

        const options = this.defaultOptions(input);
        options.params = paramsObject;
        if (input.responseType) {
            options.responseType = input.responseType as never;
        }

        return this.http.get<T>(this.getFullUrl(endpoint, input.brandCode), options).pipe(
            tap(response => {
                if (input.cachable) {
                    this.cache[cacheId] = response as ServerResponse;
                }
            }),
        );
    }

    post<T = ServerResponse>(endpoint: string, input: RequestInput = {}) {
        return this.http.post<T>(this.getFullUrl(endpoint, input.brandCode), input.body, this.defaultOptions(input));
    }

    patch(endpoint: string, input: RequestInput = {}) {
        const options = this.defaultOptions(input);
        if (input.params) {
            options.params = this.parseParamsObject(input.params);
        }
        return this.http.patch<ServerResponse>(this.getFullUrl(endpoint, input.brandCode), input.body, options);
    }

    delete(endpoint: string) {
        return this.http.delete<ServerResponse>(this.getFullUrl(endpoint), this.defaultOptions());
    }

    // ----  Builders ---- //
    private getFullUrl(url: string, dedicatedBrandCode?: BrandCode) {
        const brandCode = dedicatedBrandCode ?? this.storageService.countryCode?.toLowerCase();
        if (!brandCode) {
            throw new Error('No brand code provided');
        }
        return `${environment.apiUrl}/${brandCode}${url}`;
    }

    private parseParamsObject(params?: ParamsMap, paramName?: string, result: HttpParams = new HttpParams()) {
        for (const itemName in params) {
            if (itemName) {
                const value = params[itemName];
                const fullItemName = !paramName ? itemName : `${paramName}[${itemName}]`;
                if (value instanceof Array) {
                    let arrayValue = '';
                    for (const item of value) {
                        arrayValue += `${arrayValue.length > 0 ? ',' : ''}${item}`;
                    }
                    result = result.append(fullItemName, arrayValue);
                } else if (typeof value === 'object') {
                    result = this.parseParamsObject(value, fullItemName, result);
                } else if (value !== null && value !== undefined) {
                    result = result.append(fullItemName, `${value}`);
                }
            }
        }
        return result;
    }

    // ---- Cache ---- //
    private createCacheId(url: string) {
        let hash = 0;
        if (url.length === 0) {
            return hash;
        }

        let i: number;
        for (i = 0; i < url.length; i++) {
            const chr = url.charCodeAt(i);
            hash = (hash << 5) - hash + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }

    private defaultOptions(input?: RequestInput) {
        const headers = input?.headers ?? {};

        const apiToken = this.storageService.token;
        if (apiToken && !input?.noAuth) {
            headers.Authorization = `Bearer ${apiToken}`;
        }

        return { headers } as RequestOptions;
    }
}

@Injectable({
    providedIn: 'root',
})
export class ApiInterceptor implements HttpInterceptor {
    static readonly onUnauthorized = new EventEmitter();
    static readonly commonError = new EventEmitter();
    private readonly localeService = inject(LocaleService);
    private readonly environmentService = inject(EnvironmentService);

    private getHeaders(request: HttpRequest<unknown>) {
        let headers = request.headers ?? new HttpHeaders();
        headers = headers.set('Accept-Language', this.localeService.getLocaleCode());
        headers = headers.set('x-sitly-platform', this.environmentService.trackingPlatform);
        headers = headers.set('x-timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);

        return headers;
    }

    intercept(request: HttpRequest<unknown>, next: HttpHandler) {
        request = request.clone({
            headers: this.getHeaders(request),
        });
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === StatusCode.unauthorized) {
                    ApiInterceptor.onUnauthorized.emit();
                } else if (error.status >= 500 && error.status <= 599) {
                    ApiInterceptor.commonError.emit({ error, url: request.url });
                }
                return throwError(error);
            }),
        );
    }
}
