import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild,
    computed,
    inject,
    input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { BaseComponent } from 'app/components/base.component';
import { Gender, User } from 'app/models/api/user';
import { RouteType } from 'routing/route-type';
import { FavoriteService } from 'app/services/api/favorite.service';
import { FeatureService } from 'app/services/feature.service';
import { EventAction } from 'app/services/tracking/types';
import { Util } from 'app/utils/utils';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { NgClass } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';
import { AvailabilityDaysComponent } from 'app/components/user/availability-days/availability-days.component';

@Component({
    selector: '[user-card]',
    templateUrl: './user-card.component.html',
    styleUrl: './user-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, NgClass, AvailabilityDaysComponent, TranslateModule],
})
export class UserCardComponent extends BaseComponent {
    user = input.required<User>();
    @Input() isFavorite: boolean;
    @Input() size: 'normal' | 'compact' = 'normal';
    @Input() hiddenFunctionality: 'none' | 'hide' | 'unhide' = 'none';
    @Input() showUnViewedIndicator = false;
    @Input() searchPosition?: number;
    @Input() rounded = false;
    @Input() showCalendar = true;

    @Output() onProfileOpen = new EventEmitter();
    @Output() onFavoriteChange = new EventEmitter();
    @Output() hide = new EventEmitter();
    @Output() unhide = new EventEmitter();

    @ViewChild('userCardContainer') scrollContainer: ElementRef<HTMLDivElement>;

    get showPremium() {
        return this.user().isPremium && this.featureService.showPremiumLabel;
    }
    mediumLines = computed(() => {
        const translations = this.translations();
        if (translations) {
            if (this.user().isParent) {
                return [
                    translations['main.distanceFromYou'].replace('{{distance}}', `${this.user().distance} km`),
                    this.childrenLine(),
                    translations['user-items.needs'].replace('{{roles}}', this.lookingForRoles() ?? ''),
                ];
            } else {
                return [
                    translations['profile.yearsOld'].replace('{{years}}', this.user().age.toString()),
                    translations['main.distanceFromYou'].replace('{{distance}}', `${this.user().distance} km`),
                    this.user().fosterProperties?.yearsOfExperience
                        ? translations['user-item.yearsOfExperience'].replace(
                              '{{years}}',
                              translations[`settings.yearsExperience${this.user().fosterProperties?.yearsOfExperience}`],
                          )
                        : translations['user-item.noExperience'],
                ];
            }
        }
        return [];
    });
    bottomLine = computed(() => this.ucFirst.transform(this.availabilitySummary()));

    private readonly router = inject(Router);
    private readonly translateService = inject(TranslateService);
    private readonly featureService = inject(FeatureService);
    private readonly favoriteService = inject(FavoriteService);
    private readonly ucFirst = inject(UcFirst);

