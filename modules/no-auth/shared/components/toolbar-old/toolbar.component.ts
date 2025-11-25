import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { RouteType } from 'routing/route-type';
import { NavigationService } from 'app/services/navigation.service';

export enum ToolbarBorderStyle {
    normal = 'normal',
    dark = 'dark',
    none = 'none',
}

export enum ToolbarActionType {
    back = 'back',
    close = 'close',
    map = 'map',
    photos = 'photos',
    filters = 'filters',
    clear = 'clear',
    logout = 'logout',
}

@Component({
    selector: 'toolbar-old',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.base.less'],
})
export class ToolbarComponentOld {
    readonly navigationService = inject(NavigationService);

    @Input() title?: string;
    @Input() showLogo = true;
    @Input() borderStyle = ToolbarBorderStyle.none;
    @Input() leftActions: ToolbarActionType[] = [];
    @Input() rightActions: ToolbarActionType[] = [];
    @Input() trackingLabel?: string = '';

    @Output() backClick = new EventEmitter();
    @Output() closeClick = new EventEmitter();
    @Output() actionButtonClick = new EventEmitter<ToolbarActionType>();

    onActionButtonClick(action: ToolbarActionType) {
        if (action === ToolbarActionType.back) {
            this.backClick.emit();
        } else if (action === ToolbarActionType.close) {
            this.closeClick.emit();
        } else {
            this.actionButtonClick.emit(action);
        }
    }

    onLogoClick() {
        this.navigationService.navigate(RouteType.search, 'photo');
    }

    actionIcon(action: ToolbarActionType) {
        switch (action) {
            case ToolbarActionType.back:
                return 'back-button';
            case ToolbarActionType.close:
                return 'close-overlay-button';
            case ToolbarActionType.map:
                return 'map-icon';
            case ToolbarActionType.filters:
                return 'filter-icon';
            default:
                return null;
        }
    }

    actionTitle(action: ToolbarActionType) {
        switch (action) {
            case ToolbarActionType.map:
                return 'search.map';
            case ToolbarActionType.photos:
                return 'search.photos';
            case ToolbarActionType.filters:
                return 'search.filters';
            case ToolbarActionType.clear:
                return 'main.clear';
            case ToolbarActionType.logout:
                return 'account.logout';
            default:
                return '';
        }
    }

    actionClass(action: ToolbarActionType) {
        switch (action) {
            case ToolbarActionType.clear:
                return 'toolbar-button bordered-button';
            default:
                return 'toolbar-button';
        }
    }
}
