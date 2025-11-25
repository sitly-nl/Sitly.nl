import SwiftUI
import WebKit

struct InstagramLoginWebView: UIViewRepresentable {
    var close: ((String) -> Void)

    // MARK: - UIViewRepresentable Delegate Methods
    func makeCoordinator() -> InstagramLoginWebView.Coordinator {
        return Coordinator(parent: self)
    }

    func makeUIView(context: UIViewRepresentableContext<InstagramLoginWebView>) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: UIViewRepresentableContext<InstagramLoginWebView>) {
        InstagramManager.authorizeApp { url in
            DispatchQueue.main.async {
                webView.load(URLRequest(url: url))
            }
        }
    }

    // MARK: - Coordinator class
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: InstagramLoginWebView

        init(parent: InstagramLoginWebView) {
            self.parent = parent
        }

        func webView(
            _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if let authToken = InstagramManager.getTokenFromCallbackRequest(request: navigationAction.request) {
                self.parent.close(authToken)
            }
            decisionHandler(WKNavigationActionPolicy.allow)
        }
    }
}
