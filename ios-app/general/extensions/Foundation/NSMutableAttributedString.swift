import UIKit

extension NSMutableAttributedString {
    func setUpLink(text: String, URL: String, underlineColor: UIColor? = nil, textColor: UIColor? = nil) {
        let range = mutableString.range(of: text)
        if range.location == NSNotFound {
            return
        }

        self.addAttribute(.link, value: URL, range: range)

        if let color = underlineColor {
            self.addAttributes([.underlineColor: color, .underlineStyle: NSUnderlineStyle.single.rawValue], range: range)
        }

        if let color = textColor {
            self.addAttributes([.foregroundColor: color], range: range)
        }
    }

    func append(string: String, attributes: [NSAttributedString.Key: Any]?) {
        append(NSAttributedString(string: string, attributes: attributes))
    }
}
