import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { Error } from 'app/services/api/api.service';
import { ResetPasswordApiService } from 'modules/reset-password/services/api/reset-password.api.service';
import { SessionService } from 'app/services/session.service';
import { JwtUtils } from 'app/utils/jwt-utils';
import { finalize, switchMap } from 'rxjs/operators';
import { ResetPasswordTranslateService } from 'modules/reset-password/services/reset-password-translate.service';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { NoAuthTemplateComponent } from 'modules/no-auth/no-auth-template.component';
import { OverlayService } from 'app/services/overlay/overlay.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { translateModuleConfig } from 'app/services/translation.service';
import { ValidationRules } from 'app/utils/constants';

export interface ResetPasswordData {
    type: 'access';
    email: string;
}

export type ResetPasswordError = Error<{ title: string }>;

@Component({
    standalone: true,
    selector: 'reset-password',
    templateUrl: './reset-password.component.html',
    styleUrls: ['./reset-password.component.less'],
    imports: [TranslateModule, SharedModule, ReactiveFormsModule, NoAuthTemplateComponent],
    providers: [
        ResetPasswordApiService,
        ResetPasswordTranslateService,
        TranslateModule.forChild(translateModuleConfig(ResetPasswordTranslateService)).providers ?? [],
    ],
})
export default class ResetPasswordComponent extends NoAuthBaseComponent {
    readonly passwordService = inject(ResetPasswordApiService);
    readonly sessionService = inject(SessionService);
    readonly overlayService = inject(OverlayService);
    readonly route = inject(ActivatedRoute);

    token: string;
    data: ResetPasswordData | undefined;

    loading = false;
    passwordFocused = false;
    repeatPasswordFocused = false;
    revealPassword = false;
    revealRepeatPassword = false;

    @ViewChild('passwordRef', { static: true }) passwordRef: ElementRef<HTMLInputElement>;

    password = new FormControl('', {
        validators: [Validators.minLength(ValidationRules.user.password.length.min)],
        updateOn: 'blur',
    });
    repeatPassword = new FormControl('', {
        updateOn: 'blur',
        validators: [
            control => {
                return control.value !== this.password.value ? { noMatch: true } : null;
            },
        ],
    });

    get passwordLength() {
        return this.password.value?.length ?? 0;
    }
    get repeatPasswordLength() {
        return this.repeatPassword.value?.length ?? 0;
    }

    ngOnInit() {
        this.token = this.route.snapshot.paramMap.get('token') ?? '';
        this.data = JwtUtils.parse<{ data: ResetPasswordData }>(this.token)?.data;

        setTimeout(() => {
            this.passwordRef.nativeElement.focus();
        }, 0);
    }

    savePassword() {
        // needed to force validation if user clicked Save button without touching input fields
        this.password.addValidators(Validators.required);
        this.password.updateValueAndValidity();
        this.password.markAsDirty();
        this.repeatPassword.updateValueAndValidity();
        this.repeatPassword.markAsDirty();

        if (this.password.invalid || this.repeatPassword.invalid) {
            return;
        }

        this.loading = true;

        const password = this.password.value ?? '';
        this.passwordService
            .resetPassword(password, this.token)
            .pipe(
                switchMap(res =>
                    this.sessionService.startWithInitialData({
                        user: res.user,
                        token: res.token ?? '',
                    }),
                ),
                finalize(() => {
                    this.loading = false;
                    this.cd.markForCheck();
                }),
            )
            .subscribe(
                _ => {
                    this.sessionService.navigateToDefaultRoute();
                },
                (error: ResetPasswordError) => {
                    this.overlayService.openOverlay(StandardOverlayComponent, {
                        title: error.error?.errors?.[0]?.title,
                        primaryBtn: { title: 'main.close' },
                    });
                },
            );
    }

    onPasswordChange(value: string) {
        if (value.length >= ValidationRules.user.password.length.min) {
            this.password.setErrors(null);
        }
    }

    onRepeatPasswordChange(value: string) {
        if (this.password.value === value) {
            this.repeatPassword.setErrors(null);
        }
    }
}
