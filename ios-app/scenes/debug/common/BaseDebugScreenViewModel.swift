//
//  BaseDebugScreenViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation

#if DEBUG || UAT
class BaseDebugScreenViewModel: ObservableObject {
    private let id = UUID().uuidString
    var title: String { "" }

    @Published var items = [DebugSection]()
    @Published var navDestination: DebugItem?

    init() {
        setup()
    }

    deinit { Logger.log("Deinitialized \(String(describing: self))") }

    func setup() {}
    func onClose() {}
    func didSelect(item: DebugItem) {
        item.tapVm.preTapAction?()
        switch item {
        case .trigger(_, let action):
            action()
        case .navigation, .accountsEditor, .conversations, .messages:
            navDestination = item
        default:
            break
        }
    }
}

class DebugTappableViewModel: ObservableObject, Identifiable {
    private let idBase = UUID().uuidString
    var id: String { "\(idBase)_\(subtitle)" }
    let image: String // lets just use some smiles
    let title: String
    let preTapAction: VoidClosure?
    @Published private(set) var subtitle: String

    init(image: String = "", title: String, subtitle: String, preTapAction: VoidClosure? = nil) {
        self.image = image
        self.title = title
        self.subtitle = subtitle
        self.preTapAction = preTapAction
    }

    func setSubtitle(text: String) {
        DispatchQueue.main.async { [weak self] in
            self?.subtitle = text
        }
    }

    static let empty = DebugTappableViewModel(title: "", subtitle: "")
}

struct DebugSection: Identifiable {
    let id = UUID().uuidString
    let title: String
    let items: [DebugItem]
}
#endif
