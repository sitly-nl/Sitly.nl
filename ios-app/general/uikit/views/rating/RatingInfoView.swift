import UIKit

class RatingInfoView: UIView {
    var descriptionText: String? {
        didSet {
            recomendationsCountLabel.text = descriptionText
        }
    }
    let recomendationsCountLabel = UILabel.autolayoutInstance()

    private let stackView = UIStackView.autolayoutInstance()
    private let ratingView = RatingView.autolayoutInstance()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUpView()
    }

    func setUpView() {
        addSubview(stackView)

        recomendationsCountLabel.font = UIFont.openSans(size: 14)
        recomendationsCountLabel.textColor = .defaultText
        recomendationsCountLabel.setContentHuggingPriority(.required, for: .horizontal)

        stackView.spacing = 3
        stackView.axis = .horizontal
        stackView.addArrangedSubview(ratingView)
        stackView.addArrangedSubview(recomendationsCountLabel)

        NSLayoutConstraint.attachToSuperview(view: stackView)
    }

    func configure(rating: Double, numberOfRecomendations: Int? = nil) {
        ratingView.value = rating
        if let numberOfRecomendations {
            descriptionText = String(
                format: ("recommendation.reviewsCount." + (numberOfRecomendations == 1 ? "singular" : "multiple")).localized,
                numberOfRecomendations
            )
        }
    }
}
