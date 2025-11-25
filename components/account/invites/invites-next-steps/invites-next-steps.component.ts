import { Component, ElementRef, ViewChild, signal } from '@angular/core';
import { BaseOverlayComponent } from 'app/components/common/overlay-content/base-overlay.component';
import { SharedModule } from 'modules/shared/shared.module';

@Component({
    standalone: true,
    selector: 'invites-next-steps',
    templateUrl: './invites-next-steps.component.html',
    styleUrls: ['./invites-next-steps.component.less'],
    imports: [SharedModule],
})
export class InvitesNextStepsComponent extends BaseOverlayComponent {
    @ViewChild('scrollSnapContainer', { static: true }) scrollSnapContainerRef: ElementRef<HTMLDivElement>;
    get scrollSnapContainer() {
        return this.scrollSnapContainerRef?.nativeElement;
    }

    readonly currentSlide = signal(0);

    readonly slides = [
        {
            title: 'invitesNextStepsOverlay.step1.title',
            subtitle: 'invitesNextStepsOverlay.step1.subtitle',
            imgName: 'invites/invites-slide-1',
        },
        {
            title: 'invitesNextStepsOverlay.step2.title',
            subtitle: 'invitesNextStepsOverlay.step2.subtitle',
            imgName: 'invites/invites-slide-2',
        },
        {
            title: 'invitesNextStepsOverlay.step3.title',
            subtitle: 'invitesNextStepsOverlay.step3.subtitle',
            imgName: 'invites/invites-slide-3',
        },
    ];

    private readonly nextBtn = {
        title: 'main.next',
        stayOpenOnClick: true,
        iconRight: 'arrow-neutral-bold',
        action: () => this.nextSlide(),
    };

    private readonly finishBtn = {
        title: 'main.gotIt',
    };

    ngOnInit() {
        this.data.set({
            secondaryBtn: this.nextBtn,
            linkBtn: {
                title: 'invitesNextStepsOverlay.cta.skip',
            },
        });
        this.setupScrollSnap();
    }

    onSlideChange() {
        if (this.currentSlide() === this.slides.length - 1) {
            this.data.set({
                secondaryBtn: this.finishBtn,
                linkBtn: {
                    title: 'invitesNextStepsOverlay.cta.skip',
                },
            });
            this.refresh();
        }
    }

    nextSlide() {
        if (this.scrollSnapContainer && this.currentSlide() < this.scrollSnapContainer.childNodes.length - 2) {
            const scrollTo = this.scrollSnapContainer.childNodes[this.currentSlide() + 1] as HTMLDivElement;
            this.scrollSnapContainer.scrollTo({ left: scrollTo.offsetLeft, behavior: 'smooth' });
        }
    }

    private setupScrollSnap() {
        this.scrollSnapContainerRef.nativeElement.addEventListener('scroll', _ => {
            const index = Math.round(this.scrollSnapContainer.scrollLeft / this.scrollSnapContainer.getBoundingClientRect().width);
            if (this.currentSlide() !== index) {
                this.currentSlide.set(index);
            }
            this.onSlideChange();
        });
    }
}
