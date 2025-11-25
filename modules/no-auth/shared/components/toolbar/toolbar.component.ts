import { Component, EventEmitter, Input, Output } from '@angular/core';

export type ToolbarCentralItem = { type: 'logo' } | { type: 'title'; title: string };

export enum ToolbarItem {
    back = 'back',
    close = 'close',
    settings = 'settings',
}

type ToolbarItemObject = {
    title: string | undefined;
    icon: string | undefined;
    iconSize: 'small' | 'regular';
    type: ToolbarItem;
};

@Component({
    selector: 'toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.less'],
})
export class ToolbarComponent {
    @Input() centralItem: ToolbarCentralItem = { type: 'logo' };
    @Input()
    set leftItems(items: ToolbarItem[]) {
        this.leftItemsInternal = items.map(item => {
            return { title: this.title(item), icon: this.icon(item), iconSize: this.iconSize(item), type: item };
        });
    }
    leftItemsInternal: ToolbarItemObject[];
    @Input()
    set rightItems(items: ToolbarItem[]) {
        this.rightItemsInternal = items.map(item => {
            return { title: this.title(item), icon: this.icon(item), iconSize: this.iconSize(item), type: item };
        });
    }
    rightItemsInternal: ToolbarItemObject[];

    @Output() itemSelected = new EventEmitter<ToolbarItem>();

    title(item: ToolbarItem) {
        switch (item) {
            case ToolbarItem.back:
                return 'main.back';
            default:
                return undefined;
        }
    }

    icon(item: ToolbarItem) {
        switch (item) {
            case ToolbarItem.back:
                return 'arrow-left';
            case ToolbarItem.close:
                return 'overlay-close-darker';
            case ToolbarItem.settings:
                return 'settings';
            default:
                return undefined;
        }
    }

    iconSize(item: ToolbarItem) {
        switch (item) {
            case ToolbarItem.back:
            case ToolbarItem.close:
                return 'small';
            default:
                return 'regular';
        }
    }
}
