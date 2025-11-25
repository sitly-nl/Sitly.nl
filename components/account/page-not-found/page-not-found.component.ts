import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
    selector: 'page-not-found',
    templateUrl: './page-not-found.component.html',
    styleUrls: ['./page-not-found.component.less'],
    standalone: true,
    imports: [TranslateModule],
})
export class PageNotFoundComponent {}
