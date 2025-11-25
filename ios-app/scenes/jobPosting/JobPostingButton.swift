import UIKit

class JobPostingButton: UIView {
    enum ViewType {
        case original
        case withCloseButton
        case collapsed
        case disabled
    }

    var mainButtonPressed: ( () -> Void )?
    var closeButtonPressed: ( () -> Void )?
    private(set) var type = ViewType.original

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)

        cornerRadius = 20
        addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(onButtonPressed)))
    }

    private lazy var stackView: UIStackView = { [weak self] in
        self?.addSubview($0)
        NSLayoutConstraint.attachToSuperview(view: $0)
        if let strongSelf = self {
            $0.addArrangedSubview(strongSelf.radarView)
            $0.addArrangedSubview(strongSelf.label)
            $0.addArrangedSubview(strongSelf.separator)
            $0.addArrangedSubview(strongSelf.closeButton)
        }
        return $0
    }(UIStackView.autolayoutInstance())
    private lazy var radarView: UIImageView = {
        $0.contentMode = .scaleAspectFit
        $0.animationImages = (0..<30).compactMap { UIImage(named: "RadarWhite\($0)") }
        $0.startAnimating()
        $0.widthAnchor.constraint(equalToConstant: 40).isActive = true
        return $0
    }(UIImageView.autolayoutInstance())
    private lazy var label: UILabel = {
        $0.textColor = .white
        $0.font = UIFont.openSansBold(size: 14)
        $0.text = "Find someone quickly".localized + "  "
        return $0
    }(UILabel.autolayoutInstance())
    private lazy var separator: UIView = {
        $0.backgroundColor = .white
        $0.widthAnchor.constraint(equalToConstant: 0.5).isActive = true
        return $0
    }(UIView.autolayoutInstance())
    private lazy var closeButton: UIButton = {
        $0.setImage(#imageLiteral(resourceName: "JobPostingClose"), for: .normal)
        $0.widthAnchor.constraint(equalToConstant: 40).isActive = true
        $0.addTarget(self, action: #selector(onCloseButtonPressed), for: .touchUpInside)
        return $0
    }(UIButton.autolayoutInstance())

// MARK: - Actions
    @objc private func onButtonPressed() {
        mainButtonPressed?()
    }

    @objc private func onCloseButtonPressed() {
        closeButtonPressed?()
    }

    func update(type: ViewType) {
        self.type = type
        backgroundColor = .primary500
        switch type {
        case .original:
            stackView.arrangedSubviews.forEach { $0.isHidden = ($0 == closeButton) }
        case .withCloseButton:
            stackView.arrangedSubviews.forEach { $0.isHidden = false }
        case .collapsed:
            stackView.arrangedSubviews.forEach { $0.isHidden = ($0 != radarView) }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.166) {
                self.radarView.stopAnimating()
                self.radarView.image = #imageLiteral(resourceName: "RadarWhite")
            }
        case .disabled:
            backgroundColor = .neutral900
            stackView.arrangedSubviews.forEach { $0.isHidden = ($0 != radarView) }
            radarView.stopAnimating()
            radarView.image = #imageLiteral(resourceName: "RadarWhite")
        }
    }
}
