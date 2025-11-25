//
//  ComposedTooltipOverlayView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ComposedTooltipOverlayView: View {
    @Binding var viewModel: TargetTooltipViewModel?
    @Binding var promtHighlightRect: CGRect?
    @Binding var promtPointRect: CGRect?

    var body: some View {
        ZStack {
            if let tooltipOverlay = viewModel {
                TargetTooltipOverlayView(
                    viewModel: tooltipOverlay,
                    promtHighlightRect: $promtHighlightRect,
                    promtPointRect: $promtPointRect
                )
                .compositingGroup()
            }
        }
        .animation(.easeInOut, value: viewModel)
    }
}

private struct TargetTooltipOverlayView: View {
    let viewModel: TargetTooltipViewModel
    @Binding var promtHighlightRect: CGRect?
    @Binding var promtPointRect: CGRect?
    @State private var tooltipSize = CGSize.zero

    private let tooltipWidth: CGFloat = 216.0
    private let paddingWithShadow: CGFloat = 13.0

    private var pointerPosition: HorizontalAlignment {
        guard let promtPointRect else {
            return .center
        }
        let x = promtPointRect.origin.x
        let screenCenter = UIScreen.main.bounds.width / 2
        let isFromLeftSide = x < screenCenter
        let isCenterItem = x + promtPointRect.width / 2 == screenCenter
        return isCenterItem ? .center : isFromLeftSide ? .leading : .trailing
    }

    var body: some View {
        ZStack {
            ZStack {
                Color.neutral900.opacity(0.5)
                    .onTapGesture {
                        viewModel.buttonAction?.action?()
                    }
            }
            .reverseMask {
                TargetTooltipMaskView(promtHighlightRect: $promtHighlightRect)
            }
            if let promtPointRect {
                VStack(alignment: pointerPosition, spacing: 0.0) {
                    VStack(spacing: 0.0) {
                        VStack(alignment: .leading, spacing: 0.0) {
                            Text(viewModel.title)
                                .font(.header6)
                                .foregroundColor(.neutral900)
                                .multilineTextAlignment(.leading)
                                .padding(.bottom, .spXS)
                            Text(viewModel.text)
                                .font(.body4)
                                .foregroundColor(.neutral900)
                                .multilineTextAlignment(.leading)
                            ButtonView(config: viewModel.buttonAction!)
                                .padding(.top, .spS)
                                .alignLeading()
                        }
                        .frame(width: tooltipWidth)
                        .padding(.spL)
                        .background {
                            Color.white.cornerRadius(.spL)
                        }
                        Image(.pointer)
                            .padding(.top, -0.5)
                            .align(position: pointerPosition)
                            .frame(width: tooltipWidth)
                            .padding([.leading, .trailing], .spL)
                            .padding(.bottom, promtPointRect.height < 1 ? .spXS : paddingWithShadow)
                    }
                    .compositingGroup()
                    .shadow(color: .neutral900.opacity(0.25), radius: 4, x: 0, y: 4)
                    .onSizeChanged { newSize in
                        tooltipSize = newSize!
                    }
                    Color.clear
                        .frame(width: promtPointRect.width, height: promtPointRect.height)
                }
                .position(CGPoint(
                    x: promtPointRect.origin.x + max(tooltipSize.width, promtPointRect.width) / 2,
                    y: promtPointRect.origin.y - tooltipSize.height / 2 + promtPointRect.height / 2)
                )
                .disableAnimation()
            }
        }
        .ignoresSafeArea()
    }
}

private struct TargetTooltipMaskView: View {
    @Binding var promtHighlightRect: CGRect?

    var body: some View {
        if let promtHighlightRect {
            ZStack {
                RoundedRectangle(
                    cornerRadius: 0.0, // To have rounded corners .spL
                    style: .continuous
                )
                .frame(width: promtHighlightRect.width, height: promtHighlightRect.height)
                .position(CGPoint(
                    x: promtHighlightRect.origin.x + promtHighlightRect.width / 2,
                    y: promtHighlightRect.origin.y + promtHighlightRect.height / 2)
                )
            }
            .ignoresSafeArea()
        }
    }
}
