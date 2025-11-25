import UIKit

class FilterSpeaksLanguageCollectionViewCell: FilterBaseCollectionViewCell,
    UICollectionViewDataSource, UICollectionViewDelegateFlowLayout,
    FilterCell, TitleButtonCollectionViewCellDelegate {

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var languagesCollectionView: UICollectionView!
    @IBOutlet weak var heightConstraint: NSLayoutConstraint!
    var languages = [Language]()
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?
    let itemsInRow: CGFloat = 2
    let collectionViewCellHeight: CGFloat = 35
    let lineSpacing: CGFloat = 8

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "shouldSpeak".localized
        languagesCollectionView.registerNib(ofType: TitleButtonCollectionViewCell.self)

        if let layout = languagesCollectionView.collectionViewLayout as? UICollectionViewFlowLayout {
            layout.minimumLineSpacing = lineSpacing
        }
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate
        languages = searchForm.availableLanguages

        let cell = FilterSpeaksLanguageCollectionViewCell()
        let rows = ceil(CGFloat(languages.count) / cell.itemsInRow)
        heightConstraint.constant = rows * (cell.collectionViewCellHeight + cell.lineSpacing) + 80

        languagesCollectionView.reloadData()
    }

    // MARK: - UICollectionViewDataSource
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return languages.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: TitleButtonCollectionViewCell.self, for: indexPath)

        let language = languages[indexPath.item]
        let isSelected = searchForm?.speaksLanguages.contains(language) ?? false
        cell.configure(text: language.name, state: isSelected ? .selected : .normal, delegate: self)

        return cell
    }

    // MARK: - UICollectionViewDelegateFlowLayout
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        let spacing = (collectionViewLayout as? UICollectionViewFlowLayout)?.minimumInteritemSpacing ?? 0
        let width = (frame.width - 2 * 16 - ((itemsInRow - 1) * spacing)) / itemsInRow
        return CGSize(width: width, height: collectionViewCellHeight)
    }

    // MARK: - TitleButtonCollectionViewCellDelegate
    func didToggle(on: Bool, button: TitleToggleButton, cell: TitleButtonCollectionViewCell) {
        if let index = languagesCollectionView.indexPath(for: cell) {
            if on {
                searchForm?.speaksLanguages.append(languages[index.item])
                AnalyticsManager.logEvent(.filterClickLanguage, parameters: ["Selected_language": languages[index.item].code])
            } else {
                if let storedIndex = searchForm?.speaksLanguages.firstIndex(of: languages[index.item]) {
                    searchForm?.speaksLanguages.remove(at: storedIndex)
                }
            }
        }

        delegate?.didUpdateFilter(searchForm: searchForm)
    }
}
