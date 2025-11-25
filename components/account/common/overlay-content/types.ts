import { WritableSignal } from '@angular/core';
import { GA4ElementAttr, GA4ElementCategories } from 'app/services/tracking/types';

export interface OverlayButton {
    title: string;
    action?: () => void;
    stayOpenOnClick?: boolean;
    iconRight?: string;
}

export interface ResponsiveButton extends OverlayButton {
    trackLabel: GA4ElementAttr;
    type: 'primary' | 'secondary' | 'thirdly' | 'danger';
}

export interface BaseOverlayContentData {
    title?: string;
    titleArgs?: Record<string, string>;
    message?: string;
    messageArgs?: Record<string, string>;
    htmlMessage?: string;
    primaryBtn?: OverlayButton;
    secondaryBtn?: OverlayButton;
    linkBtn?: OverlayButton;
    dangerBtn?: OverlayButton;
    stickyBtn?: OverlayButton;
    // TODO: type may be removed in the future if we will not need to support any non svg images
    img?: { name: string; type: 'svg' };
    titleAlignLeft?: boolean;
    textAlignLeft?: boolean;
    trackCategory?: GA4ElementCategories;
    trackName?: string;
    bgColor?: 'neutral';
    fullScreen?: boolean;
    doOnClose?: () => void;
}

export interface OverlayContentData extends BaseOverlayContentData {
    trackCategory: GA4ElementCategories;
}

export type OverlayWithData = { data: WritableSignal<BaseOverlayContentData> };
