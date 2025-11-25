//
//  ButtonConfig.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit

struct ButtonConfig: Identifiable {
    var id: String { "\(title) \(style.id)" }
    let title: String
    let leftIcon: UIImage?
    let rightIcon: UIImage?
    let style: ButtonKind
    let action: VoidClosure?
    let isTooltipTarget: Bool
    let isSmall: Bool
    let wrapTitle: Bool

    var wrapSize: Bool {
        return isSmall || wrapTitle
    }

    init(
        title: String,
        leftIcon: UIImage? = nil,
        rightIcon: UIImage? = nil,
        isTooltipTarget: Bool = false,
        isSmall: Bool = false,
        wrapTitle: Bool = false,
        style: ButtonKind,
        action: VoidClosure?
    ) {
        self.title = title
        self.leftIcon = leftIcon
        self.rightIcon = rightIcon
        self.isTooltipTarget = isTooltipTarget
        self.isSmall = isSmall
        self.wrapTitle = wrapTitle
        self.style = style
        self.action = action
    }
}
