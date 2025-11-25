import UIKit

class UITextViewWithPlaceholder: UITextView {
	override var text: String! {
		didSet {
			onTextChanged()
		}
	}
    override var textContainerInset: UIEdgeInsets {
        didSet {
            topConstraint?.constant = self.textContainerInset.top
            leadingConstraint?.constant = self.textContainerInset.left
            trailingConstraint?.constant = self.textContainerInset.right
        }
    }

    var attributedPlaceholder: NSAttributedString? {
		didSet {
			placeHolderLabel.attributedText = attributedPlaceholder
		}
	}
    var placeholderNumerOfLines = 1 {
        didSet {
            placeHolderLabel.numberOfLines = placeholderNumerOfLines
        }
    }

	private lazy var placeHolderLabel: UILabel = { [unowned self] in
		let label = UILabel.autolayoutInstance()
        label.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
		self.addSubview(label)

        self.topConstraint = label.topAnchor.constraint(equalTo: self.topAnchor, constant: self.textContainerInset.top)
        self.topConstraint?.isActive = true

        self.leadingConstraint = label.leadingAnchor.constraint(equalTo: self.leadingAnchor, constant: self.textContainerInset.left)
        self.leadingConstraint?.priority = .required
        self.leadingConstraint?.isActive = true

        self.trailingConstraint = self.trailingAnchor.constraint(equalTo: label.trailingAnchor, constant: self.textContainerInset.right)
        self.trailingConstraint?.priority = .required
        self.trailingConstraint?.isActive = true

        // overweise label won't breaks to new line
        self.centerXAnchor.constraint(equalTo: label.centerXAnchor).isActive = true

		return label
	}()
    private var topConstraint: NSLayoutConstraint?
    private var leadingConstraint: NSLayoutConstraint?
    private var trailingConstraint: NSLayoutConstraint?

	required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUp()
    }

	override init(frame: CGRect, textContainer: NSTextContainer?) {
		super.init(frame: frame, textContainer: textContainer)
        setUp()
	}

    private func setUp() {
        NotificationCenter.default.addObserver(self, selector: #selector(onTextChanged), name: UITextView.textDidChangeNotification, object: nil)
        textContainer.lineFragmentPadding = 0
    }

	@objc func onTextChanged() {
		placeHolderLabel.alpha = (text.count == 0) ? 1 : 0
	}
}
