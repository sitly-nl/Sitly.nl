import { Component } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'standard-overlay',
    templateUrl: './standard-overlay.component.html',
    styleUrls: ['./standard-overlay.component.less'],
    standalone: true,
    imports: [SharedModule],
})
export class StandardOverlayComponent extends BaseOverlayComponent {}
