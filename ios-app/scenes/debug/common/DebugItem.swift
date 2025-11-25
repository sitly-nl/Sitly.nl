//
//  DebugItem.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
enum DebugItem: Identifiable {
    var id: String { tapVm.id }

    case trigger(tapVm: DebugTappableViewModel, action: VoidClosure)
    case navigation(
        tapVm: DebugTappableViewModel,
        screenVm: () -> BaseDebugScreenViewModel?
    )
    case accountsEditor(
        tapVm: DebugTappableViewModel,
        screenVm: () -> AccountsEditorViewModel?
    )
    case conversations(
        tapVm: DebugTappableViewModel,
        screenVm: () -> ConversationsViewModel?
    )
    case messages(
        tapVm: DebugTappableViewModel,
        screenVm: () -> MessagesViewModel?
    )
    case none

    var isNavigation: Bool {
        switch self {
        case .navigation, .accountsEditor, .conversations, .messages:
            return true
        case .none, .trigger:
            return false
        }
    }

    var tapVm: DebugTappableViewModel {
        switch self {
        case .trigger(let tapVm, _):
            return tapVm
        case .navigation(let tapVm, _):
            return tapVm
        case .accountsEditor(let tapVm, _):
            return tapVm
        case .conversations(tapVm: let tapVm, _):
            return tapVm
        case .messages(tapVm: let tapVm, _):
            return tapVm
        case .none:
            return DebugTappableViewModel.empty
        }
    }
}

extension DebugItem: Hashable {
    func hash(into hasher: inout Hasher) {
        hasher.combine(tapVm.id)
    }

    static func == (lhs: DebugItem, rhs: DebugItem) -> Bool {
        lhs.hashValue == rhs.hashValue
    }
}
#endif
