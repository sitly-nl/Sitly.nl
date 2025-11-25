import { Injectable, EventEmitter, inject } from '@angular/core';
import { ShareMethod } from 'app/models/api/country-settings-interface';
import { StorageService } from 'app/services/storage.service';

export enum AppEventType {
    recommendationMessageSent = 'recommendationMessageSent',
    paymentComplete = 'paymentComplete',
    reportPhoto = 'reportPhoto',
    initialOverlayClosed = 'initialOverlayClosed',
    checkPrompts = 'checkPrompts',
}

export type AppEvent =
    | {
          type: AppEventType.recommendationMessageSent;
          data: RecommendationSentNotification;
      }
    | {
          type: AppEventType.reportPhoto;
          data: { userId: string };
      }
    | {
          type: AppEventType.paymentComplete | AppEventType.initialOverlayClosed | AppEventType.checkPrompts;
      };

export interface RecommendationSentNotification {
    name: string;
    shareMethod: ShareMethod;
}

@Injectable({
    providedIn: 'root',
})
export class AppEventService {
    private storageService = inject(StorageService);

    events = new EventEmitter<AppEvent>();

    notifyRecommendationSent(data: RecommendationSentNotification) {
        this.events.emit({ type: AppEventType.recommendationMessageSent, data });
    }

    notifyPaymentComplete() {
        this.events.emit({ type: AppEventType.paymentComplete });
    }

    notifyReportPhoto(userId: string) {
        this.events.emit({ type: AppEventType.reportPhoto, data: { userId } });
    }

    notifyInitialOverlayClosed() {
        this.events.emit({ type: AppEventType.initialOverlayClosed });
    }

    sendPromptCheckEvent() {
        this.events.emit({ type: AppEventType.checkPrompts });
    }

    processPostRefreshEvents() {
        this.storageService.eventQueue.forEach(event => this.events.emit(event));
        this.storageService.eventQueue = [];
    }
}
