import UIKit

class SearchDayAvailabilityView: UIView {
    private lazy var stackView: UIStackView = {
        $0.axis = .vertical
        $0.distribution = .fillEqually
        addSubview($0)
        return $0
    }(UIStackView.autolayoutInstance())
    private lazy var label: UILabel = {
        $0.textAlignment = .center
        stackView.addArrangedSubview($0)
        return $0
    }(UILabel.autolayoutInstance())
    private lazy var iconView: UIImageView = {
        $0.contentMode = .center
        stackView.addArrangedSubview($0)
        return $0
    }(UIImageView.autolayoutInstance())

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
        layer.cornerRadius = 2

        NSLayoutConstraint.attachToSuperviewHorizontally(view: stackView, inset: 2)
        NSLayoutConstraint.attachToSuperviewVertically(view: stackView, inset: 2)
    }

    func configure(selected: Bool, day: Day) {
        backgroundColor = selected ? .neutral700 : .neutral100
        label.text = day.shortLocalized.uppercased()
        label.textColor = selected ? .white : .neutral500
        let fontSize = UIScreen.main.bounds.width * (7 / 320)
        label.font = selected ? .openSansSemiBold(size: fontSize) : .openSans(size: fontSize)
        iconView.image = selected ? #imageLiteral(resourceName: "IconAvailable") : #imageLiteral(resourceName: "IconNotAvailable")
    }
}
