//
//  SizeReaderPreferenceKey.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct SizeReaderPreferenceKey: PreferenceKey {
    static var defaultValue: CGSize?

    static func reduce(value: inout CGSize?, nextValue: () -> CGSize?) {
        if let newValue = nextValue() {
            value = newValue
        }
    }
}

struct SizeReaderModifer: ViewModifier {
    private var sizeView: some View {
        GeometryReader { geometry in
            Color.clear.preference(key: SizeReaderPreferenceKey.self, value: geometry.size)
        }
    }

    func body(content: Content) -> some View {
        content.background(sizeView)
    }

}

extension View {
    func onSizeChanged(_ handler: @escaping (CGSize?) -> Void) -> some View {
        self
            .modifier(SizeReaderModifer())
            .onPreferenceChange(SizeReaderPreferenceKey.self, perform: { value in
                handler(value)
            })
    }
}
