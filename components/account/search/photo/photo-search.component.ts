import { BaseComponent } from 'app/components/base.component';
import { RouteType } from 'routing/route-type';
import { User, UserRole } from 'app/models/api/user';
import {
    inject,
    Component,
    Input,
    EventEmitter,
    Output,
    ChangeDetectionStrategy,
    OnInit,
    OnChanges,
    ViewChild,
    ElementRef,
    SimpleChanges,
    ViewChildren,
    QueryList,
} from '@angular/core';
import { SearchParams } from 'app/components/search/search-params';
import { Router, RouterLink } from '@angular/router';
import { HiddenUserService } from 'app/services/hidden-user.service';
import { SearchResults } from 'app/models/search';
import { takeUntil, filter, debounceTime } from 'rxjs/operators';
import { EventAction, PromptEvents } from 'app/services/tracking/types';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { PhotoUploadPurpose } from 'app/models/api/photo';
import { SessionService } from 'app/services/session.service';
import { differenceInDays } from 'date-fns';
import { SliderOption, SliderPickerComponent } from 'app/components/common/slider-picker/slider-picker.component';
import { PhotoOverlayService } from 'app/services/overlay/photo-overlay.service';
import { RestoreScrollPositionService } from 'app/services/ui/restore-scroll-position.service';
import { UserCardComponent } from 'app/components/user/user-card/user-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'modules/shared/shared.module';
import { InfiniteScrollDirective } from 'ngx-infinite-scroll';
import { PagingControlComponent } from 'app/components/search/photo/paging-control/paging-control.component';

class UserWrapper {
    constructor(
        public readonly data: User,
        public hidden = false,
    ) {}
}

class SearchResultsModel {
    constructor(
        public readonly users: UserWrapper[],
        public readonly totalCount: number,
        public readonly hiddenCount: number,
        public readonly searchRole: string,
    ) {}
}

@Component({
    selector: 'photo-search',
    templateUrl: './photo-search.component.html',
    styleUrls: ['./photo-search.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        InfiniteScrollDirective,
        SharedModule,
        SliderPickerComponent,
        RouterLink,
        FormsModule,
        UserCardComponent,
        PagingControlComponent,
        TranslateModule,
    ],
})
export class PhotoSearchComponent extends BaseComponent implements OnInit, OnChanges {
    readonly router = inject(Router);
    readonly sessionService = inject(SessionService);
    readonly hiddenUserService = inject(HiddenUserService);
    readonly eventService = inject(AppEventService);
    readonly photoOverlayService = inject(PhotoOverlayService);
    readonly restoreScrollPositionService = new RestoreScrollPositionService(RouteType.search, this);

    @Input() searchResult?: SearchResults;
    @Input({ required: true }) showLoader: boolean;
    @Input({ required: true }) searchParams: SearchParams;
    @Input() isCombinedView = false;
    @Input() filtersChanged = false;

    @Output() onPageChanged = new EventEmitter<number>();
    @Output() onScrolled = new EventEmitter();
    @Output() searchParamsChanged = new EventEmitter();
    @Output() onHighlightedUserChanged = new EventEmitter<string | null>();
    @Output() adjustFilters = new EventEmitter();
    @Output() resetFilters = new EventEmitter();

    @ViewChild('userListContainer', { static: true }) scrollContainer: ElementRef<HTMLDivElement>;
    @ViewChildren(UserCardComponent) userList: QueryList<UserCardComponent | undefined>;

    EventAction = EventAction;

    model: SearchResultsModel;
    showMap = false;
    firstResultsCount: number;
    firstSearchDistance: number;
    initialDistanceSliderValue: number;
    distanceSliderOptions: SliderOption[] = [];

    get pagingRangeString() {
        if (!this.searchResult) {
            return '';
        }
        const start = (this.searchParams.page - 1) * (this.searchParams.pageSize ?? 0) + 1;
        const end = start + this.searchResult.users.length - 1;
        return `${start} - ${end}`;
    }
    get searchResultDescription() {
        const suffix = this.isCombinedView ? '' : 'NearYou';
        switch (this.searchParams.role) {
            case UserRole.babysitter:
                return 'search.xBabysitters' + suffix;
            case UserRole.childminder:
                return 'search.xChildminders' + suffix;
            case UserRole.parent:
                if (this.authUser.role === UserRole.babysitter) {
                    return 'search.xBabysittingJobs' + suffix;
                } else {
                    return 'search.xChildminderJobs' + suffix;
                }
        }
    }
    get config() {
        return this.countrySettings;
    }
    get showSitterProfileGamification() {
        return (
            !this.isDesktop() &&
            !this.authUser.isParent &&
            this.authUser?.recommendations?.length === 0 &&
            !this.authUser.isParent &&
            differenceInDays(new Date(), this.storageService.lastRecommendationRequestTime ?? new Date(0)) >= 7
        );
    }
    get showParentPhotoUploadGamification() {
        return this.authUser?.isParent && !this.isDesktop() && !this.authUser?.links?.avatar && this.sessionService.firstSession;
    }
    get avatarExample() {
        return this.countrySettings.countryCode === 'my' ? 'parent-avatar-example-group-my' : 'parent-avatar-example-group';
    }
    get showDistanceSlider() {
        return !this.isCombinedView && this.firstResultsCount === 0 && this.sessionService.firstSession && !this.filtersChanged;
    }
    get showEmptyResultsMessage() {
        return !this.showLoader && this.searchResult?.totalCount === 0 && !this.showDistanceSlider;
    }

