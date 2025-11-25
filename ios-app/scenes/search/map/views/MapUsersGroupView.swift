import UIKit

class MapUsersGroupView: UIImageView {
    var title = "" {
        didSet {
            titleLabel.text = title
            titleLabel.sizeToFit()
        }
    }
    private let titleLabel = UILabel.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    override init(frame: CGRect) {
        super.init(frame: frame)

        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.font = UIFont.openSansSemiBold(size: 16)
        titleLabel.minimumScaleFactor = 0.4
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.baselineAdjustment = .alignCenters
        addSubview(titleLabel)

        setContentHuggingPriority(.required, for: .horizontal)
        NSLayoutConstraint.activate([
            titleLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 7),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -7),
            titleLabel.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
    }
}
