import UIKit

class SearchViewController: BaseViewController, PushNotificationManagerInjected {
    var presenter: SearchPresenterProtocol!
    var showMostRecent = false

    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var toolbarBackgroundView: UIView!
    @IBOutlet weak var mapButton: UIButton!
    @IBOutlet weak var toolbarSeparator: UIView!
    @IBOutlet weak var filtersButton: UIButton!
    @IBOutlet weak var activeFiltersView: CircularView!
    @IBOutlet weak var peopleCollectionView: UICollectionView!
    @IBOutlet weak var jobPostingButton: JobPostingButton!
    @IBOutlet weak var jobPostingCenterXConstraint: NSLayoutConstraint!

    private var jobNotifyingOverlayController: JobNotifyingOverlayController?
    private var preHiddenUsers = [User]()
    private var users = [User]()

    @IBOutlet weak var alertView: UIView!
    @IBOutlet weak var alertTitle: UILabel!
    @IBOutlet weak var alertTextView: TextView!
    private let changeFiltersURL = "change-filters"
    private let clearFiltersURL = "clear-filters"

    private var cardHeight: CGFloat = 208.0

    override class var storyboard: UIStoryboard {
        return .search
    }

    required init?(coder aDecoder: NSCoder) {
        super.init(coder: aDecoder)
        tabBarItem.title = "search".localized
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        presenter.viewDidLoad()

        tabBarItem.image = #imageLiteral(resourceName: "search_menu").withRenderingMode(.alwaysOriginal)
        tabBarItem.selectedImage = #imageLiteral(resourceName: "search_menu_selected").withRenderingMode(.alwaysOriginal)

        titleLabel.font = .openSans(size: 17)
        titleLabel.text = "search".localized

        toolbarBackgroundView.layer.shadowRadius = 4.5
        toolbarBackgroundView.layer.shadowOpacity = 0.15
        toolbarBackgroundView.layer.shadowOffset = .zero
        mapButton.setTitle("map".localized, for: .normal)
        if !(presenter.configuration?.showMap ?? true) {
            mapButton.isHidden = true
            toolbarSeparator.isHidden = true
        }
        filtersButton.setTitle(" " + "filters".localized, for: .normal)

        peopleCollectionView.registerNib(ofType: UserCollectionViewCell.self)
        peopleCollectionView.contentInset.top = 65
        activeFiltersView.titleLabel?.text = ""

        hideAlertView(duration: 0)
        updateJobPostingButton()

        presenter.appendNotificationToken(
            NotificationCenter.default.addObserver(forName: .jobPostingStateChanged, object: nil, queue: nil) { [weak self] in
                if let jobPosting = $0.object as? JobPosting {
                    if let jobNotifyingOverlayController = self?.jobNotifyingOverlayController {
                        jobNotifyingOverlayController.jobPosting = jobPosting
                    } else {
                        self?.showJobNotifyingOverlay(jobPosting: jobPosting)
                    }
                } else {
                    if self?.jobNotifyingOverlayController != nil {
                        // only reload after acturally hide job posting overlay
                        UserService().reloadMe { _ in
                            self?.updateJobPostingButton()
                        }
                    }

                    self?.jobNotifyingOverlayController?.close()
                    self?.jobNotifyingOverlayController = nil
                }
            }
        )
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)

        if showMostRecent {
            showMostRecent = false
            presenter.mostRecent()
        } else if !users.any {
            presenter.searchWithRestoredFiters()
        } else {
            peopleCollectionView.reloadData()
        }

