//
//  WebPresenterModifier.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI

struct WebPresenterModifier: ViewModifier {
    var viewModel: Binding<WebViewViewModel?>

    func body(content: Content) -> some View {
        content
            .sheet(item: viewModel) { pushedViewModel in
                WebView(viewModel: pushedViewModel)
            }
    }
}

extension View {
    func webPresenter(_ viewModel: Binding<WebViewViewModel?>) -> some View {
        modifier(WebPresenterModifier(viewModel: viewModel))
    }
}
