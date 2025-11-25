//
//  CustomUIHostingController.swift
//  sitly
//
//  Created by Kyrylo Filippov on 21/2/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

class CustomUIHostingController<Content>: UIHostingController<Content> where Content: View {
    // MARK: - Lifecycle

    override init(rootView: Content) {
        super.init(rootView: rootView)
    }

    @objc required dynamic init?(coder aDecoder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        Logger.log("Deinitialized \(String(describing: type(of: self)))")
    }

    // MARK: - Overrides

    override func viewDidAppear(_ animated: Bool) {
        if #unavailable(iOS 16) {
            // required only for iOS 15, fixing issue when navigation bar is not hidden
            navigationController?.setNavigationBarHidden(true, animated: false)
        }
        super.viewDidAppear(animated)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }
}
