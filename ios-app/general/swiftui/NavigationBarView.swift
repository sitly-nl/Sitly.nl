//
//  NavigationBarView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct NavigationBarView<LeftButtons: View, RightButtons: View, Title: View>: View {
    let title: String
    let backgroundColor: Color
    @ViewBuilder let leftButtons: LeftButtons
    @ViewBuilder let rightButtons: RightButtons
    @ViewBuilder let customTitle: Title

    init(
        backgroundColor: Color,
        @ViewBuilder leftButtons: () -> LeftButtons,
        @ViewBuilder rightButtons: () -> RightButtons,
        @ViewBuilder customTitle: () -> Title
    ) {
        self.title = ""
        self.backgroundColor = backgroundColor
        self.leftButtons = leftButtons()
        self.rightButtons = rightButtons()
        self.customTitle = customTitle()
    }

    init(
        title: String,
        @ViewBuilder leftButtons: () -> LeftButtons,
        @ViewBuilder rightButtons: () -> RightButtons,
        @ViewBuilder customTitle: () -> Title
    ) {
        self.title = title
        self.backgroundColor = .brandPrimary
        self.leftButtons = leftButtons()
        self.rightButtons = rightButtons()
        self.customTitle = customTitle()
    }

    var body: some View {
        ZStack {
            backgroundColor
            HStack(spacing: 0.0) {
                leftButtons.padding(.leading, .sp2XL)
                customTitle
                Spacer()
                rightButtons.padding(.trailing, .sp2XL)
            }
            if !title.isEmpty {
                VStack {
                    Text(title)
                        .foregroundColor(.white)
                        .font(.navigationBarFont)
                }
            }
        }
        .frame(height: .navBarHeight)
    }
}
