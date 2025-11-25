import { Component, HostListener, ViewChild, inject } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { CommonOverlayService } from 'app/services/overlay/common-overlay.service';
import { PushNotificationService } from 'app/services/push-notification.service';
import { PromptType } from 'app/models/api/prompt';
import { SharedModule } from 'modules/shared/shared.module';
import { TypeformService } from 'app/services/typeform.service';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { DeveloperMenuItemDirective } from 'app/components/developer-menu/developer-menu-item.directive';
import { CopyUtils } from 'app/utils/copy-utils';

@Component({
    selector: 'developer-menu',
    templateUrl: './developer-menu.component.html',
    styleUrl: './developer-menu.component.less',
    standalone: true,
    imports: [SharedModule, MatMenuModule, DeveloperMenuItemDirective],
    providers: [TypeformService],
})
export class DeveloperMenuComponent extends BaseComponent {
    readonly commonOverlayService = inject(CommonOverlayService);
    readonly pushNotificationService = inject(PushNotificationService);
    readonly typeformService = inject(TypeformService);
    PromptType = PromptType;

    @ViewChild(MatMenuTrigger) menuTrigger?: MatMenuTrigger;

    @HostListener('window:keyup', ['$event'])
    onKeydown(event: KeyboardEvent) {
        if (event.key === 'Q' && event.shiftKey && event.ctrlKey) {
            this.menuTrigger?.openMenu();
        }
    }

    @HostListener('window:devicemotion', ['$event'])
    onDeviceMotion(event: DeviceMotionEvent) {
        if (this.isShakeDetected(event)) {
            this.menuTrigger?.openMenu();
        }
    }

    openMenu() {
        this.menuTrigger?.openMenu();
    }

    requestDeviceMotionPermission(): void {
        const deviceMotionEvent = DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> };
        if (typeof deviceMotionEvent.requestPermission === 'function') {
            deviceMotionEvent
                .requestPermission()
                .then(permissionState => {
                    console.log('permissionState=', permissionState);
                })
                .catch(console.error);
        } else {
            console.log('DeviceMotionEvent permission is not supported');
        }
    }

    copyUserId() {
        CopyUtils.copyToClipboard(this.authUser.id, () => console.log('user id copied'));
    }

    private isShakeDetected(event: DeviceMotionEvent): boolean {
        const { acceleration } = event;
        if (acceleration) {
            const shakeThreshold = 25;
            return (
                Math.abs(acceleration.x ?? 0) > shakeThreshold ||
                Math.abs(acceleration.y ?? 0) > shakeThreshold ||
                Math.abs(acceleration.z ?? 0) > shakeThreshold
            );
        }
        return false;
    }
}