        updateJobPostingButton()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)

        preHiddenUsers.forEach { [weak self] user in
            self?.removeCellIfHiddenFor(user: user)
        }
    }

    override func needsToShowActivityIndicator() -> Bool {
        return !users.any
    }

    func showJobNotifyingOverlay(jobPosting: JobPosting) {
        if jobNotifyingOverlayController != nil {
            jobNotifyingOverlayController?.close()
            jobNotifyingOverlayController = nil
        }
        jobNotifyingOverlayController = Router.notifyingOverlay(jobPosting: jobPosting)
        jobNotifyingOverlayController?.showFrom(viewController: self)
    }

    func updateJobPostingButton() {
        if !jobPostingEnabled {
            return
        }

        if presenter.currentUser?.isParent ?? true {
            if presenter.currentUser?.jobPostingDisabledTill != nil {
                jobPostingButton.update(type: .disabled)
                jobPostingCenterXConstraint.constant = 0.5*UIScreen.main.bounds.width - 34
            } else {
                jobPostingButton.update(type: UserDefaults.interactedWithJobPostingButton ? .withCloseButton : .original)
                jobPostingCenterXConstraint.constant = 0
            }
            jobPostingButton.mainButtonPressed = { [weak self] in
                if !UserDefaults.interactedWithJobPostingButton {
                    UIView.animate(withDuration: UIView.defaultAnimationDuration) {
                        self?.jobPostingButton.update(type: .withCloseButton)
                    }
                    UserDefaults.interactedWithJobPostingButton = true
                }
                self?.presenter.currentUser.flatMap { self?.presenter.showFindJobExplanation?($0) }
            }
            jobPostingButton.closeButtonPressed = { [weak self] in
                if self?.jobPostingButton.type != .disabled {
                    UIView.animate(withDuration: UIView.defaultAnimationDuration) {
                        self?.jobPostingCenterXConstraint.constant = 0.5*UIScreen.main.bounds.width - 34
                        self?.jobPostingButton.update(type: .collapsed)
                    }
                }
            }
        } else {
            jobPostingButton.isHidden = true
        }
    }

// MARK: - Actions
    @IBAction func showMap(_ sender: Any) {
        presenter.showMap?()
    }

    @IBAction func showFilters(_ sender: Any) {
        if presentedViewController == nil {
            FiltersWireframe().presentFrom(viewController: self, searchForm: presenter.searchForm, delegate: presenter, total: presenter.total)
        }
    }
}

// MARK: - SearchView
extension SearchViewController: SearchView {
    func showUsers(users: [User]) {
        cardHeight = UserCardView.viewHeight(isParent: users.first?.isParent ?? false)
        hideAlertView()

        if !self.users.any {
            peopleCollectionView.alpha = 0
        }

        users.forEach { newUser in
            if !self.users.contains(where: { $0.id.equalsIgnoreCase(newUser.id) }) {
                self.users.append(newUser)
            }
        }

        hideActivityIndicator()
        peopleCollectionView.reloadData()

        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.peopleCollectionView.alpha = 1
        }
    }

    func updateFavorite(user: User) {
        if let index = users.firstIndex(where: { $0.id == user.id }),
           let cell = peopleCollectionView.cellForItem(at: IndexPath(item: index, section: 1)) as? UserCollectionViewCell {
            let isFavorite = user.isFavorite
            users[index].isFavorite = isFavorite
            cell.userCardViewModel?.isFavorite = isFavorite
        }
    }

    func configure(searchForm: SearchForm) {
        navigationItem.title = searchForm.role.title
    }

    func noData() {
        resetUsers()

        showAlertView(type: .noData)
    }

    func resetUsers() {
        users = [User]()
        peopleCollectionView.reloadData()
    }

    func updateActiveFilters(_ count: Int) {
        activeFiltersView.titleLabel?.text = "\(count)"
    }

    func showErrorView() {
        resetUsers()

        if tabBarController?.selectedViewController is SearchViewController {
            showAlertFor(errorType: .serverError)
        }
    }
}

// MARK: - AlertView
extension SearchViewController {
    enum AlertType: String {
        case noData
    }

    func showAlertView(type: AlertType) {
        alertView.isHidden = false

        configureAlertView(type: type)

        UIView.animate(withDuration: 0.3) { [weak self] in
            self?.alertView.alpha = 1
        }
    }

