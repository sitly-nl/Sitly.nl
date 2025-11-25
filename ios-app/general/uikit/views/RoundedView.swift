import UIKit

class RoundedView: UIView {
    let defaultRadius: CGFloat = 3

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    override func prepareForInterfaceBuilder() {
        super.prepareForInterfaceBuilder()
        setUpView()
    }

    func setUpView() {
        layer.masksToBounds = true
        cornerRadius = defaultRadius
    }
}
