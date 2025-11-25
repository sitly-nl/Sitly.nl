import UIKit

class CheckboxTitleView: UIView {
    weak var delegate: CheckboxDelegate?
    var isSelected: Bool {
        return !checkmarkImage.isHidden
    }

    private(set) var titleLabel = UILabel.autolayoutInstance()
    private(set) var checkmarkView = UIView.autolayoutInstance()

    private var checkmarkImage = UIImageView(image: .checkmarkWhite)
    private var tapGestureRecognizer: UITapGestureRecognizer?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        setUpView()
    }

    override var intrinsicContentSize: CGSize {
        return CGSize(width: UIView.noIntrinsicMetric, height: 40)
    }

    private func setUpView() {
        layer.cornerRadius = 3
        layer.masksToBounds = true
        layer.borderWidth = 1
        layer.borderColor = UIColor.neutral900.cgColor

        backgroundColor = .white

        checkmarkView.layer.cornerRadius = 2
        checkmarkView.layer.masksToBounds = true
        checkmarkView.layer.borderWidth = 1
        addSubview(checkmarkView)

        titleLabel.numberOfLines = 2
        titleLabel.textColor = .defaultText
        addSubview(titleLabel)

        checkmarkImage.translatesAutoresizingMaskIntoConstraints = false
        checkmarkView.layer.borderColor = UIColor.neutral900.cgColor
        checkmarkView.addSubview(checkmarkImage)

        addConstraints(NSLayoutConstraint.constraints(
            withVisualFormat: "H:|-12-[titleLabel]-6-[checkmarkViewContainer(18)]-12-|",
            options: [],
            metrics: nil,
            views: ["titleLabel": titleLabel, "checkmarkViewContainer": checkmarkView]))
        NSLayoutConstraint.attachToSuperviewVertically(view: titleLabel, inset: 10)
        NSLayoutConstraint.activate([
            checkmarkView.heightAnchor.constraint(equalToConstant: 18),
            checkmarkView.topAnchor.constraint(equalTo: topAnchor, constant: 11),
            checkmarkImage.centerYAnchor.constraint(equalTo: checkmarkView.centerYAnchor),
            checkmarkImage.centerXAnchor.constraint(equalTo: checkmarkView.centerXAnchor)
        ])

        configure(for: .normal)

        let recognizer = UITapGestureRecognizer(target: self, action: #selector(toggle(sender:)))
        addGestureRecognizer(recognizer)
        tapGestureRecognizer = recognizer
    }

    func configure(for state: UIControl.State) {
        let disabled = state == .disabled
        tapGestureRecognizer?.isEnabled = !disabled
        alpha = disabled ? 0.5 : 1

        switch state {
        case .selected:
            titleLabel.font = UIFont.openSansBold(size: 14)
            checkmarkView.backgroundColor = .neutral900
            checkmarkImage.isHidden = false
        default:
            titleLabel.font = UIFont.openSans(size: 14)
            checkmarkView.backgroundColor = .white
            checkmarkImage.isHidden = true
        }
    }

    // MARK: - Actions
    @objc func toggle(sender: UITapGestureRecognizer) {
        configure(for: isSelected ? .normal : .selected)
        delegate?.didToggleCheck(on: isSelected, sender: self)
    }

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { view in
            view.alpha = 0.5
        }
    }

    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { view in
            view.alpha = 1
        }
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        subviews.forEach { view in
            view.alpha = 1
        }
    }
}
