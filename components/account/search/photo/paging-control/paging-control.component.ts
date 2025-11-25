import { Component, Input, Output, EventEmitter } from '@angular/core';

class PagingItem {
    page: number;
    spacer: boolean;

    static pageItem(page: number) {
        const item = new PagingItem();
        item.page = page;
        return item;
    }

    static spacer() {
        const item = new PagingItem();
        item.spacer = true;
        return item;
    }
}

@Component({
    selector: 'paging-control',
    templateUrl: './paging-control.component.html',
    styleUrls: ['./paging-control.component.less'],
    standalone: true,
    imports: [],
})
export class PagingControlComponent {
    @Input() numberOfPages = 0;
    @Input({ required: true }) bottomLineText: string;

    @Output() selectedPageChanged = new EventEmitter<number>();

    get selectedPage() {
        return this._selectedPage;
    }
    @Input() set selectedPage(value: number) {
        if (this._selectedPage !== value) {
            this.selectedPageChanged.emit(value);
            this._selectedPage = value;
        }
    }

    private _selectedPage = 1;

    get items() {
        if (this.numberOfPages < 8) {
            return Array.from({ length: this.numberOfPages }, (_, i) => PagingItem.pageItem(i + 1));
        }

        if (this.selectedPage > 0 && this.selectedPage < 4) {
            return [
                PagingItem.pageItem(1),
                PagingItem.pageItem(2),
                PagingItem.pageItem(3),
                PagingItem.pageItem(4),
                PagingItem.spacer(),
                PagingItem.pageItem(this.numberOfPages),
            ];
        } else if (this.selectedPage > this.numberOfPages - 3) {
            return [
                PagingItem.pageItem(1),
                PagingItem.spacer(),
                PagingItem.pageItem(this.numberOfPages - 3),
                PagingItem.pageItem(this.numberOfPages - 2),
                PagingItem.pageItem(this.numberOfPages - 1),
                PagingItem.pageItem(this.numberOfPages),
            ];
        } else {
            return [
                PagingItem.pageItem(1),
                PagingItem.spacer(),
                PagingItem.pageItem(this.selectedPage - 1),
                PagingItem.pageItem(this.selectedPage),
                PagingItem.pageItem(this.selectedPage + 1),
                PagingItem.spacer(),
                PagingItem.pageItem(this.numberOfPages),
            ];
        }
    }

    goToPreviousPage() {
        if (this.selectedPage !== 1) {
            this.selectedPage--;
        }
    }

    goToNextPage() {
        if (this.selectedPage !== this.numberOfPages) {
            this.selectedPage++;
        }
    }
}
