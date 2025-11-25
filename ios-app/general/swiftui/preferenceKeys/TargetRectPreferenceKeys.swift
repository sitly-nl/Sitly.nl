//
//  TargetRectPreferenceKeys.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct TargetHighlightRectPreferenceKey: PreferenceKey {
    typealias Value = CGRect?
    static var defaultValue: CGRect?

    static func reduce(value: inout CGRect?, nextValue: () -> CGRect?) {
        if let newValue = nextValue() {
            value = newValue
        }
    }
}

struct TargetPointRectPreferenceKey: PreferenceKey {
    typealias Value = CGRect?
    static var defaultValue: CGRect?

    static func reduce(value: inout CGRect?, nextValue: () -> CGRect?) {
        if let newValue = nextValue() {
            value = newValue
        }
    }
}
