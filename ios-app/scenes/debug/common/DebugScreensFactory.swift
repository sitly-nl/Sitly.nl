//
//  DebugScreensFactory.swift
//  sitly
//
//  Created by Kyrylo Filippov on 27/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import UIKit

#if DEBUG || UAT
protocol DebugScreensFactoryProtocol {
    func createDebugScreenView() -> UIViewController?
}

class DebugScreensFactory: BaseFactory, DebugScreensFactoryProtocol {
    private lazy var debugVmFactory = resolver.resolve(DebugScreensViewModelFactoryProtocol.self)

    func createDebugScreenView() -> UIViewController? {
        let viewModel = debugVmFactory.createGeneralDebugScreenViewModel()
        let rootDebugView = DebugView().environmentObject(viewModel)
        let hostingVC = CustomUIHostingController(rootView: rootDebugView)
        return hostingVC
    }
}
#endif
