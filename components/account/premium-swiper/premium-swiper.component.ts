import { Component, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { SwiperComponent, SwiperModule } from 'swiper/angular';
import SwiperCore, { Pagination, Autoplay, Navigation, SwiperOptions } from 'swiper';
import { SharedModule } from 'modules/shared/shared.module';
import { GA4EventAction } from 'app/services/tracking/types';
import { BaseComponent } from 'app/components/base.component';
import { FeatureService } from 'app/services/feature.service';

SwiperCore.use([Autoplay, Pagination, Navigation]);

@Component({
    standalone: true,
    selector: 'premium-swiper',
    templateUrl: './premium-swiper.component.html',
    styleUrls: ['./premium-swiper.component.less'],
    imports: [SwiperModule, SharedModule],
})
export class PremiumSwiperComponent extends BaseComponent implements OnDestroy {
    readonly featureService = inject(FeatureService);

    @Input() slideBorder = true;
    currentSlide = 0;

    @ViewChild('swiper', { static: false }) swiper: SwiperComponent;
    swiperConfig: SwiperOptions = {
        slidesPerView: 1,
        pagination: {
            horizontalClass: 'premium-swiper-pagination-horizontal',
            bulletClass: 'swiper-pagination-bullet',
            bulletActiveClass: 'bullet-active',
        },
        autoplay: { delay: 3000 },
        loop: true,
        navigation: this.isDesktop()
            ? {
                  nextEl: '.swiper-next-btn',
                  prevEl: '.swiper-prev-btn',
              }
            : false,
        slideClass: 'premium-swiper-slide',
        wrapperClass: 'premium-swiper-wrapper',
        on: {
            tap: swiper => {
                this.trackingService.trackUserAction({
                    name: GA4EventAction.slideTap,
                    category: 'premium',
                    index: swiper.realIndex,
                });
            },
            doubleTap: swiper => {
                this.trackingService.trackUserAction({
                    name: GA4EventAction.slideDoubleTap,
                    category: 'premium',
                    index: swiper.realIndex,
                });
            },
            click: swiper => {
                this.trackingService.trackUserAction({
                    name: GA4EventAction.slideClick,
                    category: 'premium',
                    index: swiper.realIndex,
                });
            },
            doubleClick: swiper => {
                this.trackingService.trackUserAction({
                    name: GA4EventAction.slideDoubleClick,
                    category: 'premium',
                    index: swiper.realIndex,
                });
            },
            touchEnd: swiper => {
                const { startX, currentX } = swiper.touches;
                if (startX === currentX) {
                    this.trackingService.trackUserAction({
                        name: GA4EventAction.slideTouchTap,
                        category: 'premium',
                        index: swiper.realIndex,
                    });
                    return;
                }
                const slideSwipeEventName = startX > currentX ? GA4EventAction.slideSwipeNext : GA4EventAction.slideSwipePrev;
                const nextSlide = slideSwipeEventName === GA4EventAction.slideSwipeNext ? swiper.realIndex + 1 : swiper.realIndex - 1;
                this.trackingService.trackUserAction({
                    name: slideSwipeEventName,
                    category: 'premium',
                    index: nextSlide,
                });
            },
        },
    };

    slides = this.authUser?.isParent
        ? [
              {
                  imgName: 'premium/premium-slide-parent-1',
                  title: 'premiumOverlay.start.titleParent1',
                  subtitle: 'premiumOverlay.start.subtitleParent1',
              },
              {
                  imgName: 'premium/premium-slide-parent-2',
                  title: 'premiumOverlay.start.titleParent2',
                  subtitle: 'premiumOverlay.start.subtitleParent2',
              },
              {
                  imgName: 'premium/premium-slide-parent-3',
                  title: 'premiumOverlay.start.titleParent3',
                  subtitle: 'premiumOverlay.start.subtitleParent3',
              },
              {
                  imgName: 'premium/premium-slide-parent-4',
                  title: 'premiumOverlay.start.titleParent4',
                  subtitle: 'premiumOverlay.start.subtitleParent4',
              },
          ]
        : [
              {
                  imgName: 'premium/premium-slide-sitter-1',
                  title: this.featureService.invitesEnabled ? 'premiumOverlay.start.titleSitter1.v2' : 'premiumOverlay.start.titleSitter1',
                  subtitle: this.featureService.invitesEnabled
                      ? 'premiumOverlay.start.subtitleSitter1.v2'
                      : 'premiumOverlay.start.subtitleSitter1',
              },
              {
                  imgName: 'premium/premium-slide-sitter-2',
                  title: this.featureService.invitesEnabled ? 'premiumOverlay.start.titleSitter2.v2' : 'premiumOverlay.start.titleSitter2',
                  subtitle: this.featureService.invitesEnabled
                      ? 'premiumOverlay.start.subtitleSitter2.v2'
                      : 'premiumOverlay.start.subtitleSitter2',
              },
              {
                  imgName: 'premium/premium-slide-sitter-3',
                  title: this.featureService.invitesEnabled ? 'premiumOverlay.start.titleSitter3.v2' : 'premiumOverlay.start.titleSitter3',
                  subtitle: this.featureService.invitesEnabled
                      ? 'premiumOverlay.start.subtitleSitter3.v2'
                      : 'premiumOverlay.start.subtitleSitter3',
              },
              {
                  imgName: 'premium/premium-slide-sitter-4',
                  title: this.featureService.invitesEnabled ? 'premiumOverlay.start.titleSitter4.v2' : 'premiumOverlay.start.titleSitter4',
                  subtitle: this.featureService.invitesEnabled
                      ? 'premiumOverlay.start.subtitleSitter4.v2'
                      : 'premiumOverlay.start.subtitleSitter4',
              },
          ];

    private autoPlayTimeout: NodeJS.Timeout | null;

    ngOnDestroy() {
        if (this.autoPlayTimeout) {
            clearTimeout(this.autoPlayTimeout);
            this.autoPlayTimeout = null;
        }
    }

    toggleSwiperAutoplay() {
        if (this.swiper.swiperRef.autoplay.running) {
            this.swiper.swiperRef.autoplay.stop();
        } else {
            this.swiper.swiperRef.slideNext();
            this.swiper.swiperRef.autoplay.start();
        }
    }

    onSlideChange() {
        this.currentSlide = this.swiper?.swiperRef?.realIndex ?? 0;

        this.autoPlayTimeout = setTimeout(() => {
            this.swiper?.swiperRef?.autoplay?.start();
            this.autoPlayTimeout = null;
        }, 0);
    }
}
