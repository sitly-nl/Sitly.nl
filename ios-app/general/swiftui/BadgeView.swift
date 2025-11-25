//
//  BadgeView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 10/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct BadgeView: View {
    let value: String
    let color: Color
    let textColor: Color

    init(value: String, color: Color = .primary500, textColor: Color = .shadesWhite) {
        self.value = value
        self.color = color
        self.textColor = textColor
    }

    var body: some View {
        ZStack {
            color
            Text(value)
                .sitlyFont(.body4)
                .foregroundColor(textColor)
        }
        .frame(width: .spL, height: .spL)
        .clipShape(Circle())
    }
}
