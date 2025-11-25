import UIKit

class AskRecommendationInfoViewController: PopUpContainerViewController {
    var okPressed: (() -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()

        let stackView = UIStackView(arrangedSubviews: [
            viewFor(index: 1, text: "popUp.recommendation.info.text.1".localized),
            viewFor(index: 2, text: "popUp.recommendation.info.text.2".localized),
            viewFor(index: 3, text: "popUp.recommendation.info.text.3".localized)
        ])
        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .vertical
        stackView.spacing = 30
        stackView.layoutIfNeeded()

        let scrollView = UIScrollView.autolayoutInstance()
        scrollView.addSubview(stackView)
        NSLayoutConstraint.attachToSuperview(view: stackView)
        NSLayoutConstraint.activate([
            stackView.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            scrollView.heightAnchor.constraint(equalToConstant: min(0.55*UIScreen.main.bounds.height, 350))
        ])

        let popUpView = PopUpView(
            title: "popUp.recommendation.info.title".localized,
            customView: scrollView,
            buttons: [
                PopUpView.ButtonType.primary.button(
                    title: "popUp.recommendation.info.action".localized,
                    target: self,
                    selector: #selector(onOkPressed))
            ])
        popUpView.titleLabel.font = UIFont.openSansSemiBold(size: 17)
        popUpView.descriptionContainer.backgroundColor = .clear
        loadViewToContainer(popUpView)
    }

    func viewFor(index: Int, text: String) -> UIView {
        let containerView = UIView.autolayoutInstance()

        let headerColor = UIColor.primary500
        let headerLabel = UILabel.autolayoutInstance()
        headerLabel.borderWidth = 2
        headerLabel.borderColor = headerColor
        headerLabel.cornerRadius = 13
        headerLabel.font = UIFont.openSansBold(size: 17)
        headerLabel.textAlignment = .center
        headerLabel.textColor = headerColor
        headerLabel.text = "\(index)"
        containerView.addSubview(headerLabel)

        let textLabel = UILabel.autolayoutInstance()
        textLabel.numberOfLines = 0
        textLabel.font = UIFont.openSansLight(size: 17)
        textLabel.textAlignment = .center
        textLabel.textColor =  .defaultText
        textLabel.text = text
        containerView.addSubview(textLabel)

        NSLayoutConstraint.attachToSuperviewHorizontally(view: textLabel)
        NSLayoutConstraint.activate([
            headerLabel.topAnchor.constraint(equalTo: containerView.topAnchor),
            headerLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            headerLabel.heightAnchor.constraint(equalToConstant: 26),
            headerLabel.heightAnchor.constraint(equalTo: headerLabel.widthAnchor, multiplier: 1),
            textLabel.topAnchor.constraint(equalTo: headerLabel.bottomAnchor, constant: 8),
            textLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
        ])

        return containerView
    }

// MARK: - Actions
    @objc func onOkPressed() {
        dismiss(animated: true) {
            self.okPressed?()
        }
    }
}
