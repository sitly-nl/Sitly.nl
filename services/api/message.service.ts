import { ApiService, ParamsMap } from 'app/services/api/api.service';
import { Injectable, inject } from '@angular/core';
import { EMPTY } from 'rxjs';
import { ResponseParser } from 'app/parsers/response-parser';
import { Conversation } from 'app/models/api/conversation';
import { Message } from 'app/models/api/message';
import { catchError, map } from 'rxjs/operators';

export interface ResponseRate {
    unansweredCount: number;
    receivedCount: number;
}
interface ConversationMeta {
    responseRate?: ResponseRate;
    noRepliesReceived: boolean;
}

export interface MessagesMeta {
    askForRecommendation?: boolean;
    recommendationsEnabled?: boolean;
    rateLimitExceeded?: boolean;
    rateLimitWarning?: 'last_hour' | 'last_day' | 'last_week' | 'last_month';
    askDisableSafetyMessages?: boolean;
    chatPartnerOnline: boolean;
    safetyTips?: string;
}

@Injectable({
    providedIn: 'root',
})
export class MessageService {
    private apiService = inject(ApiService);

    getConversations() {
        return this.apiService
            .get('/conversations', { params: { include: 'chat-partner' } })
            .pipe(map(response => ResponseParser.parseObject<Conversation[], ConversationMeta>(response)))
            .pipe(catchError(_ => EMPTY));
    }

    getConversation(userId: string, timeBefore?: string) {
        return this.getMessages(userId, {
            filter: timeBefore ? { 'created-before': timeBefore } : {},
            page: {
                size: 20,
                number: 1,
            },
        });
    }

    getConversationAfter(userId: string, timeSince: string) {
        return this.getMessages(
            userId,
            timeSince
                ? {
                      filter: {
                          'created-after': timeSince,
                      },
                  }
                : {},
        );
    }

    removeConversation(userId: string) {
        return this.apiService.delete('/conversations/' + userId);
    }

    markAsRead(userId: string, lastReadMessageId: string) {
        return this.apiService.post(`/conversations/${userId}/messages`, {
            body: {
                lastReadMessageId,
            },
        });
    }

    send(userId: string, content: string) {
        return this.apiService
            .post(`/conversations/${userId}/messages`, { body: { content } })
            .pipe(map(response => ResponseParser.parseObject<Message>(response)));
    }

    autoReject(userIds: string[]) {
        return this.apiService
            .post('/conversations/autorejection', { body: { userIds } })
            .pipe(map(response => ResponseParser.parseObject<Message[]>(response)));
    }

    getNonResponseVictimHtml() {
        return this.apiService.get<string>('/users/me/non-response-victim-html', { responseType: 'text' });
    }

    private getMessages(userId: string, params: ParamsMap) {
        return this.apiService
            .get('/conversations/' + userId + '/messages/', { params })
            .pipe(map(response => ResponseParser.parseObject<Message[], MessagesMeta>(response)));
    }
}
