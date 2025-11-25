import UIKit

class RoundedShadowView: UIView {
    let defaultRadius: CGFloat = 17.5

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
        cornerRadius = defaultRadius
        layer.shadowRadius = 4.5
        layer.shadowOpacity = 0.15
        layer.shadowOffset = .zero
    }
}
