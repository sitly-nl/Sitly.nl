import { EnvironmentUtils } from 'app/utils/device-utils';
import { Component, OnInit, ViewChild, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { RecommendationsService } from 'app/modules/recommendations/services/recommendations.service';
import { ActivatedRoute } from '@angular/router';
import { switchMap, map, takeUntil } from 'rxjs/operators';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { NgForm, FormsModule } from '@angular/forms';
import { CopyUtils } from 'app/utils/copy-utils';
import { PromptEvents } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { ShareMethod } from 'app/models/api/country-settings-interface';
import { BaseComponent } from 'app/components/base.component';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { SharedModule } from 'modules/shared/shared.module';

export interface RecommendationMessageSuccessEvent {
    name: string;
    shareMethod: ShareMethod;
}

@Component({
    selector: 'recommendation-message',
    templateUrl: './recommendation-message.component.html',
    styleUrls: ['./recommendation-message.component.less'],
    standalone: true,
    imports: [FormsModule, SharedModule, TranslateModule],
})
export class RecommendationMessageComponent extends BaseComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    readonly translateService = inject(TranslateService);
    readonly recommendationService = inject(RecommendationsService);

    @Output() success = new EventEmitter<RecommendationMessageSuccessEvent>();

    @ViewChild('messageForm', { static: true }) messageForm: NgForm;
    @ViewChild('btnShare', { static: true }) btnShare: ElementRef;

    ShareMethod = ShareMethod;
    recommendationLink?: string;
    name: string;
    initMessage: string;

    get sendOptionsDialogData() {
        return {
            title: 'recommendations.sendVia',
            buttons: [],
            cancelable: true,
        };
    }

    get primarySharingMethod() {
        return this._sharingMethods?.[0];
    }

    get primarySharingMethodBtnClass() {
        return this.primarySharingMethod === ShareMethod.whatsapp ? 'btn-whatsapp' : 'hidden';
    }

    get sharingMethods() {
        return this._sharingMethods;
    }

    get isValid() {
        return this.initMessage.length > 0 && !!this.recommendationLink;
    }

    private ucFirst = new UcFirst();
    private _sharingMethods: ShareMethod[];

    ngOnInit() {
        this.route.paramMap
            .pipe(
                takeUntil(this.destroyed$),
                switchMap(params => {
                    this.name = params.get('name') ?? '';
                    return this.translateService.get(['recommendations.message'], {
                        firstName: this.ucFirst.transform(this.name),
                    });
                }),
                map(data => {
                    this.initMessage = data['recommendations.message'];
                    return this.countrySettings;
                }),
                switchMap(config => {
                    this._sharingMethods = config.sharingMethods ? [...config.sharingMethods] : [];
                    return this.recommendationService.fetchRecommendationLink(this.name);
                }),
            )
            .subscribe(response => {
                this.recommendationLink = response.links?.recommendationUrl;
                this.cd.detectChanges();
            });
    }

    composeMessage() {
        return `${this.initMessage}\n${this.recommendationLink}`;
    }

    share(method: ShareMethod) {
        if (method === ShareMethod.whatsapp) {
            this.sendOnWhatsapp();
        } else if (method === ShareMethod.facebook) {
            this.sendOnMessenger();
        } else if (method === ShareMethod.sms) {
            this.sendSms();
        } else if (method === ShareMethod.email) {
            this.goToEmail();
        } else if (method === ShareMethod.copy) {
            this.copyMessageToClipboard();
        }
    }

    sendTo(url: string, external = false) {
        if (!this.isValid) {
            // TODO show error message??
            return;
        }

        const encodedUrl = encodeURI(`${url}${this.composeMessage()}`);
        window.open(encodedUrl);

        if (external) {
            this.onMessageSent(ShareMethod.whatsapp);
        }
    }

    copyMessageToClipboard() {
        CopyUtils.copyToClipboard(this.composeMessage(), () => this.success.emit({ name: this.name, shareMethod: ShareMethod.copy }));
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstnameCopyMessage);
    }

    private onMessageSent(shareMethod: ShareMethod) {
        this.success.emit({ name: this.name, shareMethod });
        this.cd.detectChanges();
    }

    private sendOnWhatsapp() {
        this.sendTo('whatsapp://send?text=', true);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstnameWhatsapp);
    }

    private sendOnMessenger() {
        this.sendTo(`fb-messenger://share?app_id=${this.countrySettings.facebookAppId}&link=${this.recommendationLink}&message=`, true);
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstnameMessenger);
    }

    private sendSms() {
        if (EnvironmentUtils.isIos) {
            this.sendTo('sms:&body=', true);
        } else {
            this.sendTo('sms:?body=', true);
        }
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstnameSms);
    }

    private goToEmail() {
        if (this.recommendationLink) {
            this.navigationService.navigate(RouteType.recommendations, {
                screen: RecommendationScreen.email,
                name: this.name,
                link: this.recommendationLink,
                message: this.initMessage,
            });
        }
    }
}
