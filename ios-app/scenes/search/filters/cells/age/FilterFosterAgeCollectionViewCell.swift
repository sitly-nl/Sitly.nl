import UIKit

class FilterFosterAgeCollectionViewCell: FilterAgeCollectionViewCell {
    override func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        slider.maxValueTitle = "\(SearchForm.defaultFosterMaxAge)+"
        slider.configure(min: searchForm.defaultFosterMinAge,
                         max: SearchForm.defaultFosterMaxAge,
                         currentMin: searchForm.fosterMinAge,
                         currentMax: searchForm.fosterMaxAge)
    }

// MARK: - RangeSliderDelegate
    override func didSlideMin(value: Int) {
        searchForm?.fosterMinAge = value
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickAgeRange, parameters: ["age_range_min": "\(value)"])
    }

    override func didSlideMax(value: Int) {
        searchForm?.fosterMaxAge = value
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickAgeRange, parameters: ["age_range_max": "\(value)"])
    }
}
