import { Component, Input, ChangeDetectionStrategy, ViewChild, ElementRef, computed, signal } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { User } from 'app/models/api/user';
import { TranslateModule } from '@ngx-translate/core';
import { LowerCasePipe } from '@angular/common';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';
import { fromEvent } from 'rxjs';
import { debounceTime, map, takeUntil } from 'rxjs/operators';

@Component({
    selector: 'similar-users',
    templateUrl: './similar-users.component.html',
    styleUrls: ['./similar-users.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [UserCardComponent, LowerCasePipe, TranslateModule],
})
export class SimilarUsersComponent extends BaseComponent {
    @Input({ required: true }) user: User;
    @ViewChild('similarUsersGrid') usersContainerRef: ElementRef<HTMLDivElement>;

    readonly canScrollNext = computed(() => {
        const scrollLeft = this.userScroll();
        return (
            this.usersContainerRef?.nativeElement &&
            scrollLeft + this.usersContainerRef.nativeElement.clientWidth < this.usersContainerRef.nativeElement.scrollWidth
        );
    });
    readonly canScrollPrevious = computed(() => this.userScroll() > 0);
    readonly showScrollButtons = signal(false);

    private readonly userScroll = signal<number>(-1);

    onPrevious() {
        this.updateScrollPosition(false);
    }

    onNext() {
        this.updateScrollPosition(true);
    }

    onUserClick(user: User, index: number) {
        this.trackingService.trackUserProfileClicked(user, 'similar-user', index);
    }

    ngAfterViewInit() {
        if (this.usersContainerRef) {
            fromEvent(this.usersContainerRef.nativeElement, 'scroll')
                .pipe(
                    takeUntil(this.destroyed$),
                    debounceTime(300),
                    map(event => (event.target as HTMLDivElement).scrollLeft),
                )
                .subscribe(value => {
                    this.userScroll.set(Math.round(value));
                });

            this.userScroll.set(0);
            this.showScrollButtons.set(
                this.usersContainerRef?.nativeElement
                    ? this.usersContainerRef.nativeElement.clientWidth < this.usersContainerRef.nativeElement.scrollWidth
                    : false,
            );
        }
    }

    private updateScrollPosition(leftToRight: boolean) {
        // The goal here is to scroll to the first item, that isn't visible fully.
        // The cleanest way to do it would be to calculate how many user cards are visible fully and then to scroll to the next one.
        // But to make it more simple we can just scroll by 80% of container width, then scroll-snap will adjust user cards position. In most cases it would do what we need
        const left =
            this.usersContainerRef.nativeElement.scrollLeft +
            (leftToRight ? 1 : -1) * (this.usersContainerRef.nativeElement.clientWidth * 0.8);
        this.usersContainerRef.nativeElement?.scrollTo({
            left,
            behavior: 'smooth',
        });
    }
}
