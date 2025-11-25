import UIKit

extension JobNotifyingView {
    enum ViewType {
        case search
        case conversations
        case chatPostedJob
    }
}

class JobNotifyingView: UIView {
    var disclosureActions: () -> Void

    private lazy var iconView: UIImageView = {
        $0.contentMode = .scaleAspectFit
        return $0
    }(UIImageView.autolayoutInstance())
    private let type: ViewType
    private let titleLabel = UILabel.autolayoutInstance()
    private let descriptionLabel = UILabel.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(type: ViewType, disclosureActions: @escaping () -> Void) {
        self.disclosureActions = disclosureActions
        self.type = type

        super.init(frame: .zero)

        backgroundColor = .neutral300
        translatesAutoresizingMaskIntoConstraints = false

        let stackView = UIStackView.autolayoutInstance()
        stackView.spacing = 10
        addSubview(stackView)

        let spacer = UIView.autolayoutInstance()
        spacer.widthAnchor.constraint(equalToConstant: 0).isActive = true
        stackView.addArrangedSubview(spacer)

        stackView.addArrangedSubview(iconView)

        titleLabel.textColor = .black

        descriptionLabel.textColor = .black
        descriptionLabel.font = UIFont.openSansLight(size: 12)

        let textStackView = UIStackView(arrangedSubviews: [titleLabel, descriptionLabel])
        textStackView.translatesAutoresizingMaskIntoConstraints = false
        textStackView.axis = .vertical
        textStackView.layoutMargins = UIEdgeInsets(top: 12, left: 0, bottom: 12, right: 0)
        textStackView.isLayoutMarginsRelativeArrangement = true
        stackView.addArrangedSubview(textStackView)

        let button = UIButton.autolayoutInstance()
        button.setImage(#imageLiteral(resourceName: "JobPostingDisclosure"), for: .normal)
        button.addTarget(self, action: #selector(onDisclosurePressed), for: .touchUpInside)
        stackView.addArrangedSubview(button)

        NSLayoutConstraint.attachToSuperview(view: stackView)
        NSLayoutConstraint.activate([
            iconView.widthAnchor.constraint(equalTo: heightAnchor, multiplier: 0.7),
            button.widthAnchor.constraint(equalToConstant: 44)
        ])
    }

    func update(jobPosting: JobPosting, title: String? = nil) {
        if title != nil {
            titleLabel.text = title
        }

        switch type {
        case .search:
            titleLabel.numberOfLines = 1
            titleLabel.adjustsFontSizeToFitWidth = true
            titleLabel.minimumScaleFactor = 0.5
            titleLabel.font = UIFont.openSansSemiBold(size: 14)

            descriptionLabel.numberOfLines = 1

            heightAnchor.constraint(equalToConstant: 68).isActive = true
        case .conversations:
            titleLabel.numberOfLines = 0
            titleLabel.font = UIFont.openSansSemiBold(size: 17)

            descriptionLabel.numberOfLines = 0
        case .chatPostedJob:
            titleLabel.numberOfLines = 1
            titleLabel.adjustsFontSizeToFitWidth = true
            titleLabel.minimumScaleFactor = 0.5
            descriptionLabel.text = jobPosting.searchForm.description

            iconView.animationImages = (0..<30).compactMap { UIImage(named: "RadarWhite\($0)") }
            iconView.startAnimating()
            return
        }

        switch jobPosting.state {
        case .initial:
            if jobPosting.handleStartTimeExceed ?? false {
                titleLabel.text = "Should we keep notifying babysitters?".localized
                descriptionLabel.text = jobPosting.searchForm.description
            } else if jobPosting.availableBabysittersCount == 0 {
                titleLabel.text = "Notifying babysitters".localized
                descriptionLabel.text = jobPosting.searchForm.description
            } else {
                titleLabel.text = String(format: "%d available babysitters".localized, jobPosting.availableBabysittersCount)
                descriptionLabel.text = jobPosting.searchForm.description
            }

            iconView.animationImages = (0..<30).compactMap { UIImage(named: "RadarWhite\($0)") }
            iconView.startAnimating()
        case .finished:
            titleLabel.text = "Your search was stopped".localized
            if jobPosting.availableBabysittersCount == 0 {
                descriptionLabel.text = "We notified matching babysitters, but no one indicated they are available when you need someone.".localized
            } else {
                descriptionLabel.text = String(format: "%d available babysitters".localized, jobPosting.availableBabysittersCount)
            }

            iconView.animationImages = nil
            iconView.image = #imageLiteral(resourceName: "JobPostingPausedLarge")
        case .completedSuccessfully, .completedUnsuccessfully:
            break
        }
    }

    @objc func onDisclosurePressed() {
        disclosureActions()
    }
}
