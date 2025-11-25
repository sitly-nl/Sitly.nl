import UIKit

class RatingView: UIView {
    var value = Double(0) {
        didSet {
            for (index, item) in items.enumerated() {
                switch value - Double(index) {
                case ..<0.5:
                    item.image = #imageLiteral(resourceName: "RatingStarYellowEmpty")
                case 1...:
                    item.image = #imageLiteral(resourceName: "RatingStarYellowFull")
                default:
                    item.image = #imageLiteral(resourceName: "RatingStarYellowHalf")
                }
            }
        }
    }

    let stackView = UIStackView.autolayoutInstance()
    var items = [UIImageView]()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUpView()
    }

    func setUpView() {
        stackView.distribution = .equalSpacing
        addSubview(stackView)

        (0..<5).forEach { _ in
            let view = UIImageView.autolayoutInstance()
            view.image = #imageLiteral(resourceName: "RatingStarYellowEmpty")
            view.widthAnchor.constraint(equalTo: view.heightAnchor).isActive = true
            stackView.addArrangedSubview(view)
            items.append(view)
        }

        NSLayoutConstraint.attachToSuperview(view: stackView)
        widthAnchor.constraint(equalTo: heightAnchor, multiplier: 5.5).isActive = true
    }
}
