//
//  MessagesViewExtension.swift
//  sitly
//
//  Created by Kyrylo Filippov on 18/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

extension MessagesView {
    struct MessagesRateLimitView: View {
        @EnvironmentObject private var viewModel: MessagesViewModel
        @State var isExpanded = false
        @State private var keyboardHeight: CGFloat = 0

        var body: some View {
            if let limitText = viewModel.rateLimitWarning {
                VStack(spacing: 0.0) {
                    if keyboardHeight == 0 {
                        VStack(spacing: 0.0) {
                            Text(limitText)
                                .sitlyFont(.body3)
                                .foregroundColor(.neutral700)
                                .frame(maxWidth: .infinity, alignment: .leading)
                            if isExpanded {
                                Text(viewModel.rateLimitFullDescription)
                                    .sitlyFont(.body4)
                                    .foregroundColor(.neutral700)
                                    .padding(.top, .spS)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            HStack {
                                Text(viewModel.expandLimitButtonTitle(isExpanded: isExpanded))
                                    .sitlyFont(.body3)
                                    .foregroundColor(.primary500)
                                    .onTapGesture {
                                        withAnimation {
                                            isExpanded.toggle()
                                        }
                                    }
                                    .padding(.top, .spS)
                                Spacer()
                            }
                        }
                        .padding(.spM)
                    }
                }
                .keyboardHeight($keyboardHeight)
                .background(.shadesWhite)
            }
        }
    }

    struct MultiEntryTextEditor: View {
        var text: Binding<String>
        var isDisabled: Bool

        var body: some View {
            TextEditor(text: text)
                .frame(minHeight: 40, maxHeight: 128)
                .sitlyFont(.body2)
                .foregroundColor(isDisabled ? .neutral500 : .neutral900)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    struct ScrollDownView: View {
        @EnvironmentObject private var viewModel: MessagesViewModel
        private let badgeSize: CGFloat = 34.0

        var body: some View {
            if let numberOfNotViewed = viewModel.hasNotVisibleMessages {
                VStack(spacing: 0.0) {
                    if !numberOfNotViewed.isEmpty {
                        BadgeView(value: numberOfNotViewed)
                            .padding(.bottom, -.spS)
                            .zIndex(1)
                            .animateOpacity()
                    }
                    ZStack(alignment: .center) {
                        Color.shadesWhite
                        Image(.arrowDown)
                    }
                    .frame(width: badgeSize, height: badgeSize)
                    .clipShape(Circle())
                    Color.clear.frame(
                        width: badgeSize,
                        height: .spM + (numberOfNotViewed.isEmpty ? 0 : .spS) + 1
                    )
                }
                .padding(.top, -badgeSize - (.spM + (numberOfNotViewed.isEmpty ? 0 : .spS)))
                .padding(.trailing, .spM)
                .animateOpacity()
                .onTapGesture {
                    viewModel.onScrollDownTapped()
                }
            }
        }
    }
}
