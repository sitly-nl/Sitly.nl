import UIKit

class FilterLocationCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, TitleToggleButtonDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var atHomeButton: TitleToggleButton!
    @IBOutlet weak var locationButton: TitleToggleButton!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "location".localized
        atHomeButton.titleLabel.text = "atHome".localized
        locationButton.titleLabel.text = "onLocation".localized
        atHomeButton.delegate = self
        locationButton.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        atHomeButton.configure(for: .normal)
        locationButton.configure(for: .normal)

        if searchForm.atHome {
            atHomeButton.configure(for: .selected)
        }
        if searchForm.onLocation {
            locationButton.configure(for: .selected)
        }
    }

    // MARK: - TitleToggleButtonDelegate
    func didToggle(on: Bool, sender: TitleToggleButton) {
        if sender.isEqual(atHomeButton) {
            searchForm?.atHome = on
        } else if sender.isEqual(locationButton) {
            searchForm?.onLocation = on
        }

        delegate?.didUpdateFilter(searchForm: searchForm)
    }
}
