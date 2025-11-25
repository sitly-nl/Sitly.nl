import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from 'modules/shared/components/loader/loader.component';
import { RatingBarComponent } from 'modules/shared/components/rating-bar/rating-bar.component';
import { RatingStarComponent } from 'modules/shared/components/rating-bar/rating-star/rating-star.component';
import { MoneyFormat } from 'modules/shared/pipes/money-format.pipe';
import { StringToDate } from 'modules/shared/pipes/string-to-date.pipe';
import { ImageDirective } from 'modules/shared/directives/image.directive';
import { AvatarDirective } from 'modules/shared/directives/avatar.directive';
import { TrackLabelDirective } from 'modules/shared/directives/track-label.directive';
import { UcFirst } from 'modules/shared/pipes/ucfirst.pipe';
import { ToolbarComponentOld } from 'modules/shared/components/toolbar-old/toolbar.component';
import { TranslateModule } from '@ngx-translate/core';
import { CoolLabelComponent } from 'modules/shared/components/cool-label/cool-label.component';
import { SlideToggleComponent } from 'modules/shared/components/slide-toggle/slide-toggle.component';
import { SystemButtonComponent } from 'modules/shared/components/system-button/system-button.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatInputModule } from '@angular/material/input';
import { SingleSelectButtonComponent } from 'modules/shared/components/single-select-button/single-select-button.component';
import { ChildIconPipe, ChildTitlePipe, ChildTraitsPipe } from 'modules/shared/pipes/child.pipe';
import { ToastMessageComponent } from 'modules/shared/components/toast-message/toast-message.component';
import { AvailabilityScheduleComponent } from 'modules/shared/components/availability-schedule/availability-schedule.component';
import { ToolbarComponent } from 'modules/shared/components/toolbar/toolbar.component';
import OverlayTemplateComponent from 'app/components/common/overlay-content/overlay-template/overlay-template.component';
import { PremiumTermsComponent } from 'modules/shared/premium-terms/premium-terms.component';
import { FacebookButtonDirective } from 'modules/shared/directives/facebook-button.directive';
import { InstantJobTimerPipe } from 'app/pipes/instant-job.timer.pipe';
import { ConversationDatePipe } from 'app/pipes/conversation-date.pipe';
import { DateFnsModule } from 'ngx-date-fns';
import { ClickOutsideDirective } from 'app/directives/clickOutside.directive';
import { TooltipComponent } from 'modules/shared/components/tooltip/tooltip.component';
import { ResponsiveButtonsContainerComponent } from 'modules/shared/components/responsive-buttons-container/responsive-buttons-container.component';

const declarations = [
    LoaderComponent,
    RatingBarComponent,
    RatingStarComponent,
    ToolbarComponent,
    ToolbarComponentOld,
    CoolLabelComponent,
    SlideToggleComponent,
    SystemButtonComponent,
    SingleSelectButtonComponent,
    ToastMessageComponent,
    AvailabilityScheduleComponent,
    OverlayTemplateComponent,
    PremiumTermsComponent,
    TooltipComponent,
    ResponsiveButtonsContainerComponent,

    MoneyFormat,
    StringToDate,
    UcFirst,
    ChildTraitsPipe,
    ChildIconPipe,
    ChildTitlePipe,
    InstantJobTimerPipe,
    ConversationDatePipe,

    ImageDirective,
    AvatarDirective,
    TrackLabelDirective,
    FacebookButtonDirective,
    ClickOutsideDirective,
];

const imports = [CommonModule, DateFnsModule, MatMenuModule, MatButtonToggleModule, MatInputModule, TranslateModule];

@NgModule({
    declarations,
    imports: [...imports, FormsModule, ReactiveFormsModule],
    exports: [...declarations, ...imports],
})
export class SharedModule {}
