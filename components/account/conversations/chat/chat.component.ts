import { finalize, takeUntil } from 'rxjs/operators';
import { BaseComponent } from 'app/components/base.component';
import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Message } from 'app/models/api/message';
import { MessageService } from 'app/services/api/message.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { differenceInSeconds } from 'date-fns';
import { UserUpdatesService } from 'app/services/user-updates.service';
import { ChatModel } from 'app/components/conversations/chat/chat.model';
import { RouteType } from 'routing/route-type';
import { AppEventService, AppEventType } from 'app/services/event.service';
import { EventAction } from 'app/services/tracking/types';
import { MessageComponentType } from 'app/models/messages-group';
import { Gender } from 'app/models/api/user';
import { ChatCacheManager } from 'app/components/conversations/chat/chat-cache-manager';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportOverlayComponent } from 'app/components/common/report-overlay/report-overlay.component';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { AgoFormattedPipe } from 'app/pipes/ago-formatted.pipe';
import { FormsModule } from '@angular/forms';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { SharedModule } from 'modules/shared/shared.module';
import { AsyncPipe, LowerCasePipe, DecimalPipe } from '@angular/common';
import { RegularMessageComponent } from 'app/components/conversations/chat/messages/regular-message/regular-message.component';
import { SafetyTipsMessageComponent } from 'app/components/conversations/chat/messages/safety-tips-message/safety-tips-message.component';
import { ChatScrollContainerDirective } from 'app/components/conversations/chat/chat-scroll-container.directive';
import { TooltipService } from 'app/services/tooltip/tooltip.service';

@Component({
    selector: 'chat',
    templateUrl: 'chat.component.html',
    styleUrls: ['./chat.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [
        SharedModule,
        RouterLink,
        MatMenuTrigger,
        MatMenu,
        MatMenuItem,
        RegularMessageComponent,
        SafetyTipsMessageComponent,
        FormsModule,
        AsyncPipe,
        LowerCasePipe,
        DecimalPipe,
        TranslateModule,
        AgoFormattedPipe,
        ChatScrollContainerDirective,
    ],
})
export class ChatComponent extends BaseComponent implements OnInit, OnDestroy {
    readonly userUpdatesService = inject(UserUpdatesService);
    private readonly messageService = inject(MessageService);
    private readonly translateService = inject(TranslateService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly eventService = inject(AppEventService);
    private readonly chatCacheManager = inject(ChatCacheManager);
    private readonly tooltipService = inject(TooltipService);

    @Output() needsUpdateConversations = new EventEmitter();

    model: ChatModel;
    MessageComponentType = MessageComponentType;
    Gender = Gender;

    private readonly refreshIntervalLong = 20; // seconds
    private readonly refreshIntervalShort = 5; // seconds
    private intervalTimer: NodeJS.Timeout;

    @ViewChild(ChatScrollContainerDirective) private chatScrollContainer: ChatScrollContainerDirective;
    @ViewChild('messageField') private messageField?: ElementRef<HTMLTextAreaElement>;
    @ViewChild('btnOptions') private btnOptions?: ElementRef<HTMLButtonElement>;
    @ViewChild('btnOptionsContainer') private btnOptionsContainer?: ElementRef<HTMLButtonElement>;
    @ViewChild('headerContainer') private headerContainer?: ElementRef<HTMLButtonElement>;

    ngOnInit() {
        this.initModel();

        let needsShowInviteToApply = false;
        let needsShowAutoReject = false;

        this.route.url.pipe(takeUntil(this.destroyed$)).subscribe(_url => {
            this.loadNewMessages(true);
        });

        this.route.queryParamMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            if (params.get('inviteToApply')) {
                needsShowInviteToApply = true;
            }

            if (params.get('autoRejectUserQR')) {
                needsShowAutoReject = true;
                this.navigationService.removeQueryParam('autoRejectUserQR');
            }
        });

        this.chatCacheManager.clearOutdatedInputCache();

