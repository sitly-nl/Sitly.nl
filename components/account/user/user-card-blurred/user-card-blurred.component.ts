import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, input, Output, signal, ViewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { User } from 'app/models/api/user';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    selector: '[user-card-blurred]',
    standalone: true,
    imports: [SharedModule, TranslateModule],
    templateUrl: './user-card-blurred.component.html',
    styleUrl: './user-card-blurred.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardBlurredComponent {
    readonly user = input.required<User>();
    @Output() viewClicked = new EventEmitter<string>();

    @ViewChild('columnRight', { static: true }) columnRightContainer: ElementRef<HTMLDivElement>;

    readonly buttonState = signal<'normal' | 'stretched'>('normal');

    readonly resizeObserver = new ResizeObserver(entries => {
        this.buttonState.set(entries[0].target.clientHeight > 70 ? 'stretched' : 'normal');
    });

    ngOnInit() {
        this.resizeObserver.observe(this.columnRightContainer.nativeElement);
    }

    ngOnDestroy() {
        this.resizeObserver.unobserve(this.columnRightContainer.nativeElement);
    }
}
