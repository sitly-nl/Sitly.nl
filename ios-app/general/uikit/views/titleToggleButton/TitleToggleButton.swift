import UIKit

class TitleToggleButton: UIView {
    private(set) var titleLabel = UILabel()
    private var state = UIControl.State.normal
    weak var delegate: TitleToggleButtonDelegate?

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    var isOn: Bool {
        get { return state == .selected }
        set { configure(for: newValue ? .selected : .normal) }
    }

    private func setUpView() {
        layer.borderWidth = 1
        layer.cornerRadius = 3
        layer.masksToBounds = true
        layer.borderColor = UIColor.neutral900.cgColor

        titleLabel.textAlignment = .center
        titleLabel.adjustsFontSizeToFitWidth = true
        titleLabel.minimumScaleFactor = 0.5
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        addSubview(titleLabel)
        NSLayoutConstraint.addToAllCorners(titleLabel, toItem: self, horizontalMargin: 5)

        configure(for: .normal)

        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(toggle(sender:))))
    }

    func configure(for state: UIControl.State) {
        self.state = state
        if state == .selected {
            backgroundColor = .neutral900
            titleLabel.font = UIFont.openSansBold(size: 14)
            titleLabel.textColor = .white
        } else {
            backgroundColor = .white
            titleLabel.font = UIFont.openSans(size: 14)
            titleLabel.textColor = .defaultText
        }
    }

    // MARK: - Actions
    @objc func toggle(sender: UITapGestureRecognizer) {
        configure(for: self.state == .selected ? .normal : .selected)
        delegate?.didToggle(on: self.state == .selected, sender: self)
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