    private translations = toSignal(
        this.translateService.get([
            'user-item.availability.format',
            'user-item.lookingFor.format',
            'user-item.careOn',
            'careType.afterSchool',
            'careType.occasional',
            'careType.regular',
            'user-item.availabeOn',
            'user-item.lookingForChildcareOn',
            'profile.yearsOld',
            'main.distanceFromYou',
            'settings.yearsExperience0',
            'settings.yearsExperience1',
            'settings.yearsExperience2',
            'settings.yearsExperience3',
            'settings.yearsExperience4',
            'settings.yearsExperience5',
            'settings.yearsExperience5plus',
            'user-item.yearsOfExperience',
            'user-item.noExperience',
            'profile.babysitter',
            'profile.childminder',
            'user-items.needs',
            'user-item.needsOccasionalCare',
            'user-item.needsOccasionalAndAfterSchoolCare',
            'user-item.needsAfterSchoolCare',
            'similar-user.needsCare',
            'similar-user.offersCare',
            // --- for children line ---
            'main.boy',
            'main.girl',
            'main.boys',
            'main.girls',
            'main.and',
            'profile.yearsOld',
            'profile.oneYearOld',
            'user-item.expectingBaby',
            'user-item.andExpectingBaby',
            //
        ]),
    );
    private childrenLine = computed(() => {
        const translations = this.translations();
        if ((this.user().children?.length ?? 0) > 0 && translations) {
            const hasExpectingBaby = this.user().children.some(child => child.isExpecting);
            const children = this.user().children.filter(child => (child.age ?? -1) >= 0 && !child.isExpecting);

            if (hasExpectingBaby && children.length === 0) {
                return translations['user-item.expectingBaby'];
            }

            let boysCount = 0;
            let girlsCount = 0;
            children.forEach(child => {
                if (child.gender === Gender.female) {
                    girlsCount++;
                } else {
                    boysCount++;
                }
            });
            const ages = children.map(child => child.age).sort((a, b) => a - b);

            const texts: string[] = [];
            if (boysCount > 0) {
                const boysLabel = boysCount > 1 ? translations['main.boys'] : translations['main.boy'];
                texts.push(`${boysCount} ${boysLabel.toLowerCase()}`);
            }
            if (girlsCount > 0) {
                const girlsLabel = girlsCount > 1 ? translations['main.girls'] : translations['main.girl'];
                texts.push(`${girlsCount} ${girlsLabel.toLowerCase()}`);
            }
            const genderText = texts.join(', ');
            const age = ages.aggregatedDescription(` ${translations['main.and']} `);
            const separator = ': ';

            const ageText = translations[ages.every(item => item <= 1) ? 'profile.oneYearOld' : 'profile.yearsOld']
                .toLowerCase()
                .replace('{{years}}', age);
            return `${genderText}${separator}${ageText}${hasExpectingBaby ? translations['user-item.andExpectingBaby'] : ''}`;
        }
        return '';
    });
    private availabilitySummary = computed(() => {
        const translations = this.translations();
        if (this.user().isAvailable && translations) {
            if (!this.user().showAvailabilityDays) {
                if (this.user().isAvailableOccasionally && this.user().isAvailableAfterSchool) {
                    return translations['user-item.needsOccasionalAndAfterSchoolCare'];
                } else if (this.user().isAvailableOccasionally) {
                    return translations['user-item.needsOccasionalCare'];
                } else {
                    return translations['user-item.needsAfterSchoolCare'];
                }
            }

            const hasAdditionalAvailability =
                this.user().hasRegularCare || this.user().isAvailableOccasionally || this.user().isAvailableAfterSchool;
            if (!this.showCalendar || hasAdditionalAvailability) {
                const careTypes: string[] = [];
                if (this.user().isAvailableAfterSchool) {
                    careTypes.push(translations['careType.afterSchool']);
                }
                if (this.user().isAvailableOccasionally) {
                    careTypes.push(translations['careType.occasional']);
                }
                if (this.user().hasRegularCare) {
                    careTypes.push(translations['careType.regular']);
                }

                return translations[
                    this.showCalendar ? 'user-item.careOn' : this.user().isParent ? 'similar-user.needsCare' : 'similar-user.offersCare'
                ].replace('{{careTypes}}', careTypes.aggregatedDescription());
            } else {
                return translations[this.user().isParent ? 'user-item.lookingForChildcareOn' : 'user-item.availabeOn'] + ':';
            }
        }
        return '';
    });
    private lookingForRoles = computed(() => {
        return [
            ...(this.user().searchPreferences.babysitters ? [this.translations()?.['profile.babysitter']] : []),
            ...(this.user().searchPreferences.childminders ? [this.translations()?.['profile.childminder']] : []),
        ].aggregatedDescription();
    });
    private updatingFavorites = false;

    openProfile() {
        this.onProfileOpen.emit();
        this.navigationService.navigateByUrl(`${RouteType.users}/${this.user().id}`);
    }

    toggleFavorite(event: Event) {
        event.stopPropagation();
        event.preventDefault();

        if (this.updatingFavorites) {
            return;
        }
        this.updatingFavorites = true;

        this.trackingService.trackUserFavorite(
            this.user(),
            this.isFavorite,
            this.searchPosition && Number.isInteger(this.searchPosition) ? this.searchPosition + 1 : -1,
        );

        this.isFavorite = !this.isFavorite;
        this.favoriteService.toggleFavorites(this.user()).then(user => {
            this.isFavorite = user.isFavorite;
            this.updatingFavorites = false;
            this.onFavoriteChange.emit(user);
        });

        const routeName = this.getRouteName();
        if (!this.isFavorite) {
            if (routeName === 'photo-search') {
                this.trackCtaEvent('searchlist-view-add_favorite', EventAction.addToFavorite);
            } else if (routeName === 'map-search') {
                this.trackCtaEvent('map-view-add_favorite', EventAction.addToFavorite);
            }
        } else {
            if (routeName === 'photo-search') {
                this.trackCtaEvent('searchlist-view-remove_favorite', EventAction.addToFavorite);
            } else if (routeName === 'map-search') {
                this.trackCtaEvent('map-view-remove_favorite', EventAction.addToFavorite);
            }
        }
    }

    hideClicked(event: Event) {
        event.stopPropagation();
        event.preventDefault();
        this.hide.emit();
        this.trackingService.trackUserHide(
            this.user(),
            true,
            this.searchPosition && Number.isInteger(this.searchPosition) ? this.searchPosition + 1 : -1,
        );
    }

    unhideClicked(event: Event) {
        event.stopPropagation();
        event.preventDefault();
        this.unhide.emit();
    }

    runScrollDemo() {
        // scroll to display Hide button
        this.scrollContainer.nativeElement.scrollTo({ left: this.scrollContainer.nativeElement.scrollWidth, behavior: 'smooth' });

        // scroll back after delay
        setTimeout(() => this.scrollContainer.nativeElement.scrollTo({ left: 0, behavior: 'smooth' }), 1300);
    }

    private getRouteName() {
        const routeNameMap = {
            '/search/photo': 'photo-search',
            '/search/map': 'map-search',
            '/search/photo-and-map': 'photo-and-map-search',
            '/favorites': 'favorites',
        };

        const routeNameKey = Util.keysOf(routeNameMap).find(url => this.router.url.startsWith(url));
        return routeNameKey ? routeNameMap[routeNameKey] : 'unknown';
    }
}
