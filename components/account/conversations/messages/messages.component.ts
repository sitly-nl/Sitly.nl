import { isAfter, subMinutes } from 'date-fns';
import { BaseComponent } from 'app/components/base.component';
import { Component, ChangeDetectionStrategy, OnInit, Output, EventEmitter, inject, signal, computed } from '@angular/core';
import { MessageService, ResponseRate } from 'app/services/api/message.service';
import { Conversation } from 'app/models/api/conversation';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { takeUntil } from 'rxjs/operators';
import { interval } from 'rxjs';
import { MessageType, MessageAction } from 'app/models/api/message';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { InstantJobTimerPipe } from 'app/pipes/instant-job.timer.pipe';
import { EventAction } from 'app/services/tracking/types';
import { AppEventService } from 'app/services/event.service';
import { RouteType } from 'routing/route-type';
import { NonResponseOverlayComponent } from 'app/components/conversations/messages/non-response-overlay/non-response-overlay.component';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { PremiumSwiperComponent } from 'app/components/premium-swiper/premium-swiper.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    standalone: true,
    selector: 'messages',
    templateUrl: 'messages.component.html',
    styleUrls: ['./messages.component.less'],
    imports: [PremiumSwiperComponent, SharedModule, RouterModule, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesComponent extends BaseComponent implements OnInit {
    readonly route = inject(ActivatedRoute);
    readonly messageService = inject(MessageService);
    readonly userUpdatesService = inject(UserUpdatesService);
    readonly eventService = inject(AppEventService);

    @Output() loaded = new EventEmitter();

    readonly conversations = signal<Conversation[]>([]);
    readonly hasConversations = computed(() => this.conversations().length > 0);
    readonly conversationsLoaded = signal(false);

    MessageType = MessageType;
    MessageAction = MessageAction;
    instantJobTimers: Record<string, number> = {};
    editingMode = false;
    showNonResponseVictimButton = false;
    responseRate?: ResponseRate;
    readonly unreadMessagesCount = this.userUpdatesService.messagesCount;

    get showResponseRateBar() {
        if (this.responseRate) {
            if (this.responseRate.unansweredCount > 0) {
                return true;
            } else {
                return (
                    this.storageService.fullResponserRateAchievedAt &&
                    isAfter(new Date(this.storageService.fullResponserRateAchievedAt), subMinutes(new Date(), 20))
                );
            }
        }
        return false;
    }

    private previousHash: string;

    ngOnInit() {
        this.populate();
        interval(10_000)
            .pipe(takeUntil(this.destroyed$))
            .subscribe(_ => {
                this.populate();
                this.updateInstantJobTimers();
            });

        this.eventService.sendPromptCheckEvent();
        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => this.cd.markForCheck());
    }

    populate() {
        this.messageService.getConversations().subscribe(result => {
            if (this.isDesktop() && !(this.route.snapshot.params.userId || this.route.snapshot.params.parentId)) {
                if (result.data.length > 0) {
                    this.onConversationClicked(result.data[0]);
                }
            }

            this.showNonResponseVictimButton = result.meta.noRepliesReceived;

            if ((result.meta?.responseRate?.unansweredCount ?? 0) > 0) {
                this.storageService.fullResponserRateAchievedAt = undefined;
            } else if ((this.responseRate?.unansweredCount ?? 0) > 0 && result.meta?.responseRate?.unansweredCount === 0) {
                this.storageService.fullResponserRateAchievedAt = new Date();
            }
            this.responseRate = result.meta?.responseRate;

            const hash = JSON.stringify(result.data);
            if (this.previousHash !== hash) {
                this.previousHash = hash;
                this.conversations.set(result.data);
                this.updateInstantJobTimers();
                this.cd.markForCheck();
            }
            this.conversationsLoaded.set(true);
            this.loaded.emit(this.conversations().length);
        });
    }

    toggleEditingMode() {
        this.editingMode = !this.editingMode;
        if (this.editingMode) {
            this.trackCtaEvent('select_messages-select_edit', EventAction.messagesMenu, true, false);
        }
    }

    showNonResponseVictimOverlay() {
        this.overlayService.openOverlay(NonResponseOverlayComponent);
    }

    showSubscriptionsOverlay() {
        this.navigationService.showPremium();
    }

    onConversationClicked(conversation: Conversation) {
        if (conversation?.lastMessage?.type === MessageType.instantJob) {
            this.navigationService.navigate(RouteType.instantJob, [conversation.id, conversation.lastMessage.id], {
                queryParams: this.route.snapshot.queryParams,
            });
        } else {
            this.trackCtaEvent('select_messages-open_message', EventAction.messagesMenu, true, false);
            conversation.unreadMessagesCount = 0;
            this.navigationService.navigate(RouteType.messages, conversation.id, { queryParams: this.route.snapshot.queryParams });
        }
    }

    showRemoveConversationOverlay(event: Event, conversation: Conversation) {
        event.preventDefault();
        event.stopImmediatePropagation();

        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'deleteChatOverlay.title',
            message: 'deleteChatOverlay.message',
            dangerBtn: { title: 'main.delete', action: () => this.removeConversation(conversation) },
            secondaryBtn: { title: 'main.close' },
        });
    }

    private removeConversation(conversation: Conversation) {
        conversation.removingStart = true;
        setTimeout(() => {
            conversation.removing = true;
        }, 20);
        this.messageService.removeConversation(conversation.id).subscribe(_ => {
            const index = this.conversations().findIndex(item => item.id === conversation.id);
            if (index >= 0) {
                this.conversations.update(items => items.splice(index, 1));
            }

            if (this.isDesktop() && conversation.id === this.route.snapshot.params.userId) {
                if (this.hasConversations()) {
                    this.onConversationClicked(this.conversations()[0]);
                } else {
                    this.navigationService.navigate(RouteType.messages);
                }
            }
            this.cd.markForCheck();
        });
    }

    private updateInstantJobTimers() {
        const timeNow = new Date().getTime();
        for (const conversation of this.conversations()) {
            if (conversation.lastMessage?.type !== MessageType.instantJob) {
                continue;
            }

            const timeSinceCreated = timeNow - new Date(conversation.chatPartner?.created ?? '').getTime();
            const timeUntilDayExpired = Math.max(InstantJobTimerPipe.day - timeSinceCreated, 0);
            this.instantJobTimers[conversation.id] = timeUntilDayExpired;
        }
    }
}
