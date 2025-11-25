//
//  TargetRectReaderModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct TargetRectReaderModifier: ViewModifier {
    @Binding var promtHighlightRect: CGRect?
    @Binding var promtPointRect: CGRect?

    func body(content: Content) -> some View {
        content
            .onPreferenceChange(TargetHighlightRectPreferenceKey.self) { size in
                promtHighlightRect = size
            }
            .onPreferenceChange(TargetPointRectPreferenceKey.self) { size in
                promtPointRect = size
            }
    }
}

extension View {
    func readTargetRect(
        promtHighlightRect: Binding<CGRect?>,
        promtPointRect: Binding<CGRect?>
    ) -> some View {
        modifier(TargetRectReaderModifier(promtHighlightRect: promtHighlightRect, promtPointRect: promtPointRect))
    }

    func trackHighLightRect() -> some View {
        GeometryReader { geometry in
            self.preference(key: TargetHighlightRectPreferenceKey.self, value: geometry.frame(in: .global))
        }
    }

    func trackPointRectIfNeeded(_ shouldTrack: Bool) -> some View {
        modifier(TargetPointTrackerModifier(shouldTrack: shouldTrack))
    }
}

private struct TargetPointTrackerModifier: ViewModifier {
    let shouldTrack: Bool

    func body(content: Content) -> some View {
        if shouldTrack {
            content.background {
                GeometryReader { geometry in
                    Color.clear.preference(key: TargetPointRectPreferenceKey.self, value: geometry.frame(in: .global))
                }
            }
        } else {
            content
        }
    }
}
