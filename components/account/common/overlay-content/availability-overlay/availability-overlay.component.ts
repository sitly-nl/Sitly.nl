import { Component, OnInit, inject } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { UserAvailabilityInterface } from 'app/models/api/user';
import { SessionService } from 'app/services/session.service';
import { EventAction, EventCategory, PromptEvents } from 'app/services/tracking/types';
import { AvailabilityUtils } from 'app/utils/availability-utils';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

export interface CareTypeOption {
    type: 'regular' | 'occasional' | 'afterSchool';
    title: string;
    selected: boolean;
}

@Component({
    selector: 'availability-overlay',
    templateUrl: './availability-overlay.component.html',
    styleUrls: ['./availability-overlay.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class AvailabilityOverlayComponent extends BaseOverlayComponent implements OnInit {
    sessionService = inject(SessionService);

    careTypeOptions: CareTypeOption[] = [
        { type: 'regular', title: 'availabilityOverlay.careType.regular', selected: !!this.authUser?.hasRegularCare },
        { type: 'occasional', title: 'availabilityOverlay.careType.occasional', selected: !!this.authUser?.isAvailableOccasionally },
        { type: 'afterSchool', title: 'availabilityOverlay.careType.afterSchool', selected: !!this.authUser?.isAvailableAfterSchool },
    ];

    type: 'availabilityReminder' | 'noAvailabilityReminder';

    private availability = this.authUser?.availability;
    private modified = false;
    private availabilityChangeTracked = false;

    ngOnInit() {
        this.data.set({
            title: this.authUser?.isParent ? 'availabilityOverlay.title.parent' : 'availabilityOverlay.title.sitter',
            bgColor: 'neutral',
            stickyBtn: {
                title: 'availabilityOverlay.cta.scheduleConfirmed',
                action: () => this.saveAvailability(),
            },
            fullScreen: true,
            doOnClose: () => this.trackClose(),
        });

        this.trackingService.trackEvent(
            EventCategory.prompts,
            EventAction.open,
            this.authUser?.isAvailable ? PromptEvents.availabilityReminderPrompt : PromptEvents.noAvailabilityConfirmationPrompt,
        );
    }

    onScheduleChange(availability: UserAvailabilityInterface) {
        this.availability = availability;
        this.modified = true;
        this.trackAvailabilityChange();
    }

    onCareTypeClick(option: CareTypeOption) {
        option.selected = !option.selected;
        this.modified = true;
        this.trackAvailabilityChange();
    }

    private trackAvailabilityChange() {
        if (!this.availabilityChangeTracked) {
            this.availabilityChangeTracked = true;
            this.trackingService.trackCtaClick(
                this.type === 'availabilityReminder'
                    ? PromptEvents.availabilityReminderAvailabilitySelection
                    : PromptEvents.noAvailabilityConfirmationAvailabilitySelection,
            );
        }
    }

    private saveAvailability() {
        if (!this.availability) {
            return;
        }

        this.trackingService.trackCtaClick('availability_reminder_availability_selection_save');

        const data = {
            availability: this.availability,
            availabilityAfterSchool: this.careTypeOptions.find(item => item.type === 'afterSchool')?.selected,
            availabilityOccasional: this.careTypeOptions.find(item => item.type === 'occasional')?.selected,
            hasRegularCare: this.careTypeOptions.find(item => item.type === 'regular')?.selected,
        };

        const isAvailable =
            !AvailabilityUtils.isEmpty(data.availability) ||
            data.availabilityOccasional ||
            data.availabilityAfterSchool ||
            data.hasRegularCare;

        this.userService.saveUserAvailability(data).subscribe(_ => {
            if (this.authUser?.isParent || isAvailable) {
                this.showAvailabilitySavedOverlay();
            } else {
                this.showAccountHiddenOverlay();
            }
        });
    }

    private showAvailabilitySavedOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            img: { name: 'confetti', type: 'svg' },
            title: this.authUser?.isParent ? 'availabilityConfirmedOverlay.title.parent' : 'availabilityConfirmedOverlay.title.sitter',
            message: 'availabilityConfirmedOverlay.message',
            primaryBtn: { title: 'main.done' },
        });
    }

    private showAccountHiddenOverlay() {
        this.overlayService.openOverlay(
            StandardOverlayComponent,
            {
                title: 'userHiddenOverlay.title',
                message: 'userHiddenOverlay.message',
                primaryBtn: { title: 'main.close' },
            },
            () => this.sessionService.signOut(),
        );
    }

    private trackClose() {
        if (!this.modified) {
            this.trackingService.trackCtaEvent('availability_reminder_no_availability_selection_close', EventAction.click);
        } else {
            this.trackingService.trackCtaEvent('availability_reminder_availability_selection_close', EventAction.click);
        }
    }
}
