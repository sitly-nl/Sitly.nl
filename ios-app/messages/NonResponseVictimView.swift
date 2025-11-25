import SwiftUI
import WebKit

struct NonResponseVictimView: View {
    var close: (() -> Void)
    var showEmailSettings: (() -> Void)
    var showRecommendations: (() -> Void)
    var showEditProfile: (() -> Void)

    var body: some View {
        ZStack(alignment: .topTrailing) {
            NonResponseVictimWebView(
                showEmailSettings: showEmailSettings, showRecommendations: showRecommendations, showEditProfile: showEditProfile
            )
            Button(action: close, label: {
                Image("CloseGray").renderingMode(.original).padding(16)
            })
        }
   }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        NonResponseVictimView(
            close: {}, showEmailSettings: {}, showRecommendations: {}, showEditProfile: {}
        )
    }
}

struct NonResponseVictimWebView: UIViewRepresentable {
    var showEmailSettings: (() -> Void)
    var showRecommendations: (() -> Void)
    var showEditProfile: (() -> Void)

    func makeCoordinator() -> NonResponseVictimWebView.Coordinator {
        return Coordinator(parent: self)
    }

    func makeUIView(context: UIViewRepresentableContext<NonResponseVictimWebView>) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: UIViewRepresentableContext<NonResponseVictimWebView>) {
        let connection = ServerConnection(endpoint: "users/me/non-response-victim-html")
        connection.responseDataType = .string
        connection.beginRequest { res, _ in
            if case .success(let value) = res, let htmlContent = value as? String {
                let htmlString = """
                    <style>
                        @font-face {
                            font-family: 'Open Sans';
                            font-weight: normal;
                            src: url(OpenSans-Regular.ttf);
                        }
                        @font-face {
                            font-family: 'Open Sans';
                            font-weight: bold;
                            src: url(OpenSans-Bold.ttf);
                        }
                        body {
                            font-family: 'Open Sans';
                            font-size: 14;
                            color: #333333;
                        }
                    </style>

                    <html>
                        <head><meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, shrink-to-fit=no\"></head>
                        <body>\(htmlContent)</body>
                    </html>
                """
                webView.loadHTMLString(htmlString, baseURL: nil)
            }
        }
    }

    // MARK: - Coordinator class
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: NonResponseVictimWebView

        init(parent: NonResponseVictimWebView) {
            self.parent = parent
        }

        func webView(
            _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            switch navigationAction.request.url?.absoluteString {
            case "_sitly-link-emailSettings_":
                parent.showEmailSettings()
            case "_sitly-link-recommendations_":
                parent.showRecommendations()
            case "_sitly-link-profile_":
                parent.showEditProfile()
            default:
                break
            }

            decisionHandler(WKNavigationActionPolicy.allow)
        }
    }
}
