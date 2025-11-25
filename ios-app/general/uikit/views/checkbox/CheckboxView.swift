import UIKit

class CheckboxView: UIView {
    private var checkmarkViewContainer = UIView()
    private var checkmarkImage = UIImageView(image: .checkmarkWhite)
    private var state = UIControl.State.normal
    weak var delegate: CheckboxDelegate?

    override init(frame: CGRect) {
        super.init(frame: frame)

        setUpView()
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        setUpView()
    }

    private func setUpView() {
        layer.cornerRadius = 3
        layer.masksToBounds = true

        checkmarkViewContainer.layer.borderWidth = 1
        checkmarkViewContainer.layer.cornerRadius = 2
        checkmarkViewContainer.layer.masksToBounds = true

        checkmarkViewContainer.translatesAutoresizingMaskIntoConstraints = false
        checkmarkImage.translatesAutoresizingMaskIntoConstraints = false
        checkmarkViewContainer.layer.borderColor = UIColor.neutral900.cgColor
        addSubview(checkmarkViewContainer)
        checkmarkViewContainer.addSubview(checkmarkImage)

        NSLayoutConstraint.centerView(checkmarkViewContainer, toItem: self, width: 18, height: 18)
        NSLayoutConstraint.centerView(checkmarkImage, toItem: checkmarkViewContainer)

        configure(for: .normal)

        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(toggle(sender:))))
    }

    func configure(for state: UIControl.State) {
        self.state = state
        if state == .selected {
            layer.borderWidth = 1
            backgroundColor = .white
            layer.borderColor = UIColor.neutral900.cgColor
            checkmarkImage.isHidden = false
            checkmarkViewContainer.backgroundColor = .neutral900
            return
        }

        layer.borderWidth = 0
        backgroundColor = .white
        layer.borderColor = UIColor.neutral500.cgColor
        checkmarkImage.isHidden = true
        checkmarkViewContainer.backgroundColor = .white
    }

    // MARK: - Actions
    @objc func toggle(sender: UITapGestureRecognizer) {
        configure(for: self.state == .selected ? .normal : .selected)
        delegate?.didToggleCheck(on: self.state == .selected, sender: self)
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
