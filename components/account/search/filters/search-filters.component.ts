import { NgForm, FormsModule } from '@angular/forms';
import { UserAvailabilityInterface, UserRole } from 'app/models/api/user';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import {
    inject,
    Component,
    ChangeDetectionStrategy,
    Input,
    OnInit,
    EventEmitter,
    Output,
    ViewChild,
    OnChanges,
    ElementRef,
    SimpleChanges,
} from '@angular/core';
import { SearchParams, SearchType, SortType } from 'app/components/search/search-params';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Prompt, PromptType } from 'app/models/api/prompt';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { takeUntil } from 'rxjs/operators';
import { BaseComponent } from 'app/components/base.component';
import { formattedDate } from 'app/models/date-languages';
import { ToolbarActionType, ToolbarBorderStyle } from 'modules/shared/components/toolbar-old/toolbar.component';
import { EventAction } from 'app/services/tracking/types';
import { TrackingUtils } from 'app/services/tracking/tracking-utils';
import { FilterType } from 'app/components/search/filters/search-filters-types';
import { FormCheckboxComponent } from 'app/components/common/form/checkbox.component';
import { AvailabilityCalendarComponent } from 'app/components/availability-calendar/availability-calendar.component';
import { LowerCasePipe, TitleCasePipe } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';
import { SliderComponent } from 'app/components/common/slider/slider.component';

@Component({
    selector: 'search-filters',
    templateUrl: './search-filters.component.html',
    styleUrls: ['./search-filters.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        FormsModule,
        AvailabilityCalendarComponent,
        FormCheckboxComponent,
        SliderComponent,
        LowerCasePipe,
        TitleCasePipe,
        TranslateModule,
    ],
})
export class SearchFiltersComponent extends BaseComponent implements OnInit, OnChanges {
    readonly translateService = inject(TranslateService);
    readonly userUpdatesService = inject(UserUpdatesService);

    @Input() isPremium = false;
    @Input({ required: true }) searchParams: SearchParams;
    @Input({ required: true }) searchType: SearchType;
    @Input() totalCount?: number;
    @Input() visible = false;
    @Input() type: 'overlay' | 'bar';
    @Input() selectFilter?: FilterType;

    @Output() onFiltered = new EventEmitter();
    @Output() onClosed = new EventEmitter();
    @Output() onShowFilters = new EventEmitter();
    @Output() onRestoreFilters = new EventEmitter();
    @Output() onClearFilters = new EventEmitter();
    @Output() onShowPremium = new EventEmitter();

    @ViewChild('searchForm', { static: true }) form: NgForm;
    @ViewChild('distance', { static: false }) distanceFilter: ElementRef<HTMLSelectElement>;
    @ViewChild('distanceLayout', { static: false }) distanceLayout: ElementRef<HTMLDivElement>;
    @ViewChild('ageGroupsLayout', { static: false }) ageGroupsLayout: ElementRef<HTMLDivElement>;
    @ViewChild('availabilityLayout', { static: false }) availabilityLayout: ElementRef<HTMLDivElement>;
    @ViewChild('ageRangeLayout', { static: false }) ageRangeLayout: ElementRef<HTMLDivElement>;

    UserRole = UserRole;
    FilterType = FilterType;
    SearchType = SearchType;
    openFilter?: FilterType;
    EventAction = EventAction;
    ToolbarBorderStyle = ToolbarBorderStyle;
    ToolbarActionType = ToolbarActionType;
    previousTotalCount = '';

