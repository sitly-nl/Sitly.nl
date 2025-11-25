import UIKit

class FilterChoresCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, CheckboxDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var homeworkCheckbox: CheckboxTitleView!
    @IBOutlet weak var groceriesCheckbox: CheckboxTitleView!
    @IBOutlet weak var cookCheckbox: CheckboxTitleView!
    @IBOutlet weak var driveCheckbox: CheckboxTitleView!
    @IBOutlet weak var householdChoresCheckbox: CheckboxTitleView!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "filters.cell.chores.title".localized
        homeworkCheckbox.titleLabel.text = ChoreType.homework.localized
        groceriesCheckbox.titleLabel.text = ChoreType.shopping.localized
        cookCheckbox.titleLabel.text = ChoreType.cooking.localized
        driveCheckbox.titleLabel.text = ChoreType.driving.localized
        householdChoresCheckbox.titleLabel.text = ChoreType.chores.localized

        homeworkCheckbox.delegate = self
        groceriesCheckbox.delegate = self
        cookCheckbox.delegate = self
        driveCheckbox.delegate = self
        householdChoresCheckbox.delegate = self
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        homeworkCheckbox.configure(for: searchForm.chores.homework ? .selected : .normal)
        groceriesCheckbox.configure(for: searchForm.chores.shopping ? .selected : .normal)
        cookCheckbox.configure(for: searchForm.chores.cooking ? .selected : .normal)
        driveCheckbox.configure(for: searchForm.chores.driving ? .selected : .normal)
        householdChoresCheckbox.configure(for: searchForm.chores.chores ? .selected : .normal)
    }

    // MARK: - CheckboxDelegate
    func didToggleCheck(on: Bool, sender: UIView) {
        if sender.isEqual(homeworkCheckbox) {
            searchForm?.chores.homework = on
        } else if sender.isEqual(groceriesCheckbox) {
            searchForm?.chores.shopping = on
        } else if sender.isEqual(cookCheckbox) {
            searchForm?.chores.cooking = on
        } else if sender.isEqual(driveCheckbox) {
            searchForm?.chores.driving = on
        } else if sender.isEqual(householdChoresCheckbox) {
            searchForm?.chores.chores = on
        }

        delegate?.didUpdateFilter(searchForm: searchForm)
    }
}
