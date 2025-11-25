import { ChatComponent } from 'app/components/conversations/chat/chat.component';
import { RouteType } from 'routing/route-type';
import { ChangeDetectionStrategy, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BaseComponent } from 'app/components/base.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { InstantJobDetailsComponent } from 'app/components/instant-job/instant-job-details.component';
import { MessagesComponent } from 'app/components/conversations/messages/messages.component';

@Component({
    selector: 'combined-chat',
    templateUrl: './combined-chat.component.html',
    styleUrls: ['./combined-chat.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [MessagesComponent, ChatComponent, InstantJobDetailsComponent],
})
export class CombinedChatComponent extends BaseComponent {
    readonly route = inject(ActivatedRoute);

    @ViewChild('chat') chat: ChatComponent;
    RouteType = RouteType;

    readonly routeParams = toSignal(this.route.paramMap);
    readonly selectedChatId = computed(() => this.routeParams()?.get('userId'));
    readonly hasConversations = signal(false);
    readonly showChat = computed(() => {
        return (
            (this.hasConversations() && this.routeService.routeType() !== RouteType.instantJob) ||
            (this.authUser?.isPremium && this.selectedChatId())
        );
    });
    readonly showInstantJobs = computed(() => {
        return this.hasConversations() && this.routeService.routeType() === RouteType.instantJob;
    });
    readonly sideBarCollapsed = computed(() => {
        return !this.hasConversations() && this.authUser.isPremium && this.selectedChatId();
    });
    readonly sideBarFillScreen = computed(() => {
        return !this.hasConversations() && (!this.authUser.isPremium || !this.selectedChatId());
    });

    onConversationsLoaded(conversationsNumber: number) {
        this.hasConversations.set(conversationsNumber > 0);
    }
}
