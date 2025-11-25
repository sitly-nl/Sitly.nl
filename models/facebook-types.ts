export interface FacebookCollectionInterface<T> {
    data: T[];
    paging: FacebookPagingInterface;
    error?: string;
}

export interface FacebookAlbumInterface {
    id: string;
    photos: FacebookCollectionInterface<FacebookPhotoInterface>;
    cover_photo: FacebookPhotoInterface;
    name: string;
    count: number;
}

export interface FacebookPhotoInterface {
    created_time: Date;
    id: string;
    picture?: string;
    images: {
        height: number;
        width: number;
        source: string;
    }[];
}

export type FacebookUserResponse = {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    picture: FacebookPicture;
    error: unknown;
};

interface FacebookPagingInterface {
    cursors: {
        before: string;
        after: string;
    };
    next?: string;
    previous?: string;
}

type FacebookPicture = {
    data: {
        height: number;
        width: number;
        url: string;
    };
};
