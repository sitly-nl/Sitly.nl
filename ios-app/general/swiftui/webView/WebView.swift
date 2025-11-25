//
//  WebView.swift
//  sitly
//
//  Created by Kyrylo Filippov on 6/6/24.
//  Copyright © 2024 Sitly. All rights reserved.
//

import SwiftUI
import WebKit

struct WebView: View {
    @StateObject var viewModel: WebViewViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack(alignment: .top) {
            VStack(spacing: 0.0) {
                if viewModel.isChildView {
                    NavigationBarView(
                        backgroundColor: .shadesWhite
                    ) {
                        Text(viewModel.closeTitle)
                            .sitlyFont(.body2)
                            .foregroundColor(.neutral900)
                            .onTapGesture {
                                dismiss()
                            }
                    } rightButtons: {
                        Text(viewModel.closeTitle)
                            .sitlyFont(.body2)
                            .foregroundColor(.neutral900)
                            .opacity(0.0)
                    } customTitle: {
                        Text(viewModel.title)
                            .sitlyFont(.heading5)
                            .foregroundColor(.neutral900)
                            .alignCenter()
                    }
                }
                WebViewContainer(viewModel: viewModel)
            }
        }
        .overlay(alignment: .topTrailing) {
            if !viewModel.isChildView {
                Image(.cross).padding(.spL)
                    .onTapGesture {
                        dismiss()
                    }
            }
        }
        .webPresenter($viewModel.newWindowViewModel)
    }
}

private struct WebViewContainer: UIViewRepresentable {
    let viewModel: WebViewViewModel

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = viewModel
        webView.uiDelegate = viewModel
        let request = URLRequest(url: viewModel.url)
        webView.load(request)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // No need to update the web view
    }
}

#if DEBUG
#Preview {
    WebView(viewModel: WebViewViewModel(url: URL(string: "https://google.com")!))
}
#endif
