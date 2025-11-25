//
//  WebViewViewModel.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI
import WebKit

class WebViewViewModel: NSObject, ObservableObject, WKNavigationDelegate, WKUIDelegate, Identifiable {
    // MARK: - Dependencies

    let id: String
    let url: URL
    let isChildView: Bool

    // MARK: - State

    @Published var newWindowViewModel: WebViewViewModel?

    // MARK: - Public Properties

    var title: String {
        return (url.host ?? "").replacingOccurrences(of: "www.", with: "")
    }

    var closeTitle: String {
        return "close".localized
    }

    // MARK: - LifeCycle

    init(url: URL, isChildView: Bool = false) {
        self.id = url.absoluteString
        self.isChildView = isChildView
        self.url = url
    }

    // MARK: - WKNavigationDelegate

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(.allow)
    }

    // MARK: - WKUIDelegate

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        guard navigationAction.targetFrame == nil,
              let url = navigationAction.request.url else {
            return nil
        }
        newWindowViewModel = WebViewViewModel(url: url, isChildView: true)
        return nil
    }
}
