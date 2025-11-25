import UIKit

class FilterDistanceCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SelectorViewDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var distanceSelectorView: SelectorView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?
    let values = [nil, 1, 2, 3, 4, 5, 10, 20, 30]

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "distance".localized
        distanceSelectorView.titleLabel.text = "maximumDistance".localized
        distanceSelectorView.delegate = self
    }

    private func distanceStringRepresentation(_ distance: Int?) -> String {
        if let distance {
            return "\(distance) km"
        } else {
            return "no preferences".localized
        }
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        distanceSelectorView.configure(
            value: distanceStringRepresentation(searchForm.maxDistance),
            values: values.map { distanceStringRepresentation($0) })
    }

    // MARK: - SelectorViewDelegate
    func doneWithSelected(index: Int, sender: SelectorView) {
        guard let form = searchForm else {
            return
        }

        form.maxDistance = values[index]
        delegate?.didUpdateFilter(searchForm: form)

        if let distance = values[index] {
            AnalyticsManager.logEvent(.filterClickDistance, parameters: ["distance": "\(distance)km"])
        } else {
            AnalyticsManager.logEvent(.filterClickDistance, parameters: ["distance": "no preferences"])
        }
    }
}
