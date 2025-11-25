import { StorageService } from 'app/services/storage.service';
import { UserUpdates } from 'app/models/api/user-updates';
import { BehaviorSubject } from 'rxjs';
import { ApiService } from 'app/services/api/api.service';
import { Injectable, Output, signal, computed, inject } from '@angular/core';
import { map } from 'rxjs/operators';
import { ResponseParser } from 'app/parsers/response-parser';
import { Prompt } from 'app/models/api/prompt';
import { NavigationService } from 'app/services/navigation.service';
import { RouteType } from 'routing/route-type';

const interval = 20000;

@Injectable({
    providedIn: 'root',
})
export class UserUpdatesService {
    private apiService = inject(ApiService);
    private storageService = inject(StorageService);
    private navigationService = inject(NavigationService);

    readonly messagesCount = computed(() => this.writeableMessageCount());
    readonly invitesCount = computed(() => this.writeableInvitesCount());
    @Output() readonly prompts = new BehaviorSubject<Prompt | null>(null);

    private readonly writeableMessageCount = signal(0);
    private readonly writeableInvitesCount = signal(0);
    private started = false;
    private task: NodeJS.Timeout | null;

    private getUserUpdates() {
        return this.apiService
            .get('/users/me/updates?version=new')
            .pipe(map(response => ResponseParser.parseObject<UserUpdates>(response)));
    }

    start() {
        if (this.started) {
            // DO NOTHING
            return;
        }

        this.fetchUserUpdates();
        this.task = setInterval(() => {
            if (!this.started && this.task) {
                clearInterval(this.task);
                return;
            }

            this.fetchUserUpdates();
        }, interval);
        this.started = true;
    }

    stop() {
        this.started = false;
        if (this.task) {
            clearInterval(this.task);
            this.task = null;
        }
    }

    fetchUserUpdates() {
        if (!this.storageService.token) {
            this.stop();
            return;
        }

        this.getUserUpdates().subscribe(res => {
            this.writeableMessageCount.set(res.data.totalUnreadMessagesCount ?? 0);
            this.writeableInvitesCount.set(res.data.unviewedInvitesCount ?? 0);

            if (res.data.isPremium && this.storageService.processingPayment) {
                this.storageService.processingPayment = false;
                this.navigationService.navigate(RouteType.premiumStart, undefined, { queryParams: { status: 'PAID' } });
            }

            if (res.data.prompt) {
                this.prompts.next(res.data.prompt);
            }
        });
    }
}