    func hideAlertView(duration: TimeInterval = 0.3) {
        UIView.animate(withDuration: duration) { [weak self] in
            self?.alertView.alpha = 0
            self?.alertView.isHidden = true
        }
    }

    func configureAlertView(type: AlertType) {
        let style = NSMutableParagraphStyle()
        style.alignment = .center

        let attributedText = NSMutableAttributedString(
            string: "somethingWentWrong".localized,
            attributes: [.font: UIFont.openSansLight(size: 14),
                         .foregroundColor: UIColor.defaultText,
                         .paragraphStyle: style])
        var title = ""

        switch type {
        case .noData:
            title = "noResults"
            let changeFilters = "changeYourFilters".localized
            let clearAllFilters = "clearAllFilters".localized

            attributedText.mutableString.setString(
                String(format: "noResultsWithFilters".localized, changeFilters, clearAllFilters, navigationItem.title?.lowercased() ?? "" )
            )

            attributedText.setUpLink(text: changeFilters, URL: changeFiltersURL, underlineColor: .defaultText)
            attributedText.setUpLink(text: clearAllFilters, URL: clearFiltersURL, underlineColor: .defaultText)
        }

        alertTitle.text = title.localized
        alertTextView.attributedText = attributedText
    }
}

// MARK: - UICollectionViewDataSource
extension SearchViewController: UICollectionViewDataSource {
    func numberOfSections(in collectionView: UICollectionView) -> Int {
        return 2
    }

    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        switch section {
        case 0:
            return users.count == 0 ? 0 : 1
        case 1:
            return users.count
        default:
            return 0
        }
    }

    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        if indexPath.section == 0 {
            let cell = collectionView.dequeueReusableCell(ofType: SearchResultsCollectionViewCell.self, for: indexPath)
            cell.configure(results: presenter.total, hidden: presenter.totalHidden, role: presenter.searchForm.role, delegate: self)
            return cell
        } else {
            let user = users[indexPath.row]
            if preHiddenUsers.contains(where: { $0.id == user.id }) {
                let cell = collectionView.dequeueReusableCell(ofType: UndoHideUserCollectionViewCell.self, for: indexPath)
                cell.configure(delegate: self, user: user)

                // Set the item on the cell so we cancel it when it's undone
                let item = DispatchWorkItem { [weak self] in
                    self?.removeCellIfHiddenFor(user: user)
                }
                cell.item = item
                DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: item)

                return cell
            }

            let cell = collectionView.dequeueReusableCell(ofType: UserCollectionViewCell.self, for: indexPath)
            cell.configure(
                delegate: self,
                user: user,
                forceHidePremium: presenter?.forceHidePremium ?? false,
                hasSwipeAction: true
            )
            return cell
        }
    }

    func collectionView(_ collectionView: UICollectionView, didEndDisplaying cell: UICollectionViewCell, forItemAt indexPath: IndexPath) {
        if let user = users[safe: indexPath.row], cell is UndoHideUserCollectionViewCell {
            removeCellIfHiddenFor(user: user)
        }
    }

    private func removeCellIfHiddenFor(user: User) {
        if let index = users.firstIndex(of: user), let hiddenIndex = preHiddenUsers.firstIndex(where: { $0.id == user.id }) {
            preHiddenUsers.remove(at: hiddenIndex)
            users.remove(at: index)
            peopleCollectionView.deleteItems(at: [IndexPath(row: index, section: 1)])
        }
    }
}

// MARK: - UICollectionViewDelegateFlowLayout
extension SearchViewController: UICollectionViewDelegateFlowLayout {
    func collectionView(
        _ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath
    ) -> CGSize {
        if indexPath.section == 0 {
            var height = CGFloat(30)
            if presenter.totalHidden > 0 {
                height += 30
            }
            return CGSize(width: collectionView.frame.width, height: height)
        }
        let user = users[indexPath.row]
        if preHiddenUsers.contains(where: { $0.id == user.id }) {
            return CGSize(width: collectionView.frame.width, height: 30)
        } else {
            return CGSize(width: collectionView.frame.width, height: cardHeight)
        }
    }
}

