import { PipeTransform, Pipe } from '@angular/core';

enum TimeUnit {
    hour = 'hour',
    min = 'min',
    sec = 'sec',
}

@Pipe({
    name: 'timeLeft',
})
export class InstantJobTimerPipe implements PipeTransform {
    static readonly second = 1000;
    static readonly minute = 60 * InstantJobTimerPipe.second;
    static readonly hour = 60 * InstantJobTimerPipe.minute;
    static readonly day = 24 * InstantJobTimerPipe.hour;

    transform(timeUntilDayExpired: number, args?: Record<string, unknown>) {
        if (!args || !timeUntilDayExpired) {
            return null;
        }

        if (timeUntilDayExpired <= 0) {
            return 0;
        }

        const unit = args.unit as TimeUnit;
        switch (unit) {
            case TimeUnit.hour:
                return Math.floor(timeUntilDayExpired / InstantJobTimerPipe.hour);
            case TimeUnit.min:
                return Math.floor((timeUntilDayExpired % InstantJobTimerPipe.hour) / InstantJobTimerPipe.minute);
            case TimeUnit.sec:
                return Math.floor((timeUntilDayExpired % InstantJobTimerPipe.minute) / InstantJobTimerPipe.second);
            default:
                return 0;
        }
    }
}
