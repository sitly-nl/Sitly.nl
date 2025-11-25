import SwiftUI
import WebKit

struct SignUpWebView: UIViewRepresentable {
    var url: URL
    let webView = WKWebView()
    let configuration = ConfigService().fetch()

    func makeCoordinator() -> SignUpWebView.Coordinator {
        return Coordinator(parent: self)
    }

    func makeUIView(context: UIViewRepresentableContext<SignUpWebView>) -> WKWebView {
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: UIViewRepresentableContext<SignUpWebView>) {
        webView.load(URLRequest(url: url))
    }

    // MARK: - Coordinator class
    class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, SessionInjected, AuthServiceInjected,
                       RealmInjected, PushNotificationManagerInjected {
        var parent: SignUpWebView

        init(parent: SignUpWebView) {
            self.parent = parent
            super.init()
            parent.webView.addObserver(self, forKeyPath: #keyPath(WKWebView.url), options: .new, context: nil)
        }

        deinit {
            parent.webView.removeObserver(self, forKeyPath: #keyPath(WKWebView.url))
        }

        func webView(
            _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            let configurationInvalidated = parent.configuration?.isInvalidated == true
            let frontendUrl = (configurationInvalidated ? nil : parent.configuration?.frontendUrl) ?? "---"
            if  navigationAction.request.url?.path == "/logout"
                    || navigationAction.request.url?.absoluteString.hasPrefix(frontendUrl) == true {

                session.endUserSession()
                Router.rootViewController.popViewController(animated: true)
            }
            decisionHandler(WKNavigationActionPolicy.allow)
        }

        // swiftlint:disable:next block_based_kvo - block based kvo pushing to use .url key while working one is URL
        override func observeValue(
            forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?
        ) {
            if keyPath == #keyPath(WKWebView.url), let url = (object as? WKWebView)?.url, url.absoluteString.contains("/search/") {
                try? realm?.write {
                    authService.currentUser?.completed = true
                }
                UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
                    self.parent.webView.alpha = 0
                }, completion: { _ in
                    self.parent.webView.isHidden = true
                })
                UserService().reloadMe { _ in
                    AnalyticsManager.logEvent(self.authService.currentUser?.isParent ?? true ? .signUpCompleteParent : .signUpCompleteSitter)
                    self.pushNotificationManager.start()
                    Router.moveToSignInState(true, animated: true)
                }
            }
        }

        // MARK: - WKUIDelegate

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            guard navigationAction.targetFrame == nil else {
                return nil
            }
            let newWindow = WKWebView(frame: self.parent.webView.frame, configuration: configuration)
            newWindow.uiDelegate = self
            self.parent.webView.addSubview(newWindow)
            return newWindow
        }

        func webViewDidClose(_ webView: WKWebView) {
            webView.removeFromSuperview()
        }
    }
}
