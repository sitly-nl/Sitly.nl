import UIKit

class FilterHourlyRateCollectionViewCell: FilterBaseCollectionViewCell,
    FilterCell, UICollectionViewDataSource, UICollectionViewDelegateFlowLayout, TitleButtonCollectionViewCellDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var ratesCollectionView: UICollectionView!
    var hourlyRates = [HourlyRate]()
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "hourlyRate".localized
        ratesCollectionView.registerNib(ofType: TitleButtonCollectionViewCell.self)
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        ratesCollectionView.reloadData()
    }

    // MARK: - UICollectionViewDataSource
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return hourlyRates.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(ofType: TitleButtonCollectionViewCell.self, for: indexPath)

        var state = UIControl.State.normal

        if let isSelected = searchForm?.hourlyRates.contains(hourlyRates[indexPath.item]), isSelected {
            state = .selected
        }

        cell.configure(text: hourlyRates[indexPath.item].label, state: state, delegate: self)

        return cell
    }

    // MARK: - UICollectionViewDelegateFlowLayout
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        let itemsInRow: CGFloat = 3
        let spacing = (collectionViewLayout as? UICollectionViewFlowLayout)?.minimumInteritemSpacing ?? 0
        let width = (frame.width - 2 * 16 - ((itemsInRow - 1) * spacing)) / itemsInRow
        return CGSize(width: width.rounded(.down), height: 35)
    }

    // MARK: - TitleButtonCollectionViewCellDelegate
    func didToggle(on: Bool, button: TitleToggleButton, cell: TitleButtonCollectionViewCell) {
        if let index = ratesCollectionView.indexPath(for: cell) {
            let rate = hourlyRates[index.item]
            if on {
                searchForm?.hourlyRates.append(rate)
                AnalyticsManager.logEvent(.filterClickHourlyRate,
                                          parameters: ["hourly_rate": rate.value == "negotiable" ? "neg" : "\(index.item + 1)" ])
            } else {
                if let storedIndex = searchForm?.hourlyRates.firstIndex(of: rate) {
                    searchForm?.hourlyRates.remove(at: storedIndex)
                }
            }
        }

        delegate?.didUpdateFilter(searchForm: searchForm)
    }
}
