import UIKit

class AlertViewController: BaseViewController, UICollectionViewDataSource, UICollectionViewDelegate, UICollectionViewDelegateFlowLayout {
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var messageLabel: UILabel!
    @IBOutlet weak var actionsCollectionView: UICollectionView!
    @IBOutlet weak var dividerLine: UIView!
    @IBOutlet weak var collectionViewHeightConstraint: NSLayoutConstraint!

    var actions = [AlertAction]()

    override class var storyboard: UIStoryboard {
        return .main
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .clear
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let shouldUseFullWidth = shouldUseFullWidthForActions()
        dividerLine.isHidden = shouldUseFullWidth

        // We need to change the height of the view and the collectionview
        if shouldUseFullWidth {
            let itemHeight = self.collectionView(
                actionsCollectionView, layout: actionsCollectionView.collectionViewLayout, sizeForItemAt: IndexPath(item: 0, section: 0)
            ).height
            collectionViewHeightConstraint.constant = CGFloat(actions.count) * itemHeight
        }

        self.view.layoutIfNeeded()
        actionsCollectionView.reloadData()
    }

    func shouldUseFullWidthForActions() -> Bool {
        return actions.count != 2
    }

    // MARK: - AlertView
    func setUpView(title: String, message: String, actions: [AlertAction]) {
        loadViewIfNeeded()

        self.titleLabel.text = title
        self.messageLabel.text = message
        self.actions = actions
        self.actionsCollectionView.reloadData()
    }

    // MARK: - UICollectionViewDataSource
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return actions.count
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: String(describing: AlertCollectionViewCell.self), for: indexPath)

        if let actionCell = cell as? AlertCollectionViewCell {
            actionCell.configure(action: actions[indexPath.item])
        }

        return cell
    }

    // MARK: - UICollectionViewDelegate
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let alertAction = actions[indexPath.item]
        dismiss(animated: true) {
            alertAction.action(alertAction)
        }
    }

    func collectionView(_ collectionView: UICollectionView, didHighlightItemAt indexPath: IndexPath) {
        if let cell = collectionView.cellForItem(at: indexPath) as? AlertCollectionViewCell {
            cell.setHighlighted(highlighted: true)
        }
    }

    func collectionView(_ collectionView: UICollectionView, didUnhighlightItemAt indexPath: IndexPath) {
        if let cell = collectionView.cellForItem(at: indexPath) as? AlertCollectionViewCell {
            cell.setHighlighted(highlighted: false)
        }
    }

    // MARK: - UICollectionViewDelegateFlowLayout
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        let height: CGFloat = 42

        if !shouldUseFullWidthForActions() {
            return CGSize(width: collectionView.frame.width / 2, height: height)
        }

        return CGSize(width: collectionView.frame.width, height: height)
    }
}
