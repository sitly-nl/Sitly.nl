//
//  OverlayPromtModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 20/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct OverlayPromtModifier: ViewModifier {
    @Binding var promtOverlay: OverlayPromtViewModel?
    let isFullscreen: Bool

    @State private var isPresentingFullScreenView = false

    func body(content: Content) -> some View {
        if isFullscreen {
            content.fullScreenCover(isPresented: $isPresentingFullScreenView) {
                PromtOverlayView(promtOverlay: $promtOverlay, isFullscreen: isFullscreen)
            }
            .onChange(of: promtOverlay) { value in
                var transaction = Transaction()
                transaction.disablesAnimations = true
                withTransaction(transaction) {
                    isPresentingFullScreenView = value != nil
                }
            }
        } else {
            content.overlay {
                PromtOverlayView(promtOverlay: $promtOverlay, isFullscreen: isFullscreen)
            }
        }
    }
}

extension View {
    func overlayPromtListener(
        _ promtOverlay: Binding<OverlayPromtViewModel?>,
        isFullscreen: Bool = false
    ) -> some View {
        modifier(OverlayPromtModifier(promtOverlay: promtOverlay, isFullscreen: isFullscreen))
    }
}

private struct PromtOverlayView: View {
    @Binding var promtOverlay: OverlayPromtViewModel?
    let isFullscreen: Bool

    var body: some View {
        ZStack {
            if let promtOverlay {
                OverlayPromtView()
                    .environmentObject(promtOverlay)
                    .compositingGroup()
            }
        }
        .modifier(OverlayPromtAnimationModifier(promtOverlay: $promtOverlay, isFullscreen: isFullscreen))
    }
}

private struct OverlayPromtAnimationModifier: ViewModifier {
    @Binding var promtOverlay: OverlayPromtViewModel?
    let isFullscreen: Bool

    func body(content: Content) -> some View {
        if isFullscreen {
            content
                .background(ClearBackgroundView())
                .animateOpacity()
                .ignoresSafeArea()
        } else {
            content
                .animation(.easeInOut, value: promtOverlay)
                .ignoresSafeArea()
        }
    }
}
