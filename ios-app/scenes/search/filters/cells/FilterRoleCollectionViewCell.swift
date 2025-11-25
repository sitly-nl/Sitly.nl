import UIKit

class FilterRoleCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, SegmentedControlDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var segmentedControl: SegmentedControl!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "showMe".localized
        segmentedControl.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate
        segmentedControl.segments = searchForm.userRoles.map { $0.localized }

        let index = searchForm.userRoles.firstIndex(of: searchForm.role) ?? 0
        segmentedControl.setSelectedSegment(index: index)
    }

    // MARK: - SegmentedControlDelegate
    func didSelectSegment(index: Int) {
        if let role = searchForm?.userRoles[index] {
            searchForm?.role = role
            delegate?.didUpdateFilter(searchForm: searchForm, switchedRole: true)
            AnalyticsManager.logEvent(.filterClickShowMe, parameters: ["show_me": role.rawValue + " only"])
        }
    }
}
