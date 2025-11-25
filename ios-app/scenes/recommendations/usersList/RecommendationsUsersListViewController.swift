import UIKit

class RecommendationsUsersListViewController: BaseViewController, RecommendationsUsersListViewProtocol {
	var presenter: RecommendationsUsersListPresenterProtocol!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var collectionView: UICollectionView!
    @IBOutlet weak var notOnSitlyButton: UIButton!

    override class var storyboard: UIStoryboard {
        return .recommendation
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        (collectionView.collectionViewLayout as? UICollectionViewFlowLayout)?.itemSize = CGSize(width: UIScreen.main.bounds.width - 2*15, height: 80)
        titleLabel.text = "recommendations.usersList.title".localized
        notOnSitlyButton.setTitle("   \("Not on Sitly / not in this list".localized)   ", for: .normal)

        presenter.onViewDidLoad()
    }

// MARK: - RecommendationsUsersListViewProtocol
    func update() {
        collectionView.reloadData()
    }

// MARK: - Actions
    @IBAction func onClosePressed() {
        handleBackButtonPress()
    }

    @IBAction func onInfoButtonPressed() {
        presenter.showInfo?()
    }

    @IBAction func onNotOnSitlyPressed() {
        presenter.showNotOnSitly?(false)
    }
}

extension RecommendationsUsersListViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return presenter.users.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        return collectionView.dequeueReusableCell(of: RecommendationUserCell.self, for: indexPath) { cell in
            cell.configure(user: presenter.users[indexPath.row])
        }
    }
}

extension RecommendationsUsersListViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        presenter.showNext?(presenter.users[indexPath.row])
    }
}
