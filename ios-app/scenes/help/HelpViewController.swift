import UIKit

class HelpViewController: BaseViewController, HelpView {
    var presenter: HelpPresenterProtocol?

    var categories = [HelpCategory]()
    var expanded = IndexPath()
    var contactUrl: URL?

    @IBOutlet weak var helpTableView: UITableView!
    override class var storyboard: UIStoryboard {
        return .profile
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        presenter?.getContactUrl()
        modalPresentationCapturesStatusBarAppearance = true
        view.backgroundColor = .white

        var category1 = HelpCategory()
        category1.name = "faqCategory1".localized

        if presenter?.currentUser?.isParent ?? false {
            category1.questions.append(HelpQuestion(question: "faqQuestion1".localized, answer: "faqAnswer1".localized, category: category1))
        }
        category1.questions.append(HelpQuestion(question: "faqQuestion2".localized, answer: "faqAnswer2".localized, category: category1))
        category1.questions.append(HelpQuestion(question: "faqQuestion3".localized, answer: "faqAnswer3".localized, category: category1))
        category1.questions.append(HelpQuestion(question: "faqQuestion4".localized, answer: "faqAnswer4".localized, category: category1))

        var category2 = HelpCategory()
        category2.name = "faqCategory2".localized
        category2.questions.append(HelpQuestion(question: "faqQuestion5".localized, answer: "faqAnswer5".localized, category: category1))
        category2.questions.append(HelpQuestion(question: "faqQuestion6".localized, answer: "faqAnswer6".localized, category: category1))

        categories = [category1, category2]

        helpTableView.reloadData()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    @IBAction func back(_ sender: Any) {
        navigationController?.popViewController(animated: true)
    }
}

// MARK: UITableViewDataSource
extension HelpViewController: UITableViewDataSource {
    func numberOfSections(in tableView: UITableView) -> Int {
        // + 2 for the title cell and contact cell
        return categories.count + 2
    }

    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        if section == 0 || section + 1 == numberOfSections(in: tableView) {
            return 1
        } else {
            return categories[section - 1].questions.count + 1
        }
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        if indexPath.section == 0 {
            let cell = tableView.dequeueReusableCell(ofType: HelpTitleTableViewCell.self, for: indexPath)
            return cell
        } else if indexPath.section + 1 == numberOfSections(in: tableView) {
            let cell = tableView.dequeueReusableCell(ofType: HelpContactTableViewCell.self, for: indexPath)
            cell.url = contactUrl
            return cell
        } else {
            let category = categories[indexPath.section - 1]

            if indexPath.row == 0 {
                let cell = tableView.dequeueReusableCell(ofType: HelpCategoryTableViewCell.self, for: indexPath)
                cell.configure(category: category)
                return cell
            } else {
                let cell = tableView.dequeueReusableCell(ofType: HelpQuestionTableViewCell.self, for: indexPath)
                let question = category.questions[indexPath.row - 1]
                cell.configure(question: question, expanded: expanded == indexPath, isLast: category.questions.count == indexPath.row)
                return cell
            }
        }
    }
}

// MARK: UITableViewDelegate
extension HelpViewController: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let cell = self.tableView(tableView, cellForRowAt: indexPath)

        if cell is HelpQuestionTableViewCell {
            let previousIndexPath = expanded
            var rows = [indexPath]

            expanded = indexPath

            if previousIndexPath == indexPath {
                expanded = IndexPath()
            } else if !previousIndexPath.isEmpty {
                rows.append(previousIndexPath)
            }

            tableView.reloadRows(at: rows, with: .automatic)
        }
    }

    func tableView(_ tableView: UITableView, shouldHighlightRowAt indexPath: IndexPath) -> Bool {
        return true
    }
}
