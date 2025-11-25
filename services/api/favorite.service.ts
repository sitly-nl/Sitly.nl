import { ResponseParser } from 'app/parsers/response-parser';
import { Injectable, EventEmitter, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { share, map, tap, switchMap } from 'rxjs/operators';
import { ApiService, GenericError } from 'app/services/api/api.service';
import { User } from 'app/models/api/user';

export interface UserFavoritesChangedInterface {
    userId: string;
    favorite: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class FavoriteService {
    private apiService = inject(ApiService);

    changed = new EventEmitter<User[]>();
    changedUser = new EventEmitter<UserFavoritesChangedInterface>();

    private _favorites: User[];
    get favorites() {
        if (!this._favorites) {
            return this.refreshFavorites();
        }
        return new Observable<User[]>(observer => {
            observer.next(this._favorites);
            observer.complete();
        });
    }

    private refreshFavorites() {
        return this.apiService.get('/users/me/favorites', { params: { include: 'children,recommendations' } }).pipe(
            map(response => ResponseParser.parseObject<User[]>(response).data),
            tap((favorites: User[]) => {
                this._favorites = favorites;
                this.changed.emit(this._favorites);
            }),
        );
    }

    addFavorite(userId: string) {
        this.changedUser.emit({ userId, favorite: true });

        const req = this.apiService.post('/users/me/favorites', { body: { userId } }).pipe(
            map(response => ResponseParser.parseObject<User>(response)),
            share(),
        );

        req.subscribe(_ => {
            return this.refreshFavorites().subscribe();
        });

        return req;
    }

    deleteFavorite(userId: string) {
        this.changedUser.emit({ userId, favorite: false });

        return this.favorites.pipe(
            switchMap(() => {
                this._favorites = this._favorites.filter(item => item.id !== userId);
                this.changed.emit(this._favorites);
                return this.apiService.delete('/users/me/favorites/' + userId);
            }),
        );
    }

    async toggleFavorites(user: User) {
        if (user.isFavorite) {
            try {
                await this.deleteFavorite(user.id).toPromise();
                user.isFavorite = false;
            } catch (error) {
                user.isFavorite = !(error as GenericError).error?.errors?.some(item => item.title === 'Favorite not found');
            }
        } else {
            try {
                await this.addFavorite(user.id).toPromise();
                user.isFavorite = true;
            } catch (error) {
                user.isFavorite = !!(error as GenericError).error?.errors?.some(item => item.title === 'User is already a favorite');
            }
        }
        return user;
    }
}
