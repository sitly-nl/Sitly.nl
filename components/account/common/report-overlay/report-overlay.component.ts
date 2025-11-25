import { Component, ElementRef, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { User } from 'app/models/api/user';
import { ReportService } from 'app/services/api/report.service';
import { StandardOverlayComponent } from 'app/components/common/overlay-content/standard-overlay/standard-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'report-overlay',
    templateUrl: './report-overlay.component.html',
    styleUrls: ['./report-overlay.component.less'],
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class ReportOverlayComponent extends BaseOverlayComponent {
    showError = false;

    get user() {
        return this._user;
    }
    set user(value: User | undefined) {
        this._user = value;
        this.data.set({
            title: 'reportOverlay.title',
            titleArgs: { firstName: this.user?.firstName ?? '' },
            message: 'reportOverlay.message',
            messageArgs: { firstName: this.user?.firstName ?? '' },
            primaryBtn: this.user ? { title: 'main.submit', action: () => this.reportUser(), stayOpenOnClick: true } : undefined,
            secondaryBtn: { title: 'main.close' },
        });
    }

    @Output() reported = new EventEmitter();

    @ViewChild('reason') reasonField: ElementRef<HTMLTextAreaElement>;

    reportService = inject(ReportService);

    private _user?: User;

    private reportUser() {
        if (this.reasonField.nativeElement.value.length === 0) {
            this.showError = true;
            return;
        }

        this.close(() => {
            if (this.user) {
                this.reportService.reportUser(this.user?.id, this.reasonField.nativeElement.value).subscribe(_ => {
                    this.showSuccessOverlay();
                    this.reported.emit();
                });
            }
        });
    }

    private showSuccessOverlay() {
        this.overlayService.openOverlay(StandardOverlayComponent, {
            title: 'reportSuccessOverlay.title',
            htmlMessage: 'reportSuccessOverlay.message',
            primaryBtn: { title: 'main.close' },
        });
    }
}
