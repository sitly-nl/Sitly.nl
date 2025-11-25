import UIKit

class PopUpView: UIView {
    enum ButtonType {
        case whiteWithBorder
        case primary

        func button(title: String, target: Any, selector: Selector) -> UIButton {
            let button = UIButton.autolayoutInstance()
            button.cornerRadius = 16
            switch self {
            case .whiteWithBorder:
                button.layer.borderWidth = 1
                button.layer.borderColor = UIColor.neutral900.cgColor
                button.setAttributedTitle(
                    NSAttributedString(
                        string: title,
                        attributes: [
                            .font: UIFont.openSansBold(size: 14),
                            .foregroundColor: UIColor.defaultText
                        ]),
                    for: .normal)
            case .primary:
                button.backgroundColor = .primary500
                button.setAttributedTitle(
                    NSAttributedString(
                        string: title,
                        attributes: [
                            .font: UIFont.openSansBold(size: 14),
                            .foregroundColor: UIColor.white
                        ]),
                    for: .normal)
            }
            button.addTarget(target, action: selector, for: .touchUpInside)
            button.heightAnchor.constraint(equalToConstant: 44).isActive = true
            return button
        }
    }

    let titleLabel = UILabel.autolayoutInstance()
    let descriptionContainer = UIView.autolayoutInstance()
    let buttonsContainer = UIStackView.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    convenience init(title: String, description: String, buttons: [UIButton], buttonsDirection: NSLayoutConstraint.Axis = .vertical) {
        let descriptionLabel = UILabel.autolayoutInstance()
        descriptionLabel.numberOfLines = 0
        descriptionLabel.font = UIFont.openSansLight(size: 14)
        descriptionLabel.textColor = .defaultText
        descriptionLabel.textAlignment = .center
        descriptionLabel.text = description

        self.init(title: title, customView: descriptionLabel, buttons: buttons, buttonsDirection: buttonsDirection)
    }

    init(title: String, customView: UIView, buttons: [UIButton], buttonsDirection: NSLayoutConstraint.Axis = .vertical) {
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false
        let contentInset = CGFloat(15)

        titleLabel.font = UIFont.openSansLight(size: 20)
        titleLabel.numberOfLines = 0
        titleLabel.textColor = .defaultText
        titleLabel.textAlignment = .center
        titleLabel.text = title
        addSubview(titleLabel)

        descriptionContainer.backgroundColor = .defaultBackground
        addSubview(descriptionContainer)

        descriptionContainer.addSubview(customView)

        buttonsContainer.axis = buttonsDirection
        buttonsContainer.spacing = 10
        buttonsContainer.distribution = .fillEqually
        buttons.forEach { buttonsContainer.addArrangedSubview($0) }
        addSubview(buttonsContainer)

        NSLayoutConstraint.attachToSuperviewHorizontally(view: titleLabel, inset: contentInset)
        NSLayoutConstraint.attachToSuperviewHorizontally(view: descriptionContainer)
        NSLayoutConstraint.attachToSuperview(view: customView, horizontalInset: contentInset, verticalInset: contentInset)
        NSLayoutConstraint.attachToSuperviewHorizontally(view: buttonsContainer, inset: contentInset)

        NSLayoutConstraint.activate(NSLayoutConstraint.constraints(
            withVisualFormat: "V:|-11-[titleLabel]-14-[descriptionContainer]-\(contentInset)-[buttonsContainer]-\(contentInset)-|",
            options: [],
            metrics: nil,
            views: ["titleLabel": titleLabel, "descriptionContainer": descriptionContainer, "buttonsContainer": buttonsContainer]
        ))
    }
}
