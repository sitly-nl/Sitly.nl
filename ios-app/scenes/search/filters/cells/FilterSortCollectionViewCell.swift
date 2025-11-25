import UIKit

class FilterSortCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SelectorViewDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var selectorView: SelectorView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?
    var values = [SearchForm.SortType]()

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "Sorting".localized
        selectorView.titleLabel.text = "sortBy".localized
        selectorView.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate
        values = searchForm.sortOptions

        selectorView.configure(value: searchForm.sort.localized, values: values.map { $0.localized })
    }

    // MARK: - SelectorViewDelegate
    func doneWithSelected(index: Int, sender: SelectorView) {
        searchForm?.sort = values[index]
        delegate?.didUpdateFilter(searchForm: searchForm)
        delegate?.reloadDate()

        var sortType = "last online"
        if values[index] == .created {
            sortType = "newest"
        } else if values[index] == .distance {
            sortType = "nearest"
        }
        AnalyticsManager.logEvent(.filterClickSort, parameters: ["sort_by": sortType])
    }
}