    get role() {
        return this.authUser.role;
    }
    get hasFiltersToRestore() {
        const oldSearchParams = this.storageService.filters;
        return oldSearchParams && oldSearchParams.lastUpdated <= new Date().getTime() - SearchParams.resetDuration;
    }
    get availabilityDaysTitle() {
        if (Object.keys(this.translations).length === 0) {
            return '';
        }

        const selectedDays = AvailabilityUtils.selectedDays(this.searchParams.availabilityObject);
        if (selectedDays.length === 0) {
            return this.translations['availability.anyDayOfWeek'];
        }
        if (selectedDays.length === 7) {
            return this.translations['availability.allDaysOfWeek'];
        }
        return selectedDays
            .map(day => {
                const translated = this.translations[`main.${day}`];
                return translated?.substring(0, translated.length > 2 ? 3 : translated.length);
            })
            .aggregatedDescription();
    }
    get lookingFor() {
        if (this.authUser.isParent) {
            if (this.countrySettings.showChildminders) {
                return 'main.lookingFor';
            } else {
                return 'main.lookingFor.babysitters.on';
            }
        } else {
            return 'main.lookingFor.babysittingJobs.on';
        }
    }
    get lookingOn() {
        const lookingOn = this.translations['looking.on'];
        if (lookingOn === '-') {
            return '';
        }
        return lookingOn;
    }
    get needsRoleSelector() {
        return this.authUser.isParent && this.countrySettings.showChildminders;
    }
    get numberOfSelectedAggeGroups() {
        return this.searchParams.ageGroupExperienceOptions.reduce((total, item) => (item.value ? total + 1 : total), 0);
    }
    get storedFiltersDate() {
        return this.storageService.filters?.lastUpdated
            ? formattedDate(this.storageService.filters?.lastUpdated, 'd MMMM yyyy', this.localeService.getLocaleCode())
            : undefined;
    }
    get hasFosterLocationSelected() {
        return this.searchParams?.fosterLocation?.receive || this.searchParams?.fosterLocation?.visit;
    }
    get searchResultsTranslationKey() {
        return `filters.showButton.${this.searchParams.role}${this.totalCount === 1 ? '' : 's'}` as const;
    }

    private translations: Record<string, string> = {};

