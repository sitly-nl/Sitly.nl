import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'registration-page-container',
    templateUrl: './registration-page-container.component.html',
    styleUrls: ['./registration-page-container.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class RegistrationPageContainerComponent extends RegistrationBaseComponent {
    @Input() title?: string;
    @Input() subtitle: 'none' | 'default' | { custom: string } = 'none';
    @Input() noBottomPadding = false;
    @Output() next = new EventEmitter();
}
