import UIKit

class FilterDescriptionCollectionViewCell: FilterBaseCollectionViewCell, FilterCell {
    @IBOutlet private weak var label: UILabel!
    @IBOutlet private weak var editButton: UIButton!
    weak var delegate: FilterDelegate?
    var onEditPressed: ( () -> Void )?

// MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.delegate = delegate
        label.text = "Looking for".localized + " " + searchForm.description
    }

// MARK: - Actions
    @IBAction func onEditButtonPressed() {
        onEditPressed?()
    }
}