    ngOnInit() {
        const translationsKeys = [
            ...AvailabilityUtils.weekDays.map(day => day.label),
            'availability.anyDayOfWeek',
            'availability.allDaysOfWeek',
            'looking.on',
        ];
        this.translateService.get(translationsKeys).subscribe(translations => {
            this.translations = translations;
        });

        this.form.control.valueChanges.pipe(takeUntil(this.destroyed$)).subscribe(_ => {
            if (this.form.control.dirty) {
                setTimeout(() => {
                    // needs to wait till searchParams actually changed
                    this.onFiltered.emit(this.searchParams);
                }, 0);
            }
        });

        this.onClosed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            if (this.visible) {
                this.trackActiveFilters();
            }
        });
        this.onClearFilters.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.trackActiveFilters();
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        setTimeout(() => {
            if (this.totalCount || this.totalCount === 0) {
                this.previousTotalCount = this.totalCount.toString();
            }
            this.cd.markForCheck();
        }, 0);

        if (changes.selectFilter) {
            setTimeout(() => this.onSelectFilterChange(), 0);
        }
    }

    toolbarActionSelected(action: ToolbarActionType) {
        if (action === ToolbarActionType.clear) {
            this.onClearFilters.emit();
            this.trackCtaEvent('select_filtermenu-select_clear', EventAction.filterMenu, true, false);
        }
    }

    toggleFilter(filter: FilterType, event: Event) {
        event.stopPropagation();

        this.openFilter = this.openFilter === filter ? undefined : filter;

        if (this.openFilter) {
            setTimeout(() => {
                // need to wait till fieldset resized appropriately
                const fieldset = (event.target as Node)?.parentElement?.children[1];
                if (fieldset) {
                    if (window.innerWidth - (event.target as HTMLElement).offsetLeft < (fieldset as HTMLElement).offsetWidth + 30) {
                        fieldset.classList.add('right-aligned');
                    } else {
                        fieldset.classList.remove('right-aligned');
                    }
                }
            }, 0);
        } else {
            this.trackActiveFilters();
        }
    }

    onSelectFilterChange() {
        let htmlElement: HTMLDivElement | undefined;
        if (this.selectFilter === FilterType.maxDistance) {
            htmlElement = this.distanceLayout?.nativeElement;
            this.distanceFilter?.nativeElement?.click();
        } else if (this.selectFilter === FilterType.ageGroups) {
            htmlElement = this.ageGroupsLayout?.nativeElement;
        } else if (this.selectFilter === FilterType.careType || this.selectFilter === FilterType.availability) {
            htmlElement = this.availabilityLayout?.nativeElement;
        } else if (this.selectFilter === FilterType.childrenMaxAge) {
            htmlElement = this.ageRangeLayout?.nativeElement;
        }

        htmlElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    onAvailabilityChanged(availability: UserAvailabilityInterface) {
        this.trackCtaEvent('select_filtermenu-select_availabilitymatrix', EventAction.filterMenu, true, false);
        this.searchParams.availabilityObject = availability;
        this.onFiltered.emit(this.searchParams);
    }

    onAdditionalAvailabilityChanged(event: Event) {
        this.onFiltered.emit(this.searchParams);

        const inputName = (event.target as HTMLInputElement).name;
        if (inputName === 'lookingForRegularCare') {
            this.trackCtaEvent('select_filtermenu-select_needregular', EventAction.filterMenu, true, false);
        } else if (inputName === 'lookingForOccasionalCare') {
            this.trackCtaEvent('select_filtermenu-select_needoccasional', EventAction.filterMenu, true, false);
        } else if (inputName === 'lookingForAfterSchool') {
            this.trackCtaEvent('select_filtermenu-select_needafterschool', EventAction.filterMenu, true, false);
        } else if (inputName === 'isAvailableRegularly') {
            this.trackCtaEvent('select_filtermenu-select_offerregular', EventAction.filterMenu, true, false);
        } else if (inputName === 'isAvailableOccasionally') {
            this.trackCtaEvent('select_filtermenu-select_offeroccasional', EventAction.filterMenu, true, false);
        } else if (inputName === 'isAvailableAfterSchool') {
            this.trackCtaEvent('select_filtermenu-select_offerafterschool', EventAction.filterMenu, true, false);
        }
    }

    onHourlyRateChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }
        this.trackCtaEvent(`select_filtermenu-select_hourlyrate_${target.value}`, EventAction.filterMenu, true, false);
    }

    onReferencesChange(event: Event) {
        const target = event.target as HTMLInputElement;
        this.trackCtaEvent(
            target.checked ? 'select_filtermenu-select_musthavereferences' : 'select_filtermenu-select_noreferences',
            EventAction.filterMenu,
            true,
            false,
        );
    }

    onAgeGroupExperienceChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }

        if (target.value === '0') {
            this.trackCtaEvent('select_filtermenu-select_hasexperiencebelow1', EventAction.filterMenu, true, false);
        } else if (target.value === '12plus') {
            this.trackCtaEvent('select_filtermenu-select_hasexperienceabove11', EventAction.filterMenu, true, false);
        } else {
            this.trackCtaEvent(`select_filtermenu-select_hasexperience${target.value}`, EventAction.filterMenu, true, false);
        }
    }

    onGenderChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }

        this.trackCtaEvent(`select_filtermenu-select_${target.value}`, EventAction.filterMenu, true, false);
    }

    onNativeLanguageChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.value) {
            return;
        }
        this.trackCtaEvent(`select_filtermenu-select_mothertongue_${target.value}`, EventAction.filterMenu, true, false);
    }

    onLanguageChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }
        this.trackCtaEvent(`select_filtermenu-select_languageskills_${target.value}`, EventAction.filterMenu, true, false);
    }

    onChoresChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }

        if (target.value === 'cooking') {
            this.trackCtaEvent('select_filtermenu-select_chorescooking', EventAction.filterMenu, true, false);
        } else if (target.value === 'driving') {
            this.trackCtaEvent('select_filtermenu-select_choresdrivechildren', EventAction.filterMenu, true, false);
        } else if (target.value === 'shopping') {
            this.trackCtaEvent('select_filtermenu-select_choresgroceries', EventAction.filterMenu, true, false);
        } else if (target.value === 'chores') {
            this.trackCtaEvent('select_filtermenu-select_choresminorhousehold', EventAction.filterMenu, true, false);
        }
    }

    onNonSmokersChange(event: Event) {
        const target = event.target as HTMLInputElement;
        if (!target.checked) {
            return;
        }

        this.trackCtaEvent('select_filtermenu-select_nonsmoking', EventAction.filterMenu, true, false);
    }

    onChildrenNumberChange(event: Event) {
        const target = event.target as HTMLSelectElement;
        if (!target.value) {
            return;
        }

        this.trackCtaEvent(`select_filtermenu-select_offernumberofchildren${target.value}`, EventAction.filterMenu, true, false);
    }

    clickInsideForm(element: Event) {
        if ((element?.target as Element)?.tagName === 'FORM') {
            if (this.openFilter) {
                this.trackActiveFilters();
            }
            this.openFilter = undefined;
        }
    }

    clickOutside(element: HTMLElement) {
        if (this.openFilter) {
            this.trackActiveFilters();
        }

        this.openFilter = undefined;

        if (element?.classList?.contains('search-filter-form') || element?.tagName === 'HEADER') {
            this.onClosed.emit();
        }
    }

    onLookingForClick() {
        this.userUpdatesService.prompts.next(Prompt.promptWithType(PromptType.firstRecommendation));
    }

    onCloseClick() {
        this.onClosed.emit();
        this.trackCtaEvent('select_filtermenu-select_close', EventAction.filterMenu, true, false);
    }

    onSortParamChanged() {
        if (this.searchParams.sort === SortType.distance) {
            this.trackCtaEvent('select_filtermenu-select_distance', EventAction.filterMenu, true, false);
        } else if (this.searchParams.sort === SortType.recentActivity) {
            this.trackCtaEvent('select_filtermenu-select_lastlogin', EventAction.filterMenu, true, false);
        } else if (this.searchParams.sort === SortType.created) {
            this.trackCtaEvent('select_filtermenu-select_signupdate', EventAction.filterMenu, true, false);
        } else if (this.searchParams.sort === SortType.relevance) {
            this.trackCtaEvent('select_filtermenu-select_mostrelevant', EventAction.filterMenu, true, false);
        }
    }

    onDistanceParamChanged() {
        this.trackCtaEvent(`select_filtermenu-select_maxdistance${this.searchParams.maxDistance}km`, EventAction.filterMenu, true, false);
    }

    onLastSeenOnlineParamChanged() {
        this.trackCtaEvent(`select_filtermenu-select_${this.searchParams.lastSeenOnline}`, EventAction.filterMenu, true, false);
    }

    onMoreFiltersClick() {
        this.openFilter = undefined;
        this.onShowFilters.emit();
    }

    trackActiveFilters() {
        const activeFilters = TrackingUtils.getActiveFiltersMap(this.searchParams, this.authUser);
        this.trackingService.trackFiltersApplied(activeFilters, this.searchParams.sort);
        this.trackingService.trackSearchResults(this.totalCount ?? 0);
    }
}

@Component({
    selector: 'search-filters-desktop',
    templateUrl: './search-filters.desktop.component.html',
    styleUrls: ['./search-filters.component.desktop.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        FormsModule,
        SharedModule,
        AvailabilityCalendarComponent,
        FormCheckboxComponent,
        SliderComponent,
        LowerCasePipe,
        TitleCasePipe,
        TranslateModule,
    ],
})
export class SearchFiltersComponentDesktop extends SearchFiltersComponent {}
