import UIKit

enum CheckmarkTitleViewType {
    case checked
    case unchecked
    case notDefined
}

class CheckmarkTitleView: UIView {
    var type = CheckmarkTitleViewType.checked {
        didSet {
            switch type {
            case .checked:
                checkmarkImage.image = #imageLiteral(resourceName: "checkmark_schedule")
                titleLabel.textColor = .defaultText
            case .unchecked:
                checkmarkImage.image = #imageLiteral(resourceName: "CheckMarkCross")
                titleLabel.textColor = .neutral500
            case .notDefined:
                checkmarkImage.image = #imageLiteral(resourceName: "CheckMarkQuestionmark")
                titleLabel.textColor = .defaultText
            }
        }
    }

    private(set) var checkmarkImage = UIImageView(image: #imageLiteral(resourceName: "checkmark_schedule"))
    private(set) var titleLabel = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    func setState(_ state: Bool?) {
        if let state {
            type = state ? .checked : .unchecked
        } else {
            type = .notDefined
        }
    }

    private func setUpView() {
        checkmarkImage.translatesAutoresizingMaskIntoConstraints = false
        checkmarkImage.contentMode = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.openSansLight(size: 14)

        addSubview(checkmarkImage)
        addSubview(titleLabel)

        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-0-[checkmarkImage(13)]-6-[titleLabel]-0-|",
            options: [],
            metrics: nil,
            views: ["checkmarkImage": checkmarkImage, "titleLabel": titleLabel]))
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-0-[checkmarkImage]-0-|",
            options: [],
            metrics: nil,
            views: ["checkmarkImage": checkmarkImage]))
        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-0-[titleLabel]-0-|",
            options: [],
            metrics: nil,
            views: ["titleLabel": titleLabel]))
    }
}