    ngOnInit() {
        this.showMap = this.countrySettings.showMapBackend;

        this.initModel();

        this.hiddenUserService.hiddenUsers.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            this.initModel();
            this.cd.markForCheck();
        });

        if (!this.isCombinedView && !this.storageService.searchListTracked) {
            this.trackCtaEvent('searchlist-loads', EventAction.searchListView);
            this.storageService.searchListTracked = true;
        }

        this.eventService.events
            .pipe(
                filter(e => e.type === AppEventType.initialOverlayClosed),
                debounceTime(1000),
                takeUntil(this.destroyed$),
            )
            .subscribe(_ => this.showHideUserAnimation());
    }

    ngOnChanges(changes: SimpleChanges) {
        if (this.isFirstSearchResult(changes)) {
            this.setupDistanceSlider();
        }

        this.initModel();
    }

    onAddReviewClicked() {
        this.storageService.lastRecommendationRequestTime = new Date();
        this.navigationService.navigate(RouteType.recommendations);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationSearchList);
    }

    onUploadPhotoClicked() {
        this.trackingService.trackPhotoUploadEvent('photo-select');
        this.photoOverlayService.showPhotoSourceOverlay(PhotoUploadPurpose.avatar);
    }

    onDistanceChange(value: number) {
        const filters = this.storageService.filters;
        if (filters) {
            this.searchParams.maxDistance = value;
            this.searchParamsChanged.emit();
        }
    }

    onScroll() {
        this.onScrolled.emit(null);
    }

    onMouseEnterUserCard(userId: string) {
        if (this.isCombinedView) {
            this.onHighlightedUserChanged.emit(userId);
        }
    }

    onMouseLeaveUserCard() {
        if (this.isCombinedView) {
            this.onHighlightedUserChanged.emit(null);
        }
    }

    hideUser(user: User) {
        this.hiddenUserService.hide(user);
        this.cd.markForCheck();
    }

    unhideUser(index: number, user: User) {
        this.trackingService.trackUserHide(user, false, index);
        this.hiddenUserService.unhide(user);
        this.cd.markForCheck();
    }

    showHidden() {
        this.navigationService.navigate(RouteType.hidden);
    }

    onUserClick(user: User, index: number) {
        this.trackingService.trackUserProfileClicked(user, 'search-user', index);
    }

    // ---- Internal ---- //
    private initModel() {
        const users = (this.searchResult?.users ?? [])
            .filter(user => !this.hiddenUserService.isCompletelyHidden(user))
            .map(user => new UserWrapper(user, this.hiddenUserService.isPreHidden(user)));

        const totalCount = Math.max(this.searchResult ? this.searchResult.totalCount - this.hiddenUserService.hiddenUsersCount() : 0, 0);
        this.model = new SearchResultsModel(users, totalCount, this.hiddenUserService.hiddenUsersCount(), this.searchParams.role);
    }

    private isFirstSearchResult(changes: SimpleChanges) {
        return !!changes.searchResult?.currentValue && !changes.searchResult?.previousValue;
    }

    private setupDistanceSlider() {
        this.firstResultsCount = this.searchResult?.totalCount ?? 0;
        this.firstSearchDistance = this.searchParams.maxDistance;

        if (this.showDistanceSlider) {
            this.distanceSliderOptions = this.generateDistanceSliderOptions(this.firstSearchDistance);
            this.initialDistanceSliderValue = this.distanceSliderOptions[0].value;
            this.onDistanceChange(this.initialDistanceSliderValue);
        }
    }

    private generateDistanceSliderOptions(baseDistance: number) {
        const options = [];
        for (const i of [1, 2, 3, 4]) {
            const distance = baseDistance + i * 2;
            options.push({ label: `${distance}km`, value: distance });
        }
        options.push({ label: 'search.max', value: Math.max(30, baseDistance + 10) });
        return options;
    }

    private showHideUserAnimation() {
        if (this.isDesktop()) {
            return;
        }

        this.userList.first?.runScrollDemo();
    }
}
