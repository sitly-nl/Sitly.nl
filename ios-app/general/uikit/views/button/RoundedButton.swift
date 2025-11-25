import UIKit

class RoundedButton: UIButton {
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
        if let pointSize = titleLabel?.font.pointSize {
            titleLabel?.font = UIFont.openSansBold(size: pointSize)
        }

        titleLabel?.adjustsFontSizeToFitWidth = true
        titleLabel?.minimumScaleFactor = 0.5
    }
}
