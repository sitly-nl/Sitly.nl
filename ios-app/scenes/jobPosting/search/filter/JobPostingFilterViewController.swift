import UIKit

class JobPostingFilterViewController: JobPostingBaseViewController, JobPostingFilterViewProtocol {
	var presenter: JobPostingFilterPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var collectionView: UICollectionView!
    @IBOutlet weak var notifyButton: UIButton!
    var filters: [FilterType] = [
        .description,
        .role,
        .gender,
        .ageGroup,
        .speaksLanguage
    ]

    override class var storyboard: UIStoryboard {
        return .jobPosting
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        titleLabel.text = "Any other criteria?".localized
        notifyButton.setTitle("Notify matching babysitters".localized, for: .normal)
        filters.forEach {
            collectionView.registerNib(identifier: String(describing: $0.collectionViewCell))
        }

        if let flowLayout = collectionView.collectionViewLayout as? UICollectionViewFlowLayout {
            flowLayout.estimatedItemSize = UICollectionViewFlowLayout.automaticSize
        }
    }

    @IBAction func onNotifyPressed() {
        presenter.notify()
    }
}

// MARK: - UICollectionViewDataSource
extension JobPostingFilterViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return filters.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: String(describing: filters[indexPath.item].collectionViewCell), for: indexPath)
        cell.isUserInteractionEnabled = Reachability.isOnline

        if let cell = cell as? FilterCell {
            cell.configure(searchForm: presenter.searchForm, delegate: self)
        }
        switch cell {
        case let cell as FilterDescriptionCollectionViewCell:
            cell.onEditPressed = presenter.editAvailability
        case let cell as FilterRoleCollectionViewCell:
            cell.titleLabel.text = "Looking for?".localized
        default:
            break
        }

        return cell
    }
}

// MARK: - FilterDelegate
extension JobPostingFilterViewController: FilterDelegate {
    func didUpdateFilter(searchForm: SearchForm?, switchedRole: Bool) {}

    func updateAvailability(_ availability: Availability) {}

    func reloadDate() {
        collectionView.reloadData()
    }
}
