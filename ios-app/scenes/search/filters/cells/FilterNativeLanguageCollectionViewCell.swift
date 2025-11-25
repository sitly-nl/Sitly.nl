import UIKit

class FilterNativeLanguageCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SelectorViewDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var selectorView: SelectorView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?
    var languages = [Language?]()

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "language".localized
        selectorView.titleLabel.text = "nativeLanguage".localized
        selectorView.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate
        languages = [nil] + searchForm.nativeLanguages
        selectorView.configure(
            value: searchForm.nativeLanguage?.name ?? "no preferences".localized,
            values: languages.map { $0?.name ?? "no preferences".localized }
        )
    }

    // MARK: - SelectorViewDelegate
    func doneWithSelected(index: Int, sender: SelectorView) {
        searchForm?.nativeLanguage = languages[index]
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickNativeLanguage, parameters: ["Selected_language": languages[index]?.code ?? "no preferences"])
    }
}
