//
//  ButtonView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 22/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct ButtonView: View {
    let config: ButtonConfig
    private let borderWidth: CGFloat = 2
    private var verticalPadding: CGFloat {
        config.isSmall ? .spS : .spM
    }

    init(config: ButtonConfig) {
        self.config = config
    }

    var body: some View {
        HStack(alignment: .center) {
            Button {
                config.action?()
            } label: {
                HStack(spacing: .spS) {
                    if isLoading() {
                        ActivityIndicatorView(image: loaderImage())
                            .padding(.vertical, verticalPadding - (borderWidth / 2))
                    } else {
                        if let leftIcon = config.leftIcon {
                            Image(uiImage: leftIcon)
                        }
                        Text(config.title)
                            .font(.header5)
                            .foregroundColor(textColor())
                            .padding(.vertical, verticalPadding)
                            .padding(.horizontal, config.wrapSize ? .sp2XL : 0)
                            .disableAnimation()
                        if let rightIcon = config.rightIcon {
                            Image(uiImage: rightIcon)
                        }
                    }
                }
            }
            .disabled(isTapDisabled())
        }
        .modifier(InfiniteWidth(isInfinite: !config.wrapSize))
        .background(
            buttonBackground(),
            in: RoundedRectangle(
                cornerRadius: config.isSmall ? .spM : .spL,
                style: .continuous
            )
        )
        .border(borderColor(), width: borderWidth, cornerRadius: config.isSmall ? .spM : .spL)
        .onTapGesture {
            config.action?()
        }
    }

    private func loaderImage() -> UIImage {
        switch config.style {
        case .primary:
            return .loaderPrimary
        case .secondary:
            return .loaderSecondary
        case .thirdly:
            return .loaderThirdly
        }
    }

    private func buttonBackground() -> Color {
        switch config.style {
        case .primary(let isDisabled, _):
            return isDisabled ? .neutral500 : .primary500
        case .secondary, .thirdly:
            return .shadesWhite
        }
    }

    private func borderColor() -> Color {
        switch config.style {
        case .primary:
            return .clear
        case .secondary(let isDisabled, _):
            return isDisabled ? .neutral500 : .neutral900
        case .thirdly(let isDisabled, _):
            return isDisabled ? .neutral500 : .primary500
        }
    }

    private func textColor() -> Color {
        switch config.style {
        case .primary:
            return .shadesWhite
        case .secondary(let isDisabled, _):
            return isDisabled ? .neutral500 : .neutral900
        case .thirdly(let isDisabled, _):
            return isDisabled ? .neutral500 : .primary500
        }
    }

    private func isTapDisabled() -> Bool {
        switch config.style {
        case .primary(let isDisabled, let isLoading):
            return isDisabled || isLoading
        case .secondary(let isDisabled, let isLoading):
            return isDisabled || isLoading
        case .thirdly(let isDisabled, let isLoading):
            return isDisabled || isLoading
        }
    }

    private func isLoading() -> Bool {
        switch config.style {
        case .primary(_, let isLoading):
            return isLoading
        case .secondary(_, let isLoading):
            return isLoading
        case .thirdly(_, let isLoading):
            return isLoading
        }
    }
}

struct InfiniteWidth: ViewModifier {
    let isInfinite: Bool

    func body(content: Content) -> some View {
        if isInfinite {
            content.frame(maxWidth: .infinity)
        } else {
            content
        }
    }
}
