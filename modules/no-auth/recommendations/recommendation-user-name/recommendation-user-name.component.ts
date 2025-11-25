import { Component, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { PromptEvents } from 'app/services/tracking/types';
import { RouteType } from 'routing/route-type';
import { BaseComponent } from 'app/components/base.component';
import { RecommendationScreen } from 'modules/shared/enums/recommendation-screen';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: 'recommendation-user-name',
    templateUrl: './recommendation-user-name.component.html',
    styleUrls: ['./recommendation-user-name.component.less'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: true,
    imports: [SharedModule, TranslateModule],
})
export class RecommendationUserNameComponent extends BaseComponent {
    @ViewChild('name', { static: true }) nameInput: ElementRef<HTMLInputElement>;

    hasError = false;

    get hasValidName() {
        return this.nameInput.nativeElement.value?.length > 2;
    }

    next() {
        const name = this.nameInput.nativeElement.value;
        if (!this.hasValidName) {
            this.hasError = true;
            return;
        }

        this.navigationService.navigate(RouteType.recommendations, { screen: RecommendationScreen.message, name });
        this.trackingService.trackPromptClickEvent(PromptEvents.recommendationParentFirstname);
    }

    onNameChange() {
        this.hasError = false;
        this.cd.markForCheck();
    }
}
