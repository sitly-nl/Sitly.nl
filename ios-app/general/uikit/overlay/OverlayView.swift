import UIKit

class OverlayView: UIView {
    struct Action {
        let title: String
        var action: (() -> Void)?
    }

    private let button0 = UIButton.autolayoutInstance()
    private let button1 = UIButton.autolayoutInstance()
    private var on0Selected: (() -> Void)?
    private var on1Selected: (() -> Void)?

    required init?(coder aDecoder: NSCoder) { fatalError("init(coder:) has not been implemented") }
    init(title: String, firstAction: Action, secondAction: Action) {
        super.init(frame: .zero)
        translatesAutoresizingMaskIntoConstraints = false

        on0Selected = firstAction.action
        on1Selected = secondAction.action

        let titleLabel = UILabel.autolayoutInstance()
        titleLabel.numberOfLines = 0
        titleLabel.font = UIFont.openSans(size: 14)
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.text = title
        addSubview(titleLabel)

        button0.backgroundColor = .clear
        button0.borderColor = .white
        button0.borderWidth = 1
        button0.cornerRadius = 16
        button0.titleLabel?.font = UIFont.openSansBold(size: 14)
        button0.setTitleColor(.white, for: .normal)
        button0.setTitle(firstAction.title, for: .normal)
        button0.addTarget(self, action: #selector(onButtonPressed(_:)), for: .touchUpInside)
        addSubview(button0)

        button1.backgroundColor = .primary500
        button1.cornerRadius = 16
        button1.titleLabel?.font = UIFont.openSansBold(size: 14)
        button1.setTitleColor(UIColor.white, for: .normal)
        button1.setTitle(secondAction.title, for: .normal)
        button1.addTarget(self, action: #selector(onButtonPressed(_:)), for: .touchUpInside)
        addSubview(button1)

        NSLayoutConstraint.attachToSuperviewHorizontally(view: titleLabel, inset: 20)
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: topAnchor, constant: 10),
            button0.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            button0.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -15),
            button0.trailingAnchor.constraint(equalTo: centerXAnchor, constant: -4),
            button0.heightAnchor.constraint(equalToConstant: 30),
            button0.widthAnchor.constraint(greaterThanOrEqualToConstant: 104),
            button1.topAnchor.constraint(equalTo: button0.topAnchor),
            button1.bottomAnchor.constraint(equalTo: button0.bottomAnchor),
            button1.leadingAnchor.constraint(equalTo: centerXAnchor, constant: 4),
            button1.widthAnchor.constraint(greaterThanOrEqualToConstant: 104)
        ])
    }

    @objc func onButtonPressed(_ sender: UIButton) {
        if sender == button0 {
            on0Selected?()
        } else if sender == button1 {
            on1Selected?()
        }
    }
}
