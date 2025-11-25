import UIKit

class FilterChildrenCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SelectorViewDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var selectorView: SelectorView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "children".localized
        selectorView.titleLabel.text = "maxNrOfChildren".localized
        selectorView.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        let values = Array(1...5).map { "\($0)" }
        let value = values.first { $0.equalsIgnoreCase(String(searchForm.childrenAmount)) }

        selectorView.configure(value: value, values: values)
    }

    // MARK: - SelectorViewDelegate
    func doneWithSelected(index: Int, sender: SelectorView) {
        if let amount = Int(selectorView.values[index]) {
            searchForm?.childrenAmount = amount
            delegate?.didUpdateFilter(searchForm: searchForm)
            AnalyticsManager.logEvent(.filterClickMaxNumberOfChildren, parameters: ["max_children": "\(amount)"])
        }
    }
}
