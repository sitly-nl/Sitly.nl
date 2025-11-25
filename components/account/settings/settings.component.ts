import { SettingsBaseComponent } from 'app/components/settings/settings-base.component';
import { inject, Component, ChangeDetectionStrategy, OnInit, OnDestroy } from '@angular/core';
import { RouteType } from 'routing/route-type';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { takeUntil } from 'rxjs/operators';
import { EventAction } from 'app/services/tracking/types';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import { SettingsOverlayService } from 'app/services/overlay/settings-overlay.service';
import { ToolbarItem } from 'modules/shared/components/toolbar/toolbar.component';
import { RouterLink } from '@angular/router';
import { FosterSettingsComponent } from 'app/components/settings/foster/foster-settings.component';
import { ParentSettingsComponent } from 'app/components/settings/parent/parent-settings.component';
import { ManagePremiumComponent } from 'app/components/premium/manage-premium/manage-premium.component';
import { PhotoEditorComponent } from 'modules/photo-editor/photo-editor.component';
import { PhotoEditorOldComponent } from 'app/components/settings/photo-editor-old/photo-editor-old.component';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'modules/shared/shared.module';
import { LowerCasePipe } from '@angular/common';

@Component({
    selector: 'settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        FormsModule,
        PhotoEditorOldComponent,
        PhotoEditorComponent,
        ManagePremiumComponent,
        ParentSettingsComponent,
        FosterSettingsComponent,
        RouterLink,
        LowerCasePipe,
        TranslateModule,
    ],
})
export class SettingsComponent extends SettingsBaseComponent implements OnInit, OnDestroy {
    readonly translateService = inject(TranslateService);
    readonly eventService = inject(AppEventService);
    readonly settingsOverlayService = inject(SettingsOverlayService);

    showSaved = false;

    EventAction = EventAction;
    ToolbarItem = ToolbarItem;

    get aboutValidationText() {
        if (!this.translations) {
            return '';
        }

        if ((this.authUser.about?.length ?? 0) < this.about.min) {
            return this.translations['settings.about.validation.short'].replace('{{characters}}', this.about.min.toString());
        } else {
            return this.translations['settings.about.validation.main'].replace('{{characters}}', (this.about.max - length).toString());
        }
    }
    get highlightAboutValidation() {
        return (this.authUser.about?.length ?? 0) < this.about.min || length >= this.about.max;
    }
    get showNewPhotoEditor() {
        return this.authUser.photoAsAvatar || !this.authUser.links.avatar;
    }

    private avatarCheckInterval: NodeJS.Timeout;
    private translations: Record<string, string>;

    ngOnInit() {
        this.translateService.get(['settings.about.validation.main', 'settings.about.validation.short']).subscribe(translations => {
            this.translations = translations;
        });

        this.refreshPage();
        this.cd.markForCheck();

        this.userService.refreshAuthUser().subscribe(() => this.refreshPage());
        this.eventService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
            if (event.type === AppEventType.paymentComplete) {
                this.cd.markForCheck();
            }
        });

        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => this.refreshPage());
        this.eventService.sendPromptCheckEvent();
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        clearInterval(this.avatarCheckInterval);
    }

    showPremium() {
        this.navigationService.showPremium();
    }

    notifySaved() {
        this.flashSaved();
    }

    resizeAboutTextarea() {
        const textarea = document.getElementById('aboutField') as HTMLTextAreaElement;
        if (textarea) {
            textarea.style.height = '';
            textarea.style.height = `${textarea.scrollHeight + 1}px`;
        }
    }

    changeAddress(event: Event) {
        if (event) {
            event.preventDefault();
        }
        this.navigationService.navigate(RouteType.addressChange);
    }

    onToolbarItemSelected(item: ToolbarItem) {
        switch (item) {
            case ToolbarItem.settings:
                this.trackCtaEvent('select_myprofile-select_accountattop', EventAction.myProfileMenu, true, false);
                this.navigationService.navigate(RouteType.account);
                break;
        }
    }

    showReactivatePremiumConfirmationDialog() {
        this.settingsOverlayService.showReactivatePremiumConfirmationOverlay(this.authUser);
    }

    showResumePremiumConfirmationDialog() {
        this.settingsOverlayService.showResumePremiumConfirmationOverlay();
    }

    openRecommendations() {
        this.navigationService.navigate(RouteType.recommendations);
    }

    openRecommendationsInfo() {
        this.navigationService.navigate(RouteType.recommendations, { screen: RecommendationScreen.info });
    }

    flashSaved() {
        setTimeout(() => {
            this.showSaved = true;
            this.cd.markForCheck();
            setTimeout(() => {
                this.showSaved = false;
                this.cd.markForCheck();
            }, 2000);
        }, 500);
    }

    // ---- Internal ---- //
    private refreshPage() {
        this.settings.populate(this.authUser, this.countrySettings);
        if (!this.isDesktop()) {
            this.resizeAboutTextarea();
        }
        this.cd.markForCheck();
        this.util.delay(() => {
            this.cd.markForCheck();
        }, 0);
    }
}
