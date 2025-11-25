import { HiddenUserService } from 'app/services/hidden-user.service';
import { BaseComponent } from 'app/components/base.component';
import { User } from 'app/models/api/user';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { FavoriteService } from 'app/services/api/favorite.service';
import { takeUntil } from 'rxjs/operators';
import { AppEventService } from 'app/services/event.service';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import { SharedModule } from 'modules/shared/shared.module';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';

@Component({
    selector: 'favorites',
    templateUrl: 'favorites.component.html',
    styleUrls: ['./favorites.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, UserCardComponent, RouterLink, TranslateModule],
})
export class FavoritesComponent extends BaseComponent implements OnInit, OnDestroy {
    readonly favoriteService = inject(FavoriteService);
    readonly eventService = inject(AppEventService);
    readonly hiddenUserService = inject(HiddenUserService);

    readonly loading = signal(true);
    readonly favorites = signal<User[]>([]);
    readonly hasFavorites = computed(() => this.favorites().length);
    readonly oddFavoritesAmount = computed(() => this.favorites().length % 2 !== 0);

    ngOnInit() {
        this.favoriteService.favorites.pipe(takeUntil(this.destroyed$)).subscribe((favorites: User[]) => {
            this.loading.set(false);
            this.favorites.set(favorites.filter(user => !this.hiddenUserService.isHidden(user)));
        });

        this.eventService.sendPromptCheckEvent();
    }
}
