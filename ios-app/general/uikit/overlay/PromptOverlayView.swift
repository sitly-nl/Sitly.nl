import UIKit

class PromptOverlayView: UIView {
    let containerView = UIView.autolayoutInstance()
    var onActionSelected: (() -> Void)?

    private let imageView = UIImageView.autolayoutInstance()
    private let titleLabel = UILabel.autolayoutInstance()
    private let button = UIButton.autolayoutInstance()

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(image: UIImage, attributedTitle: NSAttributedString, buttonTitle: String) {
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false

        containerView.backgroundColor = .white
        addSubview(containerView)

        let topBorder = UIView.autolayoutInstance()
        topBorder.backgroundColor = .neutral100
        addSubview(topBorder)

        imageView.image = image
        imageView.setContentHuggingPriority(.required, for: .horizontal)
        addSubview(imageView)

        titleLabel.attributedText = attributedTitle
        titleLabel.numberOfLines = 0
        addSubview(titleLabel)

        button.cornerRadius = 2
        button.backgroundColor = .primary500
        button.titleLabel?.font = UIFont.openSansBold(size: 12)
        button.titleLabel?.adjustsFontSizeToFitWidth = true
        button.titleLabel?.minimumScaleFactor = 0.7
        button.setTitle("  " + buttonTitle + "  ", for: .normal)
        button.setTitleColor(UIColor.white, for: .normal)
        button.layer.cornerRadius = 16
        button.addTarget(self, action: #selector(onButtonPressed), for: .touchUpInside)
        addSubview(button)

        NSLayoutConstraint.attachToSuperviewHorizontally(view: containerView)
        NSLayoutConstraint.attachToSuperviewHorizontally(view: topBorder)
        NSLayoutConstraint.attachToSuperviewVertically(view: imageView)
        NSLayoutConstraint.activate([
            containerView.bottomAnchor.constraint(equalTo: bottomAnchor),
            topBorder.heightAnchor.constraint(equalToConstant: 1),
            topBorder.topAnchor.constraint(equalTo: containerView.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 33),
            imageView.widthAnchor.constraint(greaterThanOrEqualTo: self.widthAnchor, multiplier: 0.33),
            imageView.widthAnchor.constraint(equalTo: imageView.heightAnchor, multiplier: image.size.width / image.size.height),
            titleLabel.leadingAnchor.constraint(equalTo: imageView.trailingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),
            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 10),
            button.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 7),
            button.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            button.heightAnchor.constraint(equalToConstant: 30),
            button.centerXAnchor.constraint(equalTo: titleLabel.centerXAnchor),
            button.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -5)
        ])
    }

    @objc func onButtonPressed() {
        onActionSelected?()
    }
}
