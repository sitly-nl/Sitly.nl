import { Component, OnInit, Input } from '@angular/core';
import { BaseComponent } from 'app/components/base.component';
import { User } from 'app/models/api/user';
import { RouteType } from 'routing/route-type';
import { TranslateModule } from '@ngx-translate/core';
import { FormatPipeModule } from 'ngx-date-fns';
import { SharedModule } from 'modules/shared/shared.module';
import { ExpandableTextComponent } from 'app/components/user/profile/common/expandable-text/expandable-text.component';

const STAR_SIZE_DESKTOP = 22;
const STAR_SIZE_MOBILE = 13;

@Component({
    selector: 'foster-recommendations',
    templateUrl: './foster-recommendations.component.html',
    styleUrls: ['./foster-recommendations.component.base.less'],
    standalone: true,
    imports: [SharedModule, ExpandableTextComponent, FormatPipeModule, TranslateModule],
})
export class FosterRecommendationsComponent extends BaseComponent implements OnInit {
    @Input({ required: true }) user: User;

    ownProfile = false;
    recommendationsExpanded = false;

    get recommendationsNumber() {
        return this.hasRecommendations ? this.user.recommendations.length : 0;
    }

    get hasRecommendations() {
        return this.user.recommendations.length > 0;
    }

    get visibleRecommendations() {
        if (!this.hasRecommendations) {
            return [];
        }

        if (this.recommendationsExpanded || this.recommendationsNumber <= 2) {
            return this.user.recommendations;
        }

        return [this.user.recommendations[0], this.user.recommendations[1]];
    }

    get starSize() {
        return this.isDesktop() ? STAR_SIZE_DESKTOP : STAR_SIZE_MOBILE;
    }

    ngOnInit() {
        this.ownProfile = this.user.id === this.authUser.id;
    }

    expandRecommendations() {
        this.recommendationsExpanded = true;
    }

    toAskForRecommendation() {
        this.navigationService.navigate(RouteType.recommendations);
    }
}
