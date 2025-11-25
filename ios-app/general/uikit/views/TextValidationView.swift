import UIKit

class TextValidationView: UIView {
    var text: String? {
        get { return textField.text }
        set { textField.text = newValue }
    }
    var attributedPlaceholder: NSAttributedString? {
        get { return textField.attributedPlaceholder }
        set { textField.attributedPlaceholder = newValue }
    }
    var error: String? {
        didSet {
            errorLabel.text = error
            textField.layer.borderColor = error == nil ? UIColor.neutral900.cgColor : UIColor.error.cgColor
        }
    }
    var inputValid = { (text: String?) -> Bool in
        return text?.count ?? 0 > 0
    }

    private var checkmarkShown = false {
        didSet {
            if textField.showButton != nil {
                return
            }

            if checkmarkShown {
                textField.rightView = UIImageView(image: #imageLiteral(resourceName: "SavedCheckmark"))
            }

            textField.rightViewMode = checkmarkShown ? .always : .never
        }
    }
    private(set) var textField = BorderTextField.autolayoutInstance()
    private var errorLabel = UILabel.autolayoutInstance()
    private var stackView = UIStackView.autolayoutInstance()

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
        backgroundColor = .clear

        textField.addTarget(self, action: #selector(valueChanged), for: .editingChanged)
        textField.font = .openSans(size: 14)
        textField.textColor = .defaultText
        textField.backgroundColor = .white

        errorLabel.font = .openSans(size: 12)
        errorLabel.textColor = .error

        stackView.axis = .vertical
        stackView.spacing = 3
        addSubview(stackView)
        stackView.addArrangedSubview(textField)
        stackView.addArrangedSubview(errorLabel)

        NSLayoutConstraint.attachToSuperview(view: stackView)
    }

    @objc func valueChanged() {
        checkmarkShown = inputValid(text)
        if !(text?.isEmpty ?? true) {
            error = nil
        }
    }
}
