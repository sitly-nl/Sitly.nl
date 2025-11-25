import UIKit
import WebKit

class SafetyTipsViewController: BaseViewController, WKNavigationDelegate {
    var htmlContent = ""

    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var webView: WKWebView!

    override class var storyboard: UIStoryboard {
        return .messages
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "safetyTips.title".localized

        webView.navigationDelegate = self
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
                a:link {
                    color: #6abce6;
                }
                body {
                    padding: 25px 14px;
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
        webView.loadHTMLString(htmlString, baseURL: Bundle.main.bundleURL)
    }

// MARK: - WKNavigationDelegate
    func webView(
        _ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard
            navigationAction.navigationType == .linkActivated,
            let url = navigationAction.request.url,
            UIApplication.shared.canOpenURL(url)
        else {
            decisionHandler(.allow)
            return
        }
        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }
}
