import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { AuthRoutingModule } from 'modules/auth/auth-routing.module';
import { SignInComponent } from 'modules/auth/components/sign-in/sign-in.component';
import { SharedModule } from 'modules/shared/shared.module';
import { AuthTranslateService } from 'modules/auth/services/auth-translate.service';
import { SignUpComponent } from 'modules/auth/components/sign-up/sign-up.component';
import { translateModuleConfig } from 'app/services/translation.service';
import { CountryPickerOverlayComponent } from 'modules/auth/components/country-picker/country-picker-overlay.component';
import { AuthOverlayService } from 'modules/auth/services/auth-overlay.service';
import { TermsAndPrivacyComponent } from 'modules/auth/components/terms-and-privacy/terms-and-privacy.component';
import { ForgotPasswordComponent } from 'modules/auth/components/forgot-password/forgot-password.component';
import { SignUpSSOComponent } from 'modules/auth/components/sign-up-sso/sign-up-sso.component';
import { GoogleButtonComponent } from 'modules/auth/components/google-button/google-button.component';
import { SocialSSOComponent } from 'modules/auth/components/social-sso/social-sso.component';

@NgModule({
    imports: [
        CommonModule,
        SharedModule,
        TranslateModule.forChild(translateModuleConfig(AuthTranslateService)),
        AuthRoutingModule,
        MatBottomSheetModule,
        MatDialogModule,
        MatSelectModule,
        ReactiveFormsModule,
        SignInComponent,
        SignUpComponent,
        CountryPickerOverlayComponent,
        TermsAndPrivacyComponent,
        ForgotPasswordComponent,
        SignUpSSOComponent,
        GoogleButtonComponent,
        SocialSSOComponent,
    ],
    providers: [AuthOverlayService],
})
export default class AuthModule {}
