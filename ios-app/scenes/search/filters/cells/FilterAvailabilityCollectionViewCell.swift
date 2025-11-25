import UIKit

protocol DayAvailabilityCollectionViewCellDelegate: AnyObject {
    func didToggle(dayPart: DayPart, on: Bool, day: Day)
    func didToggle(day: Day, on: Bool)
}

class FilterAvailabilityCollectionViewCell: FilterBaseCollectionViewCell {
    weak var delegate: FilterDelegate?
    var searchForm: SearchForm?
    @IBOutlet weak var availabilityView: AvailabilityView!
}

// MARK: - FilterCell
extension FilterAvailabilityCollectionViewCell: FilterCell {
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.delegate = delegate
        self.searchForm = searchForm
        availabilityView.configure(delegate: self, type: .filter(searchForm: searchForm))
    }
}

extension FilterAvailabilityCollectionViewCell: AvailabilityViewDelegate {
    func didChangeAvailability(_ availability: Availability) {
        searchForm?.availability = availability
        delegate?.didUpdateFilter(searchForm: searchForm)
    }

    func didSwitchRegularAvailability(value: Bool) {
        searchForm?.regularCare = value
        delegate?.didUpdateFilter(searchForm: searchForm)
    }

    func didSwitchOccasionalAvailability(value: Bool) {
        searchForm?.occasionalCare = value
        delegate?.didUpdateFilter(searchForm: searchForm)
    }

    func didSwitchAfterScool(value: Bool) {
        searchForm?.hasAfterSchool = value
        delegate?.didUpdateFilter(searchForm: searchForm)
        AnalyticsManager.logEvent(.filterClickAvailabilityAfterScool, parameters: ["availability_after_school": value ? "Y" : "N"])
    }
}
