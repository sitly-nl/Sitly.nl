import UIKit

class SavedUserInfo {
    private var lastFlashDate: Date?
    private let overlay = UIView.autolayoutInstance()

    init(parentView: UIView) {
        overlay.cornerRadius = 2
        overlay.backgroundColor = .neutral300.withAlphaComponent(0.85)

        let checkmarkImageView = UIImageView.autolayoutInstance()
        checkmarkImageView.image = #imageLiteral(resourceName: "SavedCheckmark")
        overlay.addSubview(checkmarkImageView)

        let label = UILabel.autolayoutInstance()
        label.font = UIFont.openSansLight(size: 12)
        label.textColor = .defaultText
        label.text = "saved".localized
        overlay.addSubview(label)

        parentView.addSubview(overlay)

        NSLayoutConstraint.activate([
            checkmarkImageView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            checkmarkImageView.leadingAnchor.constraint(equalTo: overlay.leadingAnchor, constant: 6),
            label.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            checkmarkImageView.trailingAnchor.constraint(equalTo: label.leadingAnchor, constant: -6),
            label.trailingAnchor.constraint(equalTo: overlay.trailingAnchor, constant: -6),
            overlay.centerXAnchor.constraint(equalTo: parentView.centerXAnchor),
            overlay.topAnchor.constraint(
                equalTo: parentView.topAnchor,
                constant: (UIApplication.shared.statusBarFrame?.height ?? 0) + 2
            ),
            overlay.heightAnchor.constraint(equalToConstant: 20)
        ])
    }

    func flash() {
        if let date = lastFlashDate, Date().timeIntervalSince(date) < 5 {
            return
        }

        lastFlashDate = Date()
        overlay.alpha = 0
        UIView.animate(withDuration: UIView.defaultAnimationDuration, animations: {
            self.overlay.alpha = 1
        }, completion: { _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 2, execute: {
                UIView.animate(withDuration: UIView.defaultAnimationDuration) {
                    self.overlay.alpha = 0
                }
            })
        })
    }
}
