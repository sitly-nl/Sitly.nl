//
//  TextModifiers.swift
//  sitly
//
//  Created by Kyrylo Filippov on 3/5/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

enum SitlyFontKind {
    case body2
    case body3
    case body4
    case body5
    case heading4
    case heading5
    case heading6

    var font: UIFont {
        switch self {
        case .body2:
            return .body2
        case .body3:
            return .body3
        case .body4:
            return .body4
        case .body5:
            return .body5
        case .heading4:
            return .heading4
        case .heading5:
            return .heading5
        case .heading6:
            return .heading6
        }
    }

    var lineHeight: CGFloat {
        switch self {
        case .body2, .heading5:
            return .lineHeightDefault
        case .body3, .heading6:
            return .lineHeightS
        case .body4:
            return .lineHeightES
        case .body5:
            return .lineHeightSS
        case .heading4:
            return .lineHeightL
        }
    }
}

struct SitlyFont: ViewModifier {
    let font: UIFont
    let lineHeight: CGFloat

    func body(content: Content) -> some View {
        content
            .font(Font(font))
            .lineSpacing(lineHeight - font.lineHeight)
            .padding(.vertical, (lineHeight - font.lineHeight) / 2)
    }
}

extension View {
    func sitlyFont(_ kind: SitlyFontKind) -> some View {
        modifier(SitlyFont(font: kind.font, lineHeight: kind.lineHeight))
    }
}
