import { Injectable, inject } from '@angular/core';
import { MessageInputCacheEntry, StorageService } from 'app/services/storage.service';
import { differenceInHours } from 'date-fns';

@Injectable({
    providedIn: 'root',
})
export class ChatCacheManager {
    private storageService = inject(StorageService);

    clearOutdatedInputCache() {
        const cache = this.storageService?.messageInputCache;
        if (!cache) {
            return;
        }
        const now = new Date();
        for (const userId of Object.keys(cache)) {
            if (differenceInHours(now, new Date(cache[userId].time)) >= 24) {
                delete cache[userId];
            }
        }
        this.storageService.messageInputCache = cache;
    }

    updateChatCache(text: string, chatPartnerId: string) {
        let cache = this.storageService.messageInputCache;
        if (text.length > 0) {
            if (!cache) {
                cache = {};
            }
            const cacheEntry = new MessageInputCacheEntry();
            cacheEntry.time = new Date();
            cacheEntry.text = text;
            cache[chatPartnerId] = cacheEntry;
        } else if (cache) {
            delete cache[chatPartnerId];
        }
        this.storageService.messageInputCache = cache;
    }
}
