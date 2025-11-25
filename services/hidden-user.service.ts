import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { User } from 'app/models/api/user';
import { StorageService } from 'app/services/storage.service';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

const HIDE_TIMEOUT = 10_000;

@Injectable({
    providedIn: 'root',
})
export class HiddenUserService {
    readonly hiddenUsers = new BehaviorSubject<User[]>([]);
    readonly hiddenUsersCount = toSignal(this.hiddenUsers.pipe(map(users => users.length)), { initialValue: 0 });

    private readonly storageService = inject(StorageService);
    private preHidden: User[] = [];
    private hidden: User[] = [];

    constructor() {
        if (this.storageService.hiddenUsers) {
            for (const cachedUser of this.storageService.hiddenUsers) {
                this.hidden.push(Object.assign(new User(), cachedUser));
            }
            this.notifyChange();
        }
    }

    isPreHidden(user: User) {
        return this.preHidden.some(element => element.id === user.id);
    }

    isCompletelyHidden(user: User) {
        return this.hidden.some(element => element.id === user.id);
    }

    isHidden(user: User) {
        return this.isCompletelyHidden(user) || this.isPreHidden(user);
    }

    hide(user: User) {
        if (!this.isHidden(user)) {
            this.preHidden.push(user);
            this.notifyChange();

            setTimeout(() => {
                this.hideCompletely(user);
            }, HIDE_TIMEOUT);
        }
    }

    unhide(user: User) {
        if (this.isCompletelyHidden(user)) {
            this.hidden = this.removeFromArray(this.hidden, user);
            this.syncLocalStorage();
        } else if (this.isPreHidden(user)) {
            this.preHidden = this.removeFromArray(this.preHidden, user);
        }
        this.notifyChange();
    }

    private hideCompletely(user: User) {
        if (this.isPreHidden(user)) {
            this.preHidden = this.removeFromArray(this.preHidden, user);
            this.hidden.push(user);

            this.notifyChange();
            this.syncLocalStorage();
        }
    }

    private syncLocalStorage() {
        this.storageService.hiddenUsers = this.hidden;
    }

    private removeFromArray(array: Array<User>, user: User) {
        return array.filter(item => {
            return item.id !== user.id;
        });
    }

    private notifyChange() {
        this.hiddenUsers.next([...this.preHidden, ...this.hidden]);
    }
}
