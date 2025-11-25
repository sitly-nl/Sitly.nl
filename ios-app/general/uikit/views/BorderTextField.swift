import UIKit

class BorderTextField: UITextField {
    var showButton: UIButton?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUp()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUp()
    }

    override func prepareForInterfaceBuilder() {
        super.prepareForInterfaceBuilder()
        setUp()
    }

    private func setUp() {
        layer.cornerRadius = 2
        layer.masksToBounds = true
        layer.borderColor = UIColor.neutral900.cgColor
        layer.borderWidth = 1
        inputAccessoryView = UIView()
        textColor = .defaultText
        borderStyle = .none
    }

    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.insetBy(dx: 10, dy: 10)
    }

    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return textRect(forBounds: bounds)
    }

    override func rightViewRect(forBounds bounds: CGRect) -> CGRect {
        var rect = super.rightViewRect(forBounds: bounds)
        rect.origin.x -= 10
        return rect
    }

// MARK: - Show / hide button
    func addShowHideButton() {
        showButton = UIButton(type: .system)
        showButton?.titleLabel?.font = UIFont.openSans(size: 12)
        showButton?.addTarget(self, action: #selector(toggleShowPassword), for: .touchUpInside)
        showButton?.setAttributedTitle(attributedShowHideText(show: true), for: .normal)

        rightView = showButton
        rightViewMode = .always
    }

    @objc func toggleShowPassword() {
        isSecureTextEntry = !isSecureTextEntry
        showButton?.setAttributedTitle(attributedShowHideText(show: isSecureTextEntry), for: .normal)
    }

    func attributedShowHideText(show: Bool) -> NSAttributedString {
        let text = (show ? "show" : "hide").localized
        if let font = showButton?.titleLabel?.font {
            showButton?.frame = CGRect(x: 0, y: 0, width: text.width(font: font), height: frame.height)
        }
        return NSAttributedString(
            string: text,
            attributes: [
                .foregroundColor: UIColor.neutral700,
                .font: UIFont.openSans(size: 12)
            ])
    }
}
