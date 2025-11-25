import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, UrlTree } from '@angular/router';
import { RouteType } from 'routing/route-type';
import { InstagramTokenService } from 'app/services/instagram/instagram-token.service';
import { RouteService } from 'app/services/route.service';

export interface State {
    target: string;
    source: string;
    purpose: string;
}

@Component({
    standalone: true,
    selector: 'instagram-auth-callback',
    template: '',
})
export default class InstagramAuthCallbackComponent {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly igTokenService = inject(InstagramTokenService);
    private readonly routeService = inject(RouteService);

    ngOnInit() {
        const urlTree = this.router.parseUrl(this.router.url);
        if (this.routeService.routeType() === RouteType.instagram) {
            this.handleInstagramResponse(urlTree);
        }
    }

    onLoginError(params: Record<string, string>) {
        this.router.navigate([this.parseState(params.state).source]);
    }

    private parseState(json: string) {
        return JSON.parse(json) as State;
    }

    private handleInstagramResponse(urlTree: UrlTree) {
        const code = this.route.snapshot.queryParamMap.get('code');
        if (code) {
            this.igTokenService.requestToken(code).subscribe(() => {
                const stateStr = this.route.snapshot.queryParamMap.get('state');
                if (stateStr) {
                    const state = this.parseState(stateStr);
                    this.onInstagramLoginSuccess(state);
                }
            });
        } else {
            this.onLoginError(urlTree.queryParams);
        }
    }

    private onInstagramLoginSuccess(state: State) {
        if (!state) {
            return;
        }

        window.history.replaceState({}, '', state?.source?.split('(')[0]);
        this.router.navigateByUrl(state.source);
    }
}
