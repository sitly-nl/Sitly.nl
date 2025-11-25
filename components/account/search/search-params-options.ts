export enum LastSeenOnline {
    anytime = 'anytime',
    today = 'today',
    last7days = 'last7days',
    last30days = 'last30days',
}

export class SearchParamsOptions {
    lastSeenOnline = Object.values(LastSeenOnline);
    distances = [1, 2, 3, 4, 5, 10, 20, 30];
    childrenAmount = ['', '1', '2', '3', '4', '5', '6'];
    babysitterAge = { min: 14, max: 70 };
    childrenAge = { min: 0, max: 15 };
}
