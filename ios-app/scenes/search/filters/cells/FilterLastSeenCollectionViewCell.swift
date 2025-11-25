import UIKit

class FilterLastSeenCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SelectorViewDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var distanceSelectorView: SelectorView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?
    let values = SearchForm.LastSeen.allCases

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "Last seen online".localized
        distanceSelectorView.delegate = self
        distanceSelectorView.replaceTitleWithValue = true
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        distanceSelectorView.configure(value: searchForm.lastSeen.localized, values: values.map { $0.localized })
    }

    // MARK: - SelectorViewDelegate
    func doneWithSelected(index: Int, sender: SelectorView) {
        guard let form = searchForm else {
            return
        }

        form.lastSeen = values[index]
        delegate?.didUpdateFilter(searchForm: form)
    }
}
