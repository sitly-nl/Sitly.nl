import Foundation

class SearchPresenter: BasePresenter {
    weak var view: SearchView?
    weak var delegate: SearchResultsHandler?
    let userService: UserServiceable
    let favoriteService: FavoriteServiceable
    let searchService: SearchServiceable
    let configuration = ConfigService().fetch()
    private let configService: ConfigServiceable

    var showHiddenUsers: (() -> Void)?
    var showMap: (() -> Void)?
    var showFindJobExplanation: ((_ user: User) -> Void)?

    var total = 0
    var totalHidden = 0
    var searchForm: SearchForm

    private var pendingSearchForm: SearchForm?
    private var loadingUsers = false
    private var isLoadingNextPage = false

    init(
        view: SearchView,
        userService: UserServiceable,
        favoriteService: FavoriteServiceable,
        searchService: SearchServiceable,
        configService: ConfigServiceable
    ) {
        self.userService = userService
        self.favoriteService = favoriteService
        self.searchService = searchService
        self.configService = configService
        self.searchForm = searchService.getRestoredSearchForm()

        super.init(baseView: view)

        self.view = view
    }

    @objc func onUserUnhide() {
        view?.resetUsers()
        search(searchForm: searchForm)
    }

    @objc func onFavoriteChanged(notification: Notification) {
        if let user = notification.object as? User {
            view?.updateFavorite(user: user)
        }
    }

    func foundResults(users: [User], total: Int, totalHidden: Int) {
        view?.hideActivityIndicator()
        view?.showUsers(users: users)
        self.total = total
        self.totalHidden = totalHidden
        delegate?.found(total: total)
        isLoadingNextPage = false
    }

    func noData() {
        if isLoadingNextPage {
            isLoadingNextPage = false
            return
        }

        view?.hideActivityIndicator()
        view?.noData()
        total = 0
        delegate?.found(total: 0)
    }
}

// MARK: - FilterUpdateDelegate
extension SearchPresenter: FilterUpdateDelegate {
    func search(searchForm: SearchForm) {
        search(searchForm: searchForm, resetUsers: true)
    }

    func search(searchForm: SearchForm, resetUsers: Bool) {
        searchForm.searchType = .photo

        if loadingUsers {
            pendingSearchForm = searchForm
            return
        }
        loadingUsers = true

        if resetUsers {
            view?.resetUsers()
        }
        view?.configure(searchForm: searchForm)

        self.view?.updateActiveFilters(self.searchService.numberOfActiveFilters(searchForm: searchForm))
        self.searchService.search(searchForm: searchForm) {
            switch $0 {
            case .success(let result):
                if case .users(let users) = result.entities, users.any {
                    self.foundResults(users: users, total: result.total, totalHidden: result.totalHidden)
                } else {
                    self.noData()
                }
            case .failure:
                self.view?.hideActivityIndicator()
                self.view?.showErrorView()
            }

            self.loadingUsers = false
            if let searchForm = self.pendingSearchForm {
                self.pendingSearchForm = nil
                self.search(searchForm: searchForm)
            }
        }
    }

    func resetSearchForm() {
        searchForm = searchService.resetSearchForm(searchForm: searchForm)
        delegate?.didResetSearchForm(form: searchForm)
        search(searchForm: searchForm)
    }
}

// MARK: - SearchPresenterProtocol
extension SearchPresenter: SearchPresenterProtocol {
    func viewDidLoad() {
        NotificationCenter.default.addObserver(self, selector: #selector(onFavoriteChanged(notification:)), name: .toggledFavorite, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(onUserUnhide), name: .unhideUser, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(searchWithRestoredFiters), name: .needsUpdateSearch, object: nil)
    }

    var forceHidePremium: Bool {
        configService.forceHidePremium
    }

    @objc func searchWithRestoredFiters() {
        view?.showActivityIndicator()
        searchForm = searchService.getRestoredSearchForm()
        view?.configure(searchForm: searchForm)
        search(searchForm: searchForm)
    }

    func toggleFavorite(user: User) {
        favoriteService.toggleFavorite(user: user) { response in
            if case .success = response {
                self.view?.updateFavorite(user: user)
            }
        }
    }

    func hideUser(_ user: User) {
        totalHidden += 1
        total -= 1
        userService.hideUser(user)
    }

    func removeHidden(_ user: User) {
        totalHidden -= 1
        total += 1
        userService.removeHidden(user: user)
    }

    func next() {
        let totalPages = Int(ceil(Double(total) / Double(searchForm.limit)))

        if searchForm.page < totalPages && !isLoadingNextPage {
            isLoadingNextPage = true
            searchForm.page += 1
            search(searchForm: searchForm, resetUsers: false)
        }
    }

    func mostRecent() {
        searchForm.sort = .created
        search(searchForm: searchForm)
    }
}
