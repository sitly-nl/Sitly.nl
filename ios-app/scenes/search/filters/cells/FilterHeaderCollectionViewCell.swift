import UIKit

class FilterHeaderCollectionViewCell: FilterBaseCollectionViewCell, FilterCell {
    @IBOutlet weak var titleLabel: UILabel!

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "filters".localized
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
    }
}
