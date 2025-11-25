import { User } from 'app/models/api/user';
import { ProfileShareType } from 'app/components/user/profile/profile-share-type';
import { TranslateService } from '@ngx-translate/core';
import { EventAction } from 'app/services/tracking/types';
import { Injectable, inject } from '@angular/core';
import { TrackingService } from 'app/services/tracking/tracking.service';
import { CountrySettingsService } from 'app/services/country-settings.service';
import { CopyUtils } from 'app/utils/copy-utils';

@Injectable({
    providedIn: 'root',
})
export class ShareProfileService {
    private trackingService = inject(TrackingService);
    private translateService = inject(TranslateService);
    private countrySettingsService = inject(CountrySettingsService);

    async share(type: ProfileShareType, user: User, onFinish: () => void) {
        const publicProfileLink = user.links.publicProfile;
        const countrySettings = this.countrySettingsService.countrySettings;
        if (!publicProfileLink || !countrySettings) {
            return;
        }

        let shareProfileMessage: string;
        const mainTranslationKey = `profile.share.message.${user.isParent ? 'parent' : 'foster'}`;
        if (user.isParent) {
            const translationsKeys = [
                mainTranslationKey,
                'settings.child',
                'settings.children',
                'main.babysitter',
                'main.childminder',
                'profile.share.or',
            ];
            const translations = await this.translateService.get(translationsKeys).toPromise();
            const childrenCount =
                user.children.length > 1
                    ? `${user.children.length} ${translations['settings.children']}`
                    : `1 ${translations['settings.child']}`;
            const lookingFor = [
                user.searchPreferences.babysitters ? translations['main.babysitter'] : null,
                user.searchPreferences.childminders ? translations['main.childminder'] : null,
            ]
                .filter(item => item)
                .join(` ${translations['profile.share.or']} `);

            shareProfileMessage = this.translateService.getParsedResult(translations, mainTranslationKey, {
                firstName: user.firstName,
                childrenCount,
                lookingFor,
                place: user.placeName,
                publicProfileLink,
            });
        } else {
            const translationsKeys = [mainTranslationKey, 'main.babysitter', 'main.childminder'];
            const translations = await this.translateService.get(translationsKeys).toPromise();
            shareProfileMessage = this.translateService.getParsedResult(translations, mainTranslationKey, {
                firstName: user.firstName,
                role: user.isBabysitter ? translations['main.babysitter'] : translations['main.childminder'],
                place: user.placeName,
                age: user.age,
                publicProfileLink: user.links?.publicProfile,
            });
        }

        if (shareProfileMessage.length === 0) {
            return;
        }

        switch (type) {
            case ProfileShareType.copy: {
                this.trackingService.trackCtaEvent('profile-page-select_share_profile-select_copylink', EventAction.shareProfile);
                CopyUtils.copyToClipboard(shareProfileMessage, () => {
                    setTimeout(() => onFinish(), 200);
                });
                break;
            }
            case ProfileShareType.facebook: {
                const url = `https://www.facebook.com/dialog/send?
                    app_id=${countrySettings.facebookAppId}&
                    link=${user.links?.publicProfile}&
                    redirect_uri=${window.location.href}`;
                window.open(url, '_blank');
                break;
            }
            case ProfileShareType.whatsapp: {
                this.trackingService.trackCtaEvent('profile-page-select_share_profile-select_whatsapp', EventAction.shareProfile);
                const whatsappUrl = `whatsapp://send?text=${user.links?.publicProfile}`;
                window.location.assign(whatsappUrl);
                break;
            }
            case ProfileShareType.email: {
                this.trackingService.trackCtaEvent('profile-page-select_share_profile-select_email', EventAction.shareProfile);
                window.location.assign(`mailto:?body=${shareProfileMessage}`);
                break;
            }
            case ProfileShareType.messenger: {
                this.trackingService.trackCtaEvent('profile-page-select_share_profile-select_messenger', EventAction.shareProfile);
                const messengerUrl = `fb-messenger://share?app_id=${countrySettings.facebookAppId}&link=${user.links?.publicProfile}&message=`;
                window.location.assign(messengerUrl);
                break;
            }
        }

        if (type !== ProfileShareType.copy) {
            onFinish();
        }
    }
}
