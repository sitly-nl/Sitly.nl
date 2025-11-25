import UIKit

class TextView: UITextView {
    override init(frame: CGRect, textContainer: NSTextContainer?) {
        super.init(frame: frame, textContainer: textContainer)

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

    /// Configure the view.
    func setUp() {
        // Remove any padding in the textview
        textContainer.lineFragmentPadding = 0
        textContainerInset = .zero
    }

    override func layoutSubviews() {
        super.layoutSubviews()

        // Scroll to the top.
        contentOffset = .zero
    }
}
