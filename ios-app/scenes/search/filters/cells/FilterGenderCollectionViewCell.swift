import UIKit

class FilterGenderCollectionViewCell: FilterBaseCollectionViewCell, FilterCell, TitleToggleButtonDelegate {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var femaleView: TitleToggleButton!
    @IBOutlet weak var maleView: TitleToggleButton!
    var searchForm: SearchForm?
    weak var delegate: FilterDelegate?

    override func awakeFromNib() {
        super.awakeFromNib()

        titleLabel.text = "gender".localized
        femaleView.titleLabel.text = "female".localized
        maleView.titleLabel.text = "male".localized

        femaleView.delegate = self
        maleView.delegate = self
    }

    func viewForGender(gender: Gender) -> TitleToggleButton {
        if gender == .female {
            return femaleView
        }

        return maleView
    }

    // MARK: - FilterCell
    func configure(searchForm: SearchForm, delegate: FilterDelegate) {
        self.searchForm = searchForm
        self.delegate = delegate

        femaleView.configure(for: .normal)
        maleView.configure(for: .normal)

        searchForm.genders.forEach { gender in
            viewForGender(gender: gender).configure(for: .selected)
        }
    }

    // MARK: - TitleToggleButtonDelegate
    func didToggle(on: Bool, sender: TitleToggleButton) {
        guard let form = searchForm else {
            return
        }

        let gender = sender.isEqual(femaleView) ? Gender.female : Gender.male

        if on {
            form.genders.append(gender)
        } else {
            if let index = form.genders.firstIndex(of: gender) {
                form.genders.remove(at: index)
            }
        }
        delegate?.didUpdateFilter(searchForm: form)

        AnalyticsManager.logEvent(.filterClickGender, parameters: ["gender": form.genders.count > 1 ? "both" : form.genders.first?.rawValue ?? ""])
    }
}
