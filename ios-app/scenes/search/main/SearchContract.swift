import Foundation

protocol SearchPresenterProtocol: BasePresenterProtocol, FilterUpdateDelegate {
    var configuration: Configuration? { get }
    var total: Int { get set }
    var totalHidden: Int { get set }
    var searchForm: SearchForm { get }
    var showHiddenUsers: (() -> Void)? { get set }
    var showMap: (() -> Void)? { get set }
    var showFindJobExplanation: ((_ user: User) -> Void)? { get set }
    func viewDidLoad()
    func searchWithRestoredFiters()
    func toggleFavorite(user: User)
    func hideUser(_ user: User)
    func removeHidden(_ user: User)
    func next()
    func mostRecent()
    var forceHidePremium: Bool { get }
}

protocol SearchView: BaseViewProtocol {
    func noData()
    func showErrorView()
    func showUsers(users: [User])
    func updateFavorite(user: User)
    func configure(searchForm: SearchForm)
    func resetUsers()
    func updateActiveFilters(_ count: Int)
}

protocol FilterUpdateDelegate: AnyObject {
    var delegate: SearchResultsHandler? { get set }
    func search(searchForm: SearchForm)
    func resetSearchForm()
}
