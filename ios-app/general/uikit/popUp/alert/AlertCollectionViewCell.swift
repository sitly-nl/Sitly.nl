import UIKit

class AlertCollectionViewCell: UICollectionViewCell {
    @IBOutlet weak var titleLabel: UILabel!

    func configure(action: AlertAction) {
        self.titleLabel.text = action.title
        self.titleLabel.textColor = .defaultText
        self.titleLabel.font = action.style.font
    }

    func setHighlighted(highlighted: Bool) {
        self.titleLabel.alpha = highlighted ? 0.5 : 1
    }
}
