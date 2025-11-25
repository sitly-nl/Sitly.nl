import { ApplicationRef, ComponentRef, Injectable, createComponent, inject } from '@angular/core';
import { DeveloperMenuComponent } from 'app/components/developer-menu/developer-menu.component';
import { environment } from 'environments/environment';

@Injectable()
export class DeveloperMenuService {
    private readonly menuComponentRef?: ComponentRef<DeveloperMenuComponent>;

    constructor() {
        if (environment.name !== 'production') {
            const appRef = inject(ApplicationRef);
            this.menuComponentRef = createComponent(DeveloperMenuComponent, {
                environmentInjector: appRef.injector,
            });
            appRef.attachView(this.menuComponentRef.hostView);
        }
    }

    openMenu() {
        this.menuComponentRef?.instance.openMenu();
    }
}
