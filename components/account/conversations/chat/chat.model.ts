import { StorageService } from 'app/services/storage.service';
import { Message, MessageAction, MessageType } from 'app/models/api/message';
import { MessageService, MessagesMeta } from 'app/services/api/message.service';
import { MessagesGroup } from 'app/models/messages-group';
import { User } from 'app/models/api/user';
import { ParsedResponse } from 'app/models/api/response';
import { CountrySettings } from 'app/models/api/country-settings-interface';
import { tap } from 'rxjs/operators';
import { computed, signal } from '@angular/core';
import { LocaleService } from 'app/services/locale.service';

const MIN_WORDS_COUNT = 17;
const UNICODE_WORD_CHARACTERS = new RegExp(/[\p{L}\p{N}\p{Pd}]+/gu);

export class ChatModel {
    messages: Message[] = [];
    parsedConversation: MessagesGroup[] = [];
    chatPartnerId: string;
    chatPartner: User;
    messageText = '';
    paymentChecked = false;
    canChat = false;
    canAskForRecommendations: boolean;
    askDisableSafetyMessages: boolean;
    safetyTips?: string;
    fairUsePolicyPromptExpanded = false;
    rateLimitExceeded = false;
    rateLimitWarning?: 'last_hour' | 'last_day' | 'last_week' | 'last_month';
    chatPartnerOnline: boolean;
    hadMinWordsError = false;
    sendingMessage = false;

    readonly showAutoReject = computed(() => {
        return this._showAutoReject() && !this.chatPartnerDisabled;
    });
    get reportSent() {
        return this.storageService.reportedFromChatUserIds.some(item => item === this.chatPartner.id);
    }
    get showReportInChat() {
        return this.countrySettings.countryCode === 'es';
    }
    get canInvite() {
        return this.chatPartner?.canBeInvitedToApply && this.user.isParent && this.user.isPremium;
    }

    get oldestMessageTime() {
        return this.messages[this.messages.length - 1]?.created;
    }

    get newestMessageTimeString() {
        return this.messages[0]?.created;
    }

    get newestMessageId() {
        return this.messages[0]?.id;
    }

    get isEmpty() {
        return this.messages.length === 0 || !this.messages.some(item => item.type === MessageType.regular);
    }

    get chatPartnerDisabled() {
        return !(this.chatPartner?.availableForChat ?? true);
    }

    get showChatInput() {
        return !this.rateLimitExceeded && !this.chatPartnerDisabled;
    }

    get showFairUsePolicyPrompt() {
        return this.user.isPremium && !this.chatPartnerDisabled && (this.rateLimitExceeded || this.rateLimitWarning);
    }

    get showMinWordCounter() {
        return this.messages.length === 0 && this.hadMinWordsError;
    }

    get wordsLeftNumber() {
        return Math.max(0, MIN_WORDS_COUNT - this.messageTextWordsCount);
    }

    get isMessageValid() {
        return (
            (this.messages.length === 0 && this.messageTextWordsCount >= MIN_WORDS_COUNT) ||
            (this.messages.length > 0 && this.messageText.length > 0)
        );
    }

    get recommendationsEnabled() {
        return this._recommendationsEnabled.asReadonly();
    }

    private get messageTextWordsCount() {
        return this.messageText.match(UNICODE_WORD_CHARACTERS)?.length ?? 0;
    }

    private _showAutoReject = signal(false);
    private readonly _recommendationsEnabled = signal(false);

    constructor(
        public user: User,
        private countrySettings: CountrySettings,
        private storageService: StorageService,
        private messageService: MessageService,
        private localeService: LocaleService,
    ) {}

    loadInitialData() {
        return this.messageService.getConversation(this.chatPartnerId).pipe(
            tap(response => {
                if (response) {
                    this.messages = [];
                    this.updateWithServerResponse(response);
                    if (!this.isEmpty) {
                        this.messageService.markAsRead(this.chatPartnerId, this.newestMessageId).subscribe();
                    }
                }
            }),
        );
    }

    reportedFromChat() {
        this.storageService.reportedFromChatUserIds = this.storageService.reportedFromChatUserIds.concat(this.chatPartner.id);
    }

    pushMessageIfNeeded(message: Message) {
        if (!this.messages.some(element => element.id === message.id)) {
            this.pushMessages([message], true);
        }
    }

    updateWithServerResponse(response: ParsedResponse<Message[], MessagesMeta>, pushToStart = false) {
        this.pushMessages(response.data, pushToStart);

        this.canAskForRecommendations = response.meta?.askForRecommendation ?? false;
        this.rateLimitExceeded = response.meta?.rateLimitExceeded ?? false;
        this.askDisableSafetyMessages = response.meta?.askDisableSafetyMessages ?? false;
        this.safetyTips = response.meta?.safetyTips;
        this.chatPartnerOnline = response.meta?.chatPartnerOnline ?? false;
        this.rateLimitWarning = response.meta?.rateLimitWarning;

        if (this.user.isPremium || !this.isEmpty) {
            this.canChat = true;
        }

        this._recommendationsEnabled.set(response.meta?.recommendationsEnabled ?? false);
    }

    private pushMessages(messages: Message[], pushToStart = false) {
        if (!messages || messages.length === 0) {
            return;
        }

        for (const msg of messages) {
            if (this.messages.some(element => element.id === msg.id)) {
                continue;
            }

            if (pushToStart) {
                this.messages.unshift(msg);
            } else {
                this.messages.push(msg);
            }
        }

        this.parsedConversation = MessagesGroup.messagesGroups(this.messages, this.localeService.getLocaleCode());
        this._showAutoReject.set(
            this.messages.length > 0 &&
                !this.messages.some(item => item.meta?.action === MessageAction.sent) &&
                this.messages[0].type !== MessageType.instantJob,
        );
    }
}
