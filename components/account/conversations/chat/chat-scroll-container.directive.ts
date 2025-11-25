import { Directive, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';

@Directive({
    selector: 'div[chat-scroll-container]',
    standalone: true,
})
export class ChatScrollContainerDirective {
    @Output() scrolledToTop = new EventEmitter();

    private readonly hostElementRef = inject(ElementRef) as ElementRef<HTMLDivElement>;
    private lastScrollPosition = { scrollTop: 0, scrollHeight: 0 };

    private get scrollHeight() {
        return this.hostElementRef.nativeElement.scrollHeight;
    }

    ngAfterViewInit() {
        this.scrollToBottom('instant');
    }

    @HostListener('scroll')
    onScroll() {
        if (this.hostElementRef.nativeElement.scrollTop === 0) {
            this.scrolledToTop.emit();
        }

        this.lastScrollPosition = {
            scrollTop: this.hostElementRef.nativeElement.scrollTop,
            scrollHeight: this.scrollHeight,
        };
    }

    scrollToBottom(behavior: ScrollBehavior = 'auto') {
        this.scrollY(this.hostElementRef.nativeElement.scrollHeight, behavior);
    }

    restoreLastScrollPosition() {
        this.scrollY(this.scrollHeight - this.lastScrollPosition.scrollHeight - this.lastScrollPosition.scrollTop, 'instant');
    }

    private scrollY(y: number, behavior: ScrollBehavior = 'auto') {
        this.hostElementRef.nativeElement.scrollTo({
            behavior,
            left: 0,
            top: y,
        });
    }
}
