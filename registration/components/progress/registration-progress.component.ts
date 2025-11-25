import { Component, EventEmitter, Output } from '@angular/core';
import { RegistrationBaseComponent } from 'registration/components/registration-base.component';
import { takeUntil } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'registration-progress',
    templateUrl: './registration-progress.component.html',
    styleUrls: ['./registration-progress.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class RegistrationProgressComponent extends RegistrationBaseComponent {
    @Output() backClick = new EventEmitter();

    ngOnInit() {
        this.registrationService.stepChanged.pipe(takeUntil(this.destroyed$)).subscribe(_ => this.cd.markForCheck());
    }
}
