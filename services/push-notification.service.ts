import { Injectable, inject } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { Unsubscribe, getMessaging, getToken, onMessage } from 'firebase/messaging';
import { UserService } from 'app/services/user.service';
import { NavigationService } from 'app/services/navigation.service';
import { Constants } from 'app/utils/constants';
import { RouteType } from 'routing/route-type';

type PushNotificationData =
    | { type: 'connection_invites.unviewed' }
    | { type: 'connection_invites.unused.daily' }
    | { type: 'connection_invites.unused.weekly' }
    | {
          type: 'message';
          senderId: string;
      }
    | { type: 'rating_reminder' };

@Injectable({
    providedIn: 'root',
})
export class PushNotificationService {
    private readonly userService = inject(UserService);
    private readonly navigationService = inject(NavigationService);

    private unsubscribe?: Unsubscribe;

    start() {
        initializeApp({
            apiKey: 'AIzaSyDFy_BLS6yDb3KL-71eiUoHsj78FaL6iSQ',
            projectId: 'sitly-app',
            messagingSenderId: '1069968530617',
            appId: '1:1069968530617:web:7682f9e8dc84e662670f68',
            measurementId: 'G-W32BNV9PK2',
        });

        this.requestPermission();
        this.listen();
    }

    stop() {
        this.unsubscribe?.();
    }

    private requestPermission() {
        getToken(getMessaging(), { vapidKey: 'BArKWQpuVRSnYNy3-BHJ00j7Wc_7Uj3oGGEVx5l6g77wjPpML3VHwUcWBSCJkEuPZPncosGCvXxiMqOXTFWZFgo' })
            .then(currentToken => {
                if (currentToken) {
                    this.userService.saveFCMToken(currentToken).subscribe();
                }
            })
            .catch(err => {
                console.log('An error occurred while retrieving token. ', err);
            });
    }

    private listen() {
        this.unsubscribe = onMessage(getMessaging(), payload => {
            const data = payload.data as PushNotificationData | undefined;
            switch (data?.type) {
                case 'connection_invites.unused.daily':
                case 'connection_invites.unused.weekly':
                    this.navigationService.navigate(RouteType.search);
                    break;
                case 'connection_invites.unviewed':
                    this.navigationService.navigate(RouteType.invites);
                    break;
                case 'message':
                    this.navigationService.openChat(true, data.senderId);
                    break;
                case 'rating_reminder':
                    // TODO: maybe we need some more advance logic here
                    window.open(Constants.googlePlayUrl, '_blank');
                    break;
                default:
                    console.log('unsupported notification');
                    break;
            }
        });
    }
}
