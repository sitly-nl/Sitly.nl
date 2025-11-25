import UIKit

class PrimaryButton: UIButton {
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
        backgroundColor = .brandPrimary
        titleLabel?.font = .openSansBold(size: 16)
    }
}
