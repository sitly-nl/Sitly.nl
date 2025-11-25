import { Component, OnInit, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { takeUntil } from 'rxjs/operators';
import { User } from 'app/models/api/user';
import { interval } from 'rxjs';
import { InstantJobTimerPipe } from 'app/pipes/instant-job.timer.pipe';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'app/services/api/message.service';
import { RouteType } from 'routing/route-type';
import { SharedModule } from 'modules/shared/shared.module';
import { LowerCasePipe, DecimalPipe } from '@angular/common';

@Component({
    selector: 'instant-job-details',
    templateUrl: './instant-job-details.component.html',
    styleUrls: ['./instant-job-details.component.less'],
    standalone: true,
    imports: [RouterLink, SharedModule, LowerCasePipe, DecimalPipe, TranslateModule],
})
export class InstantJobDetailsComponent extends BaseComponent implements OnInit {
    readonly translateService = inject(TranslateService);
    readonly eventService = inject(AppEventService);
    readonly route = inject(ActivatedRoute);
    readonly messageService = inject(MessageService);

    parent?: User;

    get childrenAmountKey() {
        return (this.parent?.children?.length ?? 0) > 1 ? 'instant-job.manyChildren' : 'instant-job.oneChild';
    }

    get isDayOld() {
        return !this.timeSinceCreated || this.timeSinceCreated > InstantJobTimerPipe.day;
    }

    get careTypeStr() {
        if (!this.translations || !this.parent) {
            return null;
        }
        const careTypes: string[] = [];
        if (this.parent.hasRegularCare || this.parent.isAvailableOccasionally || this.parent.isAvailableAfterSchool) {
            if (this.parent.isAvailableAfterSchool) {
                careTypes.push(this.translations['careType.afterSchool']);
            }
            if (this.parent.isAvailableOccasionally) {
                careTypes.push(this.translations['careType.occasional']);
            }
            if (this.parent.hasRegularCare) {
                careTypes.push(this.translations['careType.regular']);
            }

            return this.translations['instant-job.lookingForChildcare']
                .replace('{{careTypes}}', careTypes.aggregatedDescription())
                .toLowerCase();
        } else {
            return this.translations['user-item.lookingForChildcareOn'];
        }
    }

    get availabilityDays() {
        if (!this.translations || !this.parent) {
            return null;
        }
        const selectedDays = AvailabilityUtils.selectedDays(this.parent.availability);
        if (selectedDays.length === 7) {
            return this.translations['main.everyDayOfWeek'];
        }
        return selectedDays.map(item => this.translations[`main.${item}`]).aggregatedDescription();
    }

    get timeUntilDayOld() {
        return Math.max(0, InstantJobTimerPipe.day - (this.timeSinceCreated ?? 0));
    }

    get emptyCalendar() {
        if (!this.parent) {
            return true;
        }
        const selectedDays = AvailabilityUtils.selectedDays(this.parent.availability);
        return !selectedDays || selectedDays.length === 0;
    }

    private timeSinceCreated?: number;
    private translations: Record<string, string>;

    ngOnInit() {
        this.translateService
            .get([
                'instant-job.lookingForChildcare',
                'careType.afterSchool',
                'careType.occasional',
                'careType.regular',
                'user-item.lookingForChildcareOn',
                'main.monday',
                'main.tuesday',
                'main.wednesday',
                'main.thursday',
                'main.friday',
                'main.saturday',
                'main.sunday',
                'main.everyDayOfWeek',
            ])
            .subscribe(translations => {
                this.translations = translations;
                this.cd.markForCheck();
            });

        interval(1000)
            .pipe(takeUntil(this.destroyed$))
            .subscribe((_: unknown) => {
                if (this.parent) {
                    this.timeSinceCreated = this.parent ? new Date().getTime() - new Date(this.parent.created).getTime() : undefined;
                }
                this.cd.markForCheck();
            });

        this.eventService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event.type === AppEventType.paymentComplete) {
                this.navigationService.back(true);
                setTimeout(() => this.openChat(), 0);
            }

            this.cd.markForCheck();
        });

        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            const parentId = params.get('parentId');
            if (parentId) {
                this.messageService.getConversation(parentId).subscribe(response => {
                    if (response.data.length > 1) {
                        // if we have some other messages except instant job
                        this.navigationService.navigate(RouteType.messages, parentId);
                    }
                });

                this.userService.getUser(parentId, true).subscribe(response => {
                    this.parent = response.data;
                    this.cd.detectChanges();

                    const messageId = params.get('lastMessageId');
                    if (messageId) {
                        this.markChatAsRead(messageId);
                    }
                });
            }
        });
    }

    openChat() {
        if (this.authUser.isPremium) {
            this.navigationService.navigate(RouteType.messages, this.parent?.id);
        } else {
            this.navigationService.showPremium();
        }
    }

    onBackClicked() {
        this.navigationService.back();
    }

    private markChatAsRead(lastMessageId: string) {
        if (this.parent) {
            this.messageService.markAsRead(this.parent.id, lastMessageId).subscribe();
        }
    }
}
