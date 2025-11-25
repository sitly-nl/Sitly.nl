//
//  AnimationModifiers.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct AnimateOpacity: ViewModifier {
    @State private var opacity = 0.0

    func body(content: Content) -> some View {
        content
            .opacity(opacity)
            .onAppear {
                DispatchQueue.main.async {
                    guard opacity == 0.0 else {
                        return
                    }
                    withAnimation {
                        opacity = 1.0
                    }
                }
            }
    }
}

extension View {
    func animateOpacity() -> some View {
        modifier(AnimateOpacity())
    }
}
