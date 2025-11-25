import * as request_ from 'request';
import * as util from 'util';
import { Options, Response } from 'request';
import { apiTestsUserAgent, Environment } from '../services/env-settings.service';
import { IncomingHttpHeaders } from 'http';

export const request = util.promisify<Options, Response>(request_);

export const optionalAwait = async (promise: Promise<unknown>) => {
    if (Environment.isProd) {
        promise.then();
    } else {
        await promise;
    }
};

export class Util {
    static keysOf<T extends object>(obj: T) {
        return Object.keys(obj) as (keyof T)[];
    }

    static entries<T extends object>(obj: T) {
        return Object.entries(obj) as [keyof T, T[keyof T]][];
    }

    static pickDefinedValues<T extends object>(obj: T) {
        return Util.keysOf(obj).reduce((acc, key) => {
            if (obj[key] !== undefined) {
                acc[key] = obj[key];
            }
            return acc;
        }, {} as T);
    }

    static round = (number: number, precision: number) => {
        const factor = Math.pow(10, precision);
        const tempNumber = number * factor;
        const roundedTempNumber = Math.round(tempNumber);
        return roundedTempNumber / factor;
    };

    static deg2rad = (deg: number) => {
        return deg * (Math.PI / 180);
    };
    static rad2deg = (rad: number) => {
        return (180 * rad) / Math.PI;
    };

    static calculateDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000; // Radius of the earth in m
        const dLat = Util.deg2rad(lat2 - lat1);
        const dLon = Util.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(Util.deg2rad(lat1)) * Math.cos(Util.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return parseFloat(d.toFixed(1));
    };

    static createCirclePolygon = (lat: number, lng: number, distance: number) => {
        distance = distance / 6371; // earth radius in KM

        const polygon = [];
        for (let bearing = 0; bearing < 360; bearing += 22.5) {
            const bearingRad = Util.deg2rad(bearing);

            const latitude = Util.rad2deg(
                Math.asin(
                    Math.sin(Util.deg2rad(lat)) * Math.cos(distance) +
                        Math.cos(Util.deg2rad(lat)) * Math.sin(distance) * Math.cos(bearingRad),
                ),
            );
            const longitude = Util.rad2deg(
                Util.deg2rad(lng) +
                    Math.atan2(
                        Math.sin(bearingRad) * Math.sin(distance) * Math.cos(Util.deg2rad(lat)),
                        Math.cos(distance) - Math.sin(Util.deg2rad(lat)) * Math.sin(Util.deg2rad(latitude)),
                    ),
            );
            polygon.push({ latitude, longitude });
        }

        polygon.push(polygon[0]); // close the circle;

        return polygon;
    };

    static boolyToInt(value: unknown) {
        if (value === 'true') {
            value = 1;
        }

        return (value as number) | 0;
    }

    private static booly = [1, '1', true, 'true', 0, '0', false, 'false'];
    static isBooly(value: unknown) {
        return Util.booly.some(item => item === value);
    }

    static isFalsy(value: unknown) {
        return [0, '0', false, 'false'].some(item => item === value);
    }

    static isTruthy(value: unknown) {
        return [1, '1', true, 'true'].some(item => item === value);
    }

    static isWeb(headers: IncomingHttpHeaders) {
        return !Util.isApp(headers);
    }

    static isApp(headers: IncomingHttpHeaders) {
        return Util.isAndroidApp(headers) || Util.isIOSApp(headers);
    }

    static isNativeAndroidApp(headers: IncomingHttpHeaders) {
        return headers['user-agent']?.startsWith('Android app') ?? false;
    }

    static isAndroidApp(headers: IncomingHttpHeaders) {
        return Util.isNativeAndroidApp(headers) || headers['x-sitly-platform'] === 'android-app';
    }

    static isIOSApp(headers: IncomingHttpHeaders) {
        return headers['user-agent']?.startsWith('iOS app') ?? false;
    }

    static isTestSuite(userAgent?: string) {
        return userAgent === apiTestsUserAgent;
    }

    static isTestingEmail(email: string) {
        return /^testing\+\d+@sitly\.com$/.test(email);
    }

    static wait(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static rand(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    static shuffledArrayOfNumbers(length: number) {
        const numbers = Array.from({ length }, (_, i) => i);
        for (let i = numbers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
        }
        return numbers;
    }

    static aggregatedDescription<T extends string | number>(array: T[], lastSeparator = ' & ') {
        return array.reduce((previous, current, index, array) => {
            return `${previous}${previous ? (index === array.length - 1 ? lastSeparator : ', ') : ''}${current}`;
        }, '');
    }
}
