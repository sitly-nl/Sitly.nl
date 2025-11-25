import UIKit

class FilterAgeCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, RangeSliderDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var slider: RangeSlider!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()
        titleLabel.text = "ageRange".localized
        slider.minimumTitleLabel.text = "minShort".localized
        slider.maximumTitleLabel.text = "maxShort".localized
        slider.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        slider.configure(min: 0, max: 15, currentMin: searchForm.childrenMinAge, currentMax: searchForm.childrenMaxAge)
    }

    // MARK: - RangeSliderDelegate
    func didSlideMin(value: Int) {
        searchForm?.childrenMinAge = value
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickChildrenAgerRange, parameters: ["age_range_min": value])
    }

    func didSlideMax(value: Int) {
        searchForm?.childrenMaxAge = value
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickChildrenAgerRange, parameters: ["age_range_max": value])
    }
}
