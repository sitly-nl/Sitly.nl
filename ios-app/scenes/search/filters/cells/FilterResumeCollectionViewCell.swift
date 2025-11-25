import UIKit

class FilterResumeCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, CheckboxDelegate {
    @IBOutlet private weak var titleLabel: UILabel!
    @IBOutlet private weak var educationCheckbox: CheckboxTitleView!
    @IBOutlet private weak var experienceCheckbox: CheckboxTitleView!
    @IBOutlet private weak var referencesCheckbox: CheckboxTitleView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "resumé".localized
        educationCheckbox.titleLabel.text = "shouldHaveEducation".localized
        experienceCheckbox.titleLabel.text = "relevantExperience".localized
        referencesCheckbox.titleLabel.text = "shouldHaveReferences".localized
        educationCheckbox.delegate = self
        experienceCheckbox.delegate = self
        referencesCheckbox.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        educationCheckbox.isHidden = searchForm.role != .childminder
        educationCheckbox.configure(for: searchForm.hasEducation ? .selected : .normal)
        experienceCheckbox.configure(for: searchForm.hasExperience ? .selected : .normal)
        referencesCheckbox.configure(for: searchForm.hasReferences ? .selected : .normal)
    }

    // MARK: - CheckboxDelegate
    func didToggleCheck(on: Bool, sender: UIView) {
        if sender.isEqual(experienceCheckbox) {
            searchForm?.hasExperience = on
            AnalyticsManager.logEvent(.filterClickExperience, parameters: ["experience": on ? "Y" : "N"])
        } else if sender.isEqual(referencesCheckbox) {
            searchForm?.hasReferences = on
            AnalyticsManager.logEvent(.filterClickReferences, parameters: ["references": on ? "Y" : "N"])
        } else if sender.isEqual(educationCheckbox) {
            searchForm?.hasEducation = on
        }

        delegate?.didUpdateFilter(searchForm: searchForm)
    }
}
