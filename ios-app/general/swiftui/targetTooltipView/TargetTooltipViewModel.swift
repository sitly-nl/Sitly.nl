//
//  TargetTooltipViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 5/4/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

struct TargetTooltipViewModel: Equatable {
    let title: String
    let text: String
    let buttonAction: ButtonConfig?

    static func == (lhs: TargetTooltipViewModel, rhs: TargetTooltipViewModel) -> Bool {
        lhs.title == rhs.title && lhs.text == rhs.text && lhs.buttonAction?.title == rhs.buttonAction?.title
    }
}