        this.route.paramMap.pipe(takeUntil(this.destroyed$)).subscribe(params => {
            const chatPartnerId = params.get('userId');
            if (!chatPartnerId) {
                return;
            }

            if (this.model.chatPartnerId !== chatPartnerId) {
                if (this.model.chatPartnerId) {
                    this.initModel();
                }
                this.model.chatPartnerId = chatPartnerId;
                this.model.messageText = this.storageService.messageInputCache?.[chatPartnerId]?.text ?? '';
            }

            this.userService.getUser(chatPartnerId, true).subscribe(
                response => {
                    this.model.chatPartner = response.data;
                    this.cd.markForCheck();

                    if (needsShowInviteToApply) {
                        this.setInvitationMessage();
                        needsShowInviteToApply = false;
                    }

                    if (needsShowAutoReject) {
                        this.showAutoRejectionOverlay();
                        needsShowAutoReject = false;
                    }
                },
                _ => {
                    this.navigationService.back();
                },
            );
            this.model.loadInitialData().subscribe(response => {
                if (response) {
                    this.updateAfterConversationInitiallyLoaded();
                }

                this.showRecommendationsTooltipIfNeeded();
                this.cd.markForCheck();
            });
            this.updateRefreshInterval();
        });

        const isPremium = this.authUser.isPremium;
        this.userService.changed.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            if (isPremium !== this.authUser.isPremium) {
                if (!this.authUser.isPremium) {
                    this.showPremium();
                }
            }
            this.model.user = this.authUser;
            this.cd.markForCheck();
        });
    }

    ngOnDestroy() {
        super.ngOnDestroy();
        this.hideKeyboard();
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
    }

    hideKeyboard() {
        this.messageField?.nativeElement.blur();
    }

    showPremium() {
        this.trackCtaEvent('profilepage-click_message-premiumoverlay', EventAction.click);
        this.navigationService.showPremium();
    }

    showAutoRejectionOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'chat.autorejection.popup.title',
            message: 'chat.autorejection.popup.message',
            messageArgs: {
                firstName: this.model.chatPartner?.firstName,
            },
            secondaryBtn: { title: 'main.cancel' },
            primaryBtn: {
                title: 'main.send',
                action: () => {
                    this.messageService.autoReject([this.model.chatPartnerId]).subscribe(
                        response => {
                            this.updateWithNewMessage(response.data?.[0]);
                        },
                        (error: HttpErrorResponse) => {
                            if (error.status === 403) {
                                this.overlayService.openOverlay(StandardOverlayComponent, {
                                    title: 'chat.autorejection.popup.title',
                                    message: 'messages.autorejectionError.popup.message',
                                    secondaryBtn: { title: 'main.close' },
                                });
                            }
                        },
                    );
                },
            },
        });
    }

    loadNewMessages(autoScroll = false) {
        if (!this.model.newestMessageTimeString) {
            return;
        }

        this.messageService.getConversationAfter(this.model.chatPartnerId, this.model.newestMessageTimeString).subscribe(response => {
            this.model.updateWithServerResponse(response, true);
            this.cd.markForCheck();
            this.updateRefreshInterval();
            if (autoScroll) {
                this.autoScroll();
            }

            this.showRecommendationsTooltipIfNeeded();
        });
    }

    onBlur() {
        this.chatCacheManager.updateChatCache(this.messageField?.nativeElement.value ?? '', this.model.chatPartnerId);
    }

    onFocus() {
        setTimeout(() => {
            this.messageField?.nativeElement.scrollIntoView();
            this.autoScroll();
        }, 200);
    }

    resizeTextarea() {
        const textarea = this.messageField?.nativeElement;
        if (textarea) {
            textarea.style.height = '';
            textarea.style.height = `${Math.min(textarea.scrollHeight + 1, 300)}px`;
        }
    }

    // Send message ----
    send(e: Event) {
        e.preventDefault();

        this.model.hadMinWordsError = !this.model.isMessageValid;
        if (this.model.isMessageValid) {
            this.submitMessage(this.model.messageText);
            (e.target as HTMLFormElement).reset();
            this.model.messageText = '';

            const messageCache = this.storageService.messageInputCache;
            if (messageCache) {
                delete messageCache[this.model.chatPartnerId];
                this.storageService.messageInputCache = messageCache;
            }
        }
    }

    setInvitationMessage() {
        this.translateService
            .get('chat.parentIntroductionMessage', { sitterName: this.model.chatPartner.firstName, parentName: this.model.user.firstName })
            .subscribe(translation => {
                this.model.messageText = translation;
                setTimeout(() => {
                    this.resizeTextarea();
                    this.messageField?.nativeElement.focus(); // seems not working
                }, 0);
            });
    }

    disableSafetyMessages() {
        this.userService.saveUser({ disabledSafetyMessages: 1 }).subscribe();
    }

    onScrollToTop() {
        this.messageService.getConversation(this.model.chatPartnerId, this.model.oldestMessageTime).subscribe(response => {
            if (response.data.length === 0) {
                return;
            }
            this.model.updateWithServerResponse(response);
            this.cd.markForCheck();
            setTimeout(() => this.chatScrollContainer.restoreLastScrollPosition(), 0);
        });
    }

    openChatPartnerProfile() {
        this.router.navigate([RouteType.users, this.model.chatPartner.id, { source: 'messages' }]);
    }

    toAskForRecommendation() {
        this.navigationService.navigate(RouteType.recommendations, {
            screen: RecommendationScreen.message,
            userId: this.model.chatPartnerId,
            name: this.model.chatPartner.firstName,
        });
    }

    showReportUserAlert() {
        const reportComponent = this.overlayService.openOverlay(ReportOverlayComponent);
        reportComponent.user = this.model.chatPartner;
        reportComponent.reported.subscribe(_ => this.model.reportedFromChat());
    }

    showSafetyTips() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: this.authUser.isParent ? 'chat.safetyTips.title' : 'chat.safetyTips.title.foster',
            htmlMessage: this.model.safetyTips,
            secondaryBtn: { title: 'main.close' },
        });
    }

    // ---- INTERNAL ---- //
    private updateRefreshInterval() {
        const lastDiff = this.model.newestMessageTimeString
            ? differenceInSeconds(new Date(), new Date(this.model.newestMessageTimeString))
            : Number.MAX_SAFE_INTEGER;
        this.setRefreshInterval(lastDiff < 180 ? this.refreshIntervalShort : this.refreshIntervalLong);
    }

    private autoScroll() {
        setTimeout(() => this.chatScrollContainer.scrollToBottom(), 200);
    }

    private setRefreshInterval(refreshRate: number) {
        clearInterval(this.intervalTimer);
        this.intervalTimer = setInterval(() => {
            this.loadNewMessages();
        }, refreshRate * 1000);
    }

    private submitMessage(text: string) {
        this.model.sendingMessage = true;
        this.messageService
            .send(this.model.chatPartnerId, text)
            .pipe(
                finalize(() => {
                    this.model.sendingMessage = false;
                    this.cd.markForCheck();
                }),
            )
            .subscribe(response => {
                this.updateWithNewMessage(response.data);
            });
    }

    private updateWithNewMessage(message: Message) {
        this.model.pushMessageIfNeeded(message);
        this.needsUpdateConversations.emit();
        this.cd.markForCheck();
        this.autoScroll();
    }

    private initModel() {
        this.model = new ChatModel(this.authUser, this.countrySettings, this.storageService, this.messageService, this.localeService);
    }

    private updateAfterConversationInitiallyLoaded() {
        setTimeout(() => {
            this.eventService.events.pipe(takeUntil(this.destroyed$)).subscribe(event => {
                if (event.type === AppEventType.paymentComplete) {
                    this.model.user = this.authUser;
                    this.model.canChat = true;
                    this.cd.markForCheck();
                }
            });
        });
    }

    private showRecommendationsTooltipIfNeeded() {
        if (!this.model.recommendationsEnabled() || this.storageService.recommendationsTooltipShown) {
            return;
        }

        setTimeout(() => {
            if (this.btnOptions) {
                this.storageService.recommendationsTooltipShown = this.tooltipService.showTooltip(
                    {
                        title: this.authUser.isParent ? 'chat.recommendationTooltipParent.title' : 'chat.recommendationTooltipSitter.title',
                        message: this.authUser.isParent
                            ? 'chat.recommendationTooltipParent.message'
                            : 'chat.recommendationTooltipSitter.message',
                        messageArgs: { firstName: this.model.chatPartner.firstName },
                        button: { label: 'chat.recommendationTooltip.cta' },
                        tooltipAlign: 'end',
                        tooltipPosition: 'bottom',
                        pointerAlign: 'end',
                    },
                    this.btnOptions,
                    this.isDesktop() ? this.btnOptionsContainer : this.headerContainer,
                );
            }
        }, 3_000);
    }
}
