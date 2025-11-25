import { Component } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { TranslateModule } from '@ngx-translate/core';
import { SharedModule } from 'modules/shared/shared.module';
import { NgTemplateOutlet } from '@angular/common';

export interface Paragraph {
    title: string;
    content?: string;
    bullets?: string[];
    large?: boolean;
}

@Component({
    selector: 'non-response-overlay',
    templateUrl: './non-response-overlay.component.html',
    styleUrls: ['./non-response-overlay.component.less'],
    standalone: true,
    imports: [SharedModule, NgTemplateOutlet, TranslateModule],
})
export class NonResponseOverlayComponent extends BaseOverlayComponent {
    ngOnInit() {
        this.data.set({
            title: 'nonResponseOverlay.title',
            secondaryBtn: { title: 'main.close' },
            textAlignLeft: true,
            titleAlignLeft: !this.isDesktop(),
            fullScreen: !this.isDesktop(),
        });
    }

    get paragraphs(): Paragraph[] {
        return [
            {
                title: 'nonResponseOverlay.paragraph0.title',
                content: 'nonResponseOverlay.paragraph0.content',
            },
            {
                title: 'nonResponseOverlay.paragraph1.title',
                bullets: [
                    'nonResponseOverlay.paragraph1.bullet0',
                    'nonResponseOverlay.paragraph1.bullet1',
                    'nonResponseOverlay.paragraph1.bullet2',
                ],
            },
            {
                title: 'nonResponseOverlay.thingsYouCanDo.title',
                large: true,
            },
            {
                title: 'nonResponseOverlay.paragraph2.title',
                content: 'nonResponseOverlay.paragraph2.content',
            },
            {
                title: 'nonResponseOverlay.paragraph3.title',
                content: 'nonResponseOverlay.paragraph3.content',
            },
            {
                title: 'nonResponseOverlay.paragraph4.title',
                content: 'nonResponseOverlay.paragraph4.content',
            },
            {
                title: 'nonResponseOverlay.paragraph5.title',
                content: 'nonResponseOverlay.paragraph5.content',
            },
        ];
    }
}
