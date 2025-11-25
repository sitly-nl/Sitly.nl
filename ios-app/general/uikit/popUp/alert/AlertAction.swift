import UIKit

struct AlertAction {
    typealias ActionClosure = (AlertAction) -> Void

    var title = ""
    var action: ActionClosure = { _ in }
    var style = AlertAction.Style.semiBold

    enum Style {
        case light, semiBold

        var fontSize: CGFloat {
            return 14
        }

        var font: UIFont {
            switch self {
            case .light:
                return UIFont.openSansLight(size: fontSize)
            case .semiBold:
                return UIFont.openSansBold(size: fontSize)
            }
        }
    }

    init(title: String, style: Style = .semiBold, action: @escaping ActionClosure = { _ in }) {
        self.title = title
        self.style = style
        self.action = action
    }
}
