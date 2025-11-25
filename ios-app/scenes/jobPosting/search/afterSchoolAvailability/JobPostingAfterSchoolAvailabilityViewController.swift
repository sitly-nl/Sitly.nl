import UIKit

class JobPostingAfterSchoolAvailabilityViewController: JobPostingBaseViewController, JobPostingAfterSchoolAvailabilityViewProtocol {
	var presenter: JobPostingAfterSchoolAvailabilityPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var stackView: UIStackView!
    private var buttons = [UIButton]()

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "When do you need after school care?".localized
        addNextButton()

        Day.allCases.forEach { addButton(title: $0.localized) }

        presenter.searchForm.afterSchoolDays.forEach {
            if let index = Day.allCases.firstIndex(of: $0) {
                buttons[index].isSelected = true
            }
        }
        updateView()
    }

    override func onNextPressed() {
        if selectedAnyDay() {
            presenter.searchForm.afterSchoolDays = buttons.enumerated().compactMap { $0.1.isSelected ? Day.allCases[$0.0] : nil }
            presenter.showNext?(presenter.searchForm)
        }
    }

    private func updateView() {
        setNextButtonEnabled(selectedAnyDay())
    }

    private func selectedAnyDay() -> Bool {
        return buttons.contains { $0.isSelected }
    }

    private func addButton(title: String) {
        let button = UIButton.autolayoutInstance()
        button.setTitle(title, for: .normal)
        button.setTitleColor(.defaultText, for: .normal)
        button.setTitleColor(.primary500, for: .selected)
        button.addTarget(self, action: #selector(onButtonPressed(sender:)), for: .touchUpInside)
        button.heightAnchor.constraint(equalToConstant: 44).isActive = true
        buttons.append(button)
        stackView.addArrangedSubview(button)
    }

    @objc private func onButtonPressed(sender: UIButton) {
        sender.isSelected = !sender.isSelected
        updateView()
    }
}
