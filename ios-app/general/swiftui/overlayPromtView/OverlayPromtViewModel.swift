//
//  OverlayPromtViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 19/3/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import Foundation
import UIKit

enum PromtOverlayKind {
    case pageStyle
    case dialogStyle
}

class OverlayPromtViewModel: ObservableObject, Identifiable {
    // MARK: - Public Properties

    let skipButtonTitle = "skip".localized
    let title: String
    let text: String
    let actions: [ButtonConfig]
    let pageStyle: PromtOverlayKind
    let pages: [PromtPageInfo]
    let onClose: VoidClosure?

    var selectedPage: PromtPageInfo? {
        return pages[safe: selectedIndex]
    }

    var nextButtonConfig: ButtonConfig {
        ButtonConfig(
            title: titleForNext(),
            rightIcon: selectedIndex == pages.count - 1 ? nil : .arrowBold,
            style: .secondary
        ) { [weak self] in
            self?.goToTheNextPage()
        }
    }

    // MARK: - State

    @Published var selectedIndex: Int = 0

    // MARK: - Lifecycle

    init(
        title: String,
        text: String,
        pageStyle: PromtOverlayKind,
        pages: [PromtPageInfo],
        actions: [ButtonConfig],
        onClose: VoidClosure?
    ) {
        self.title = title
        self.text = text
        self.pageStyle = pageStyle
        self.actions = actions
        self.pages = pages
        self.onClose = onClose
    }

    convenience init(pages: [PromtPageInfo], onClose: VoidClosure? = nil) {
        self.init(
            title: "",
            text: "",
            pageStyle: .pageStyle,
            pages: pages,
            actions: [],
            onClose: onClose
        )
    }

    convenience init(title: String, text: String, actions: [ButtonConfig], onClose: VoidClosure? = nil) {
        self.init(
            title: title,
            text: text,
            pageStyle: .dialogStyle,
            pages: [],
            actions: actions,
            onClose: onClose
        )
    }

    // MARK: - Private API

    private func titleForNext() -> String {
        guard selectedIndex < pages.count - 1 else {
            return "gotit".localized
        }
        return "Next".localized
    }

    private func goToTheNextPage() {
        guard selectedIndex < pages.count - 1 else {
            onClose?()
            return
        }
        selectedIndex += 1
    }
}

struct PromtPageInfo: Identifiable {
    var id: String { "\(title)_\(text)" }

    let image: UIImage
    let title: String
    let text: String
}

extension OverlayPromtViewModel: Equatable {
    static func == (lhs: OverlayPromtViewModel, rhs: OverlayPromtViewModel) -> Bool {
        lhs.id == rhs.id
    }
}
