import UIKit

class SecondaryButton: UIButton {
    override init(frame: CGRect) {
        super.init(frame: frame)
        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUpView()
    }

    func setUpView() {
        cornerRadius = 16
        borderColor = .buttonSecondary
        borderWidth = 2
        layer.borderWidth = 2
        titleLabel?.font = .openSansBold(size: 16)
    }
}
