import { Component, Input, inject } from '@angular/core';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { ApiService } from 'app/services/api/api.service';
import { ToolbarItem } from 'modules/shared/components/toolbar/toolbar.component';
import { finalize } from 'rxjs/operators';
import { TranslateModule } from '@ngx-translate/core';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { NgTemplateOutlet } from '@angular/common';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'forgot-password',
    templateUrl: './forgot-password.component.html',
    styleUrls: ['./forgot-password.component.less'],
    standalone: true,
    imports: [SharedModule, FormsModule, MatFormField, MatLabel, MatInput, ReactiveFormsModule, NgTemplateOutlet, TranslateModule],
})
export class ForgotPasswordComponent extends NoAuthBaseComponent {
    @Input() email?: string;

    emailControl = new FormControl('', {
        nonNullable: true,
        validators: [Validators.email, Validators.required],
    });

    ToolbarItem = ToolbarItem;

    state: 'init' | 'success' = 'init';
    loading = false;

    private readonly apiService = inject(ApiService);

    ngOnInit() {
        this.emailControl.setValue(this.email ?? '');
    }

    continueClicked() {
        if (this.emailControl.invalid) {
            return;
        }

        this.loading = true;
        this.emailControl.disable();

        this.apiService
            .post('/users/password-reset-token', { brandCode: 'main', body: { email: this.emailControl.value } })
            .pipe(
                finalize(() => {
                    this.loading = false;
                    this.state = 'success';
                    this.cd.markForCheck();
                }),
            )
            .subscribe();
    }
}
