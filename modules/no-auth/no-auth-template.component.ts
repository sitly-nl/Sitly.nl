import { CommonModule } from '@angular/common';
import { inject, Component, ElementRef, EventEmitter, Input, Output, ViewChild, signal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NoAuthBaseComponent } from 'app/components/no-auth-base.component';
import { SessionService } from 'app/services/session.service';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    standalone: true,
    selector: 'no-auth-template',
    templateUrl: './no-auth-template.component.html',
    styleUrls: ['./no-auth-template.component.less'],
    imports: [SharedModule, CommonModule, FormsModule],
})
export class NoAuthTemplateComponent extends NoAuthBaseComponent {
    private readonly sessionService = inject(SessionService);

    @Input() showBackBtn = false;
    @Input() showLanguagePicker = true;
    @Output() back = new EventEmitter();

    @ViewChild('container') containerRef: ElementRef<HTMLDivElement>;

    readonly selectedLocale = model<string | undefined>(this.localeService.getLocaleCode());
    readonly localeOptions = signal(this.countrySettingsService.countrySettings?.locales);

    ngOnInit() {
        if (!this.countrySettingsService.countrySettings && this.storageService.countryCode) {
            this.countrySettingsService.refreshCountrySettings().subscribe(_ => {
                this.selectedLocale.set(this.localeService.getLocaleCode());
                this.localeOptions.set(this.countrySettingsService.countrySettings?.locales);
            });
        }
    }

    onLocaleChange(event: Event) {
        const localeCode = (event.target as HTMLSelectElement).value;

        // seems bug with loading translations in child modules is not fixed yet in ngx-translate
        // https://github.com/ngx-translate/core/issues/1193
        // so just hard reload for now
        this.sessionService.changeLanguage(localeCode, true);
    }

    scrollToTop() {
        this.containerRef.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