// MARK: - UserCollectionViewCellDelegate
extension SearchViewController: UserCollectionViewCellDelegate {
    func hideUser(cell: UserCollectionViewCell) {
        if let indexPath = peopleCollectionView.indexPath(for: cell) {
            let user = users[indexPath.row]
            preHiddenUsers.append(user)
            presenter.hideUser(user)
            peopleCollectionView.reloadItems(at: [IndexPath(item: 0, section: 0), indexPath])

            AnalyticsManager.logEvent(.searchHideProfile)
        }
    }

    func toggleFavorite(user: User) {
        presenter.toggleFavorite(user: user)
        AnalyticsManager.logEvent(.searchAddToFavorites)
    }

    func presentingSwipeAction(userId: String) {
        for cell in peopleCollectionView.visibleCells {
            if let userCell = cell as? UserCollectionViewCell, userId != userCell.user?.id {
                userCell.userCardViewModel?.swipeActionState = .hidden
            }
        }
    }

    func showUser(cell: UserCollectionViewCell) {
        if let indexPath = peopleCollectionView.indexPath(for: cell), indexPath.section == 1 {
            let user = users[indexPath.row]
            if !preHiddenUsers.contains(where: { $0.id == user.id }) {
                navigationController?.pushViewController(Router.publicProfile(user: user), animated: true)
                AnalyticsManager.logEvent(.searchSelectProfile)
            }
        }
    }
}

// MARK: - UndoHideUserCollectionViewCellDelegate
extension SearchViewController: UndoHideUserCollectionViewCellDelegate {
    func undoHideUser(cell: UndoHideUserCollectionViewCell) {
        if let indexPath = peopleCollectionView.indexPath(for: cell), let index = preHiddenUsers.firstIndex(where: { users[indexPath.row].id == $0.id  }) {
            preHiddenUsers.remove(at: index)
            presenter.removeHidden(users[indexPath.row])
            cell.item?.cancel()

            let size = self.collectionView(peopleCollectionView, layout: peopleCollectionView.collectionViewLayout, sizeForItemAt: indexPath)
            var frame = cell.frame
            frame.size.height = size.height
            cell.frame = frame

            UIView.animate(withDuration: 0.3, animations: { [weak self] in
                cell.layoutIfNeeded()
                self?.peopleCollectionView.collectionViewLayout.invalidateLayout()
            }, completion: { [weak self] _ in
                self?.peopleCollectionView.reloadItems(at: [IndexPath(item: 0, section: 0), indexPath])
            })
        }
    }
}

// MARK: - UIScrollViewDelegate
extension SearchViewController: UIScrollViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        if (
            scrollView.isTracking || scrollView.isDragging || scrollView.isDecelerating) &&
            scrollView.contentOffset.y >= ((scrollView.contentSize.height - scrollView.frame.height) * 0.8
        ) {
            presenter.next()
        }
    }
}

// MARK: - UITextViewDelegate
extension SearchViewController: UITextViewDelegate {
    func textView(_ textView: UITextView, shouldInteractWith URL: URL, in characterRange: NSRange) -> Bool {
        if URL.absoluteString.contains(changeFiltersURL) {
            showFilters(textView)
        } else if URL.absoluteString.contains(clearFiltersURL) {
            presenter.resetSearchForm()
            hideAlertView()
            showActivityIndicator()
        }

        return false
    }
}

// MARK: - SearchResultsCollectionViewCellDelegate
extension SearchViewController: SearchResultsCollectionViewCellDelegate {
    func showHidden() {
        presenter.showHiddenUsers?()
    }
}
