//
//  ButtonKind.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

enum ButtonKind: Equatable {
    case primary(isDisabled: Bool, isLoading: Bool)
    case secondary(isDisabled: Bool, isLoading: Bool)
    case thirdly(isDisabled: Bool, isLoading: Bool)

    static var primary: ButtonKind = .primary(isDisabled: false, isLoading: false)
    static var secondary: ButtonKind = .secondary(isDisabled: false, isLoading: false)
    static var thirdly: ButtonKind = .thirdly(isDisabled: false, isLoading: false)

    static var primaryDisabled: ButtonKind = .primary(isDisabled: true, isLoading: false)
    static var secondaryDisabled: ButtonKind = .secondary(isDisabled: true, isLoading: false)
    static var thirdlyDisabled: ButtonKind = .thirdly(isDisabled: true, isLoading: false)

    static var primaryLoading: ButtonKind = .primary(isDisabled: false, isLoading: true)
    static var secondaryLoading: ButtonKind = .secondary(isDisabled: false, isLoading: true)
    static var thirdlyLoading: ButtonKind = .thirdly(isDisabled: false, isLoading: true)

    var id: String {
        switch self {
        case .primary(let isDisabled, let isLoading):
            return "primary_\(isDisabled)_\(isLoading)"
        case .secondary(let isDisabled, let isLoading):
            return "secondary\(isDisabled)_\(isLoading)"
        case .thirdly(let isDisabled, let isLoading):
            return"thirdly\(isDisabled)_\(isLoading)"
        }
    }
}
