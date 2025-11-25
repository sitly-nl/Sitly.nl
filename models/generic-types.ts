export interface MapBounds {
    north: number;
    east: number;
    south: number;
    west: number;
}

export interface MapCoordinates {
    lat: number;
    lng: number;
}

export type SocialUserToken = {
    accessToken: string;
    provider: 'facebook' | 'google';
};
