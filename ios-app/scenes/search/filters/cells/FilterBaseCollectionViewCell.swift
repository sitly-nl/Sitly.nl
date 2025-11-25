import UIKit

class FilterBaseCollectionViewCell: UICollectionViewCell {
    override func awakeFromNib() {
        super.awakeFromNib()

        let widthConstraint = contentView.widthAnchor.constraint(equalToConstant: UIScreen.main.bounds.width)
        widthConstraint.priority = UILayoutPriority.defaultHigh
        widthConstraint.isActive = true
    }
}
